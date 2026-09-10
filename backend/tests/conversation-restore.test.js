const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const sourceRoot = path.resolve(__dirname, "../src");
const USER = "11111111-1111-4111-8111-111111111111";
const CONVERSATION = "22222222-2222-4222-8222-222222222222";

function loadConversation(pool) {
  const routes = {};
  const router = {
    get(route, handler) { routes[`GET ${route}`] = handler; return router; },
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

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("GET current restores only authenticated user's latest conversation", async () => {
  const observed = [];
  const pool = {
    async query(sql, args) {
      observed.push({ sql, args });
      if (sql.includes("FROM conversations")) {
        return {
          rowCount: 1,
          rows: [{
            conversation_id: CONVERSATION,
            checkin_id: "33333333-3333-4333-8333-333333333333",
            conversation_end: false,
            safety_escalation: false,
            created_at: "2026-09-10T10:00:00Z",
            updated_at: "2026-09-10T10:10:00Z",
          }],
        };
      }
      if (sql.includes("FROM conversation_messages")) {
        return {
          rowCount: 4,
          rows: [
            { role: "user", content: "checkin", input_type: "text", message_id: "1" },
            { role: "assistant", content: "收到\n第一題？", input_type: null, message_id: "2" },
            { role: "user", content: "回答", input_type: "text", message_id: "3" },
            { role: "assistant", content: "整理一下\n下一題？", input_type: null, message_id: "4" },
          ],
        };
      }
      throw new Error("Unexpected query");
    },
  };

  const routes = loadConversation(pool);
  const res = response();
  await routes["GET /current"]({ anonymousUserId: USER }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.conversation_id, CONVERSATION);
  assert.equal(res.body.data.message, "整理一下");
  assert.equal(res.body.data.question, "下一題？");
  assert.equal(res.body.data.conversation_turn, 1);

  const conversationQuery = observed[0];
  assert.match(conversationQuery.sql, /WHERE user_id = \$1/);
  assert.equal(String(conversationQuery.args[0]), USER);
});

test("GET current returns null when authenticated user has no conversation", async () => {
  const routes = loadConversation({
    async query(sql, args) {
      assert.match(sql, /WHERE user_id = \$1/);
      assert.equal(String(args[0]), USER);
      return { rowCount: 0, rows: [] };
    },
  });

  const res = response();
  await routes["GET /current"]({ anonymousUserId: USER }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data, null);
});
