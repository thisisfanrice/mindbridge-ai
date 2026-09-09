const AI_MODE = process.env.AI_MODE || "demo";

// 統一提問結尾。空字串保留空白，避免替已結束的對話產生問題。
function normalizeQuestion(value) {
  if (typeof value !== "string") return "";

  const question = value.trim().replace(/[？?]+\s*$/u, "").trim();
  return question ? `${question}？` : "";
}

function getDemoStage1() {
  return {
    safety_escalation: false,
    summary_state: "已收到今天的 Check-in。",
    message:
      "我有收到你今天的紀錄，我們可以先從你最在意的部分開始整理。",
    question: normalizeQuestion(
      "現在最讓你掛心的，是哪一件事情？"
    ),
    conversation_end: false,
    xai_reason:
      "Demo 規則式回覆：目前僅提供固定的紀錄整理引導，未進行 AI 語意分析或安全風險判斷。",
    demo_mode: true,
  };
}

function getDemoStage2(payload) {
  return {
    safety_escalation: false,
    message:
      "我有收到你的回答，我們可以再把這個想法拆開看看。",
    question: normalizeQuestion(
      "你覺得這個想法裡，還有沒有其他可能的解釋？"
    ),
    conversation_end: false,
    xai_reason:
      "Demo 規則式回覆：目前僅提供固定的反思引導，未進行 AI 語意分析或安全風險判斷。",
    conversation_id: payload.conversation_id ?? null,
    demo_mode: true,
  };
}

function getDemoTutor() {
  return {
    message:
      "我們先不要急著直接找答案，可以先把題目已知的條件整理出來。",
    question: normalizeQuestion(
      "你目前看得懂題目中的哪一部分？"
    ),
    conversation_end: false,
    demo_mode: true,
  };
}

async function callExternalAPI(apiUrl, payload, stageName) {
  const apiKey = process.env.AI_API_KEY;

  if (!apiUrl) {
    throw new Error(`Missing ${stageName} URL`);
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey
        ? { Authorization: `Bearer ${apiKey}` }
        : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`${stageName} API failed: ${response.status}`);
  }

  return response.json();
}

async function callStage1(payload) {
  if (AI_MODE === "demo") {
    return getDemoStage1();
  }

  const data = await callExternalAPI(
    process.env.AI_STAGE1_URL,
    payload,
    "Stage 1"
  );

  return {
    safety_escalation: data.safety_escalation === true,
    summary_state: typeof data.summary_state === "string" ? data.summary_state : "",
    message: typeof data.message === "string" ? data.message : "",
    question: data.conversation_end === true || data.safety_escalation === true
      ? ""
      : normalizeQuestion(data.question),
    conversation_end: data.conversation_end === true,
    xai_reason: typeof data.xai_reason === "string" ? data.xai_reason : "",
    demo_mode: false,
  };
}

async function callStage2(payload) {
  if (AI_MODE === "demo") {
    return getDemoStage2(payload);
  }

  const data = await callExternalAPI(
    process.env.AI_STAGE2_URL,
    payload,
    "Stage 2"
  );

  return {
    safety_escalation: data.safety_escalation === true,
    message: typeof data.message === "string" ? data.message : "",
    question: data.conversation_end === true || data.safety_escalation === true
      ? ""
      : normalizeQuestion(data.question),
    conversation_end: data.conversation_end === true,
    action_text:
      typeof data.action_text === "string" ? data.action_text.trim() : "",
    xai_reason: typeof data.xai_reason === "string" ? data.xai_reason : "",
    conversation_id: typeof data.conversation_id === "string" ? data.conversation_id : null,
    demo_mode: false,
  };
}

async function callTutor(payload) {
  if (AI_MODE === "demo") {
    return getDemoTutor();
  }

  const data = await callExternalAPI(
    process.env.AI_TUTOR_URL,
    payload,
    "Tutor"
  );

  return {
    message: typeof data.message === "string" ? data.message : "",
    question: data.conversation_end === true
      ? ""
      : normalizeQuestion(data.question),
    conversation_end: data.conversation_end === true,
    demo_mode: false,
  };
}

module.exports = {
  callStage1,
  callStage2,
  callTutor,
};