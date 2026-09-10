const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const source = fs.readFileSync(
  path.resolve(__dirname, "../src/routes/tutor.js"),
  "utf8"
);

function load(callTutor) {
  const routes = {};
  const router = {
    post(route, handler) {
      routes[`POST ${route}`] = handler;
      return router;
    },
  };
  const module = { exports: {} };

  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    require(name) {
      if (name === "express") return { Router: () => router };
      if (name === "../services/aiClient") return { callTutor };
      throw new Error(name);
    },
    console: { error() {} },
  });

  return routes["POST /"];
}

function res() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("start sends structured payload into callTutor", async () => {
  let payload = null;
  const handler = load(async (value) => {
    payload = value;
    return {
      message: "先整理已知條件。",
      question: "你看懂哪一部分？",
      conversation_end: false,
      demo_mode: true,
    };
  });

  const response = res();
  await handler({
    body: {
      message: "一次函數斜率看不懂",
      input_type: "text",
      stage: "start",
      subject: "數學",
      original_question: "一次函數斜率看不懂",
    },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.stage, "start");
  assert.equal(payload.subject, "數學");
  assert.equal(response.body.demo_mode, true);
  assert.equal(response.body.conversation_end, false);
});

test("demo followup converges without claiming correctness", async () => {
  const handler = load(async () => ({
    message: "placeholder",
    question: "placeholder?",
    conversation_end: false,
    demo_mode: true,
  }));

  const response = res();
  await handler({
    body: {
      message: "我覺得斜率是 y 的變化除以 x 的變化",
      input_type: "text",
      stage: "followup",
      subject: "數學",
      original_question: "一次函數斜率看不懂",
      tutor_question: "你看懂哪一部分？",
    },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.conversation_end, true);
  assert.equal(response.body.question, "");
  assert.equal(response.body.demo_mode, true);
  assert.doesNotMatch(response.body.message, /正確|錯誤|答對|答錯/);
});

test("invalid stage is rejected", async () => {
  const handler = load(async () => {
    throw new Error("should not run");
  });

  const response = res();
  await handler({
    body: {
      message: "test",
      input_type: "text",
      stage: "bad",
    },
  }, response);

  assert.equal(response.statusCode, 400);
});
