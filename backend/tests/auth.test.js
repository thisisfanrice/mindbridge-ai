const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const sourceRoot = path.resolve(__dirname, "../src");
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const CHECKIN = "33333333-3333-4333-8333-333333333333";
const CONVERSATION = "44444444-4444-4444-8444-444444444444";

function load(file, dependencies) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(sourceRoot, file), "utf8"), {
    module, exports: module.exports,
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected require: ${name}`);
      return dependencies[name];
    },
    console: { error() {}, log() {} },
    process: { env: { AI_MODE: "demo", NODE_ENV: "development" } },
    URL, Buffer, setTimeout, clearTimeout,
  }, { filename: file });
  return module.exports;
}

function response() {
  return {
    statusCode: 200, body: null, headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    set(name, value) { this.headers[name] = value; return this; },
  };
}

function routerFactory() {
  const routes = {};
  const router = {};
  for (const method of ["get", "post", "put", "delete", "use"]) {
    router[method] = (route, ...handlers) => {
      if (typeof route === "function") handlers.unshift(route);
      else routes[`${method.toUpperCase()} ${route}`] = handlers;
      return router;
    };
  }
  return { router, routes };
}

function request({ path = "/profile/" + A, method = "GET", userId = A,
  body = {}, origin = "http://127.0.0.1:3001", json = true } = {}) {
  return {
    path, method, body, anonymousUserId: userId, sessionUserId: userId,
    get(name) { return name === "origin" ? origin : null; },
    is(type) { return json && type === "application/json"; },
  };
}

test("API allowlist rejects legacy routes, missing sessions and cross-account reads/writes", async () => {
  const queries = [];
  const guard = load("middleware/authorizeApi.js", {
    "../db": { query: async (sql, args) => {
      queries.push({ sql, args });
      return { rowCount: args[1] === A ? 1 : 0 };
    } },
    "../routes/session": {
      requireSession(req, res, next) {
        if (!req.sessionUserId) return res.status(401).json({ success: false });
        req.anonymousUserId = req.sessionUserId;
        next();
      },
      requireAllowedOrigin(req, res, next) {
        if (req.get("origin") !== "http://127.0.0.1:3001") {
          return res.status(403).json({ success: false });
        }
        next();
      },
    },
  });
  async function run(options) {
    const req = request(options), res = response();
    let nextCalls = 0;
    await guard(req, res, () => { nextCalls++; });
    return { req, res, nextCalls };
  }
  let result = await run({ userId: null });
  assert.equal(result.res.statusCode, 401);
  result = await run({ path: "/profile/" + B });
  assert.equal(result.res.statusCode, 403);
  result = await run({ path: "/profile/" + B, method: "PUT", body: { userId: B } });
  assert.equal(result.res.statusCode, 403);
  result = await run({ path: "/profile/" + A, method: "PUT", origin: "https://evil.example" });
  assert.equal(result.res.statusCode, 403);
  result = await run({ path: "/profile/" + A, method: "PUT", json: false });
  assert.equal(result.res.statusCode, 415);
  result = await run({ path: "/profile/" + A, method: "PUT", body: { userId: B } });
  assert.equal(result.res.statusCode, 403);
  for (const path of ["/users", "/users/me", "/socratic", "/secure-profile/" + A]) {
    result = await run({ path, method: "POST" });
    assert.equal(result.res.statusCode, 404, path);
  }
  result = await run({ path: "/profile/" + A });
  assert.equal(result.nextCalls, 1);
  result = await run({ path: "/checkin/" + CHECKIN, method: "DELETE", body: { userId: A } });
  assert.equal(result.nextCalls, 1);
  assert.equal(result.req.body.userId, A);
  assert.equal(queries[0].args[1], A);
  result = await run({ path: "/conversation", method: "POST", body: { userId: B } });
  assert.equal(result.res.statusCode, 403);
});

test("Analysis refuses history access without opt-in and ignores client-generated statistics", async () => {
  const { router, routes } = routerFactory();
  const queries = [];
  let enabled = false;
  const pool = { query: async (sql, args) => {
    queries.push({ sql, args });
    if (sql.includes("FROM user_profiles")) return { rows: [{
      allow_history_analysis: enabled,
      allow_profile_personalization: false,
    }] };
    if (sql.includes("FROM daily_checkins")) return { rows: [{
      mood_score: 4, stress_score: 5, sleep_score: 6,
      note: "", checkin_date: "2026-09-09",
    }] };
    throw new Error("Unexpected query");
  } };
  load("routes/analysis.js", {
    express: { Router: () => router }, "../db": pool,
  });
  const handler = routes["POST /"][0];
  const req = request({ path: "/analysis", method: "POST", body: {
    userId: A, completedDays: 999, averageMood: 1, averageStress: 10,
    averageSleep: 1, recentRecords: [{ note: "forged", stress_score: 10 }],
  } });
  let res = response();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.analysisEnabled, false);
  assert.equal(res.body.attributionText, null);
  assert.equal(queries.length, 1, "No history query allowed when disabled");
  enabled = true;
  res = response();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.analysisEnabled, true);
  assert.match(res.body.summaryState, /最近 1 筆紀錄/);
  assert.match(res.body.summaryState, /平均壓力 5\/10/);
  assert.ok(queries.every(q => q.args[0] === A));
  assert.ok(!res.body.summaryState.includes("999"));
});

test("Conversation locks only a conversation owned by the Session", async () => {
  const { router, routes } = routerFactory();
  const queries = [];
  const client = {
    async query(sql, args) {
      queries.push({ sql, args });
      if (sql.includes("FROM conversations")) return { rowCount: 0, rows: [] };
      return { rowCount: 0, rows: [] };
    },
    release() {},
  };
  load("routes/conversation.js", {
    express: { Router: () => router },
    "../db": { connect: async () => client },
    "../services/aiClient": { callStage2: async () => { throw Error("Must not call AI"); } },
  });
  const handler = routes["POST /"][0];
  const res = response();
  await handler(request({ method: "POST", path: "/conversation", body: {
    conversation_id: CONVERSATION, user_message: "test",
  } }), res);
  assert.equal(res.statusCode, 404);
  const lookup = queries.find(q => q.sql.includes("FROM conversations"));
  assert.match(lookup.sql, /conversation_id = \$1 AND user_id = \$2/);
  assert.equal(lookup.args[1], A);
  assert.ok(!queries.some(q => /^\s*INSERT/i.test(q.sql)));
  assert.ok(queries.some(q => q.sql === "ROLLBACK"));
});
