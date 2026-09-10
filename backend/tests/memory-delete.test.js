const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const sourceRoot = path.resolve(__dirname, "../src");
const USER = "11111111-1111-4111-8111-111111111111";

function loadConversation(pool) {
  const routes = {};
  const router = {
    post(route, handler) { routes[`POST ${route}`] = handler; return router; },
    delete(route, handler) { routes[`DELETE ${route}`] = handler; return router; },
  };
  const module = { exports: {} };

  vm.runInNewContext(
    fs.readFileSync(path.join(sourceRoot, "routes/conversation.js"), "utf8"),
    {
      module,
      exports: module.exports,
      require(name) {
        if (name === "express") return { Router: () => router };
        if (name === "../db") return pool;
        if (name === "../services/aiClient") {
          return { callStage2: async () => ({}) };
        }
        throw new Error(name);
      },
      console: { error() {} },
      process: { env: { AI_MODE: "demo" } },
    }
  );

  return routes;
}

function res() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("delete history scopes deletion to authenticated user", async () => {
  let observed = null;

  const routes = loadConversation({
    async query(sql, args) {
      observed = { sql, args };
      return { rowCount: 3, rows: [{}, {}, {}] };
    },
  });

  const response = res();
  await routes["DELETE /history"](
    { anonymousUserId: USER },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.deleted_conversations, 3);
  assert.match(observed.sql, /DELETE FROM conversations/);
  assert.match(observed.sql, /WHERE user_id = \$1/);
  assert.equal(observed.args.length, 1);
  assert.equal(String(observed.args[0]), USER);
  assert.doesNotMatch(observed.sql, /daily_checkins|user_profiles|DELETE FROM users/);
});
