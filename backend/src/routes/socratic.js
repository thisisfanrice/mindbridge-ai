const express = require("express");
const pool = require("../db");

const router = express.Router();

/*
 * 目前先建立穩定的 JSON / 對話狀態流。
 * 下一步再把真正的 AI Provider 接進 generateResponse()。
 */

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeNumber(value, fallback = null) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
}

function getCompanionStyle(profile) {
  const style = profile?.companion_style;

  if (
    ["warm", "rational", "positive"].includes(style)
  ) {
    return style;
  }

  return "warm";
}

function buildFirstResponse({
  journalText,
  stressScore,
  companionStyle,
  socraticMode,
}) {
  let empathyText =
    "我有看到你今天記下來的事情。";

  if (companionStyle === "warm") {
    empathyText =
      "聽起來這件事今天確實佔了你不少心力。";
  }

  if (companionStyle === "rational") {
    empathyText =
      "先把事情拆開看，可能會比較容易整理現在卡住的地方。";
  }

  if (companionStyle === "positive") {
    empathyText =
      "我們可以先找出現在最值得處理的一個重點，不需要一次解決全部。";
  }

  /*
   * 如果使用者選純情緒陪伴，
   * 仍可有簡短反思，但不進入偏課業家教式問答。
   */
  let question =
    "這件事情裡，現在最讓你放不下的是哪一部分？";

  if (socraticMode === "study") {
    question =
      "如果只先處理一個問題，你覺得現在最卡住的是哪一部分？";
  }

  if (stressScore !== null && stressScore >= 8) {
    question =
      "現在這些事情裡，哪一件最佔你的注意力？";
  }

  /*
   * journalText 目前會在真正 AI 串接時
   * 放進 prompt。現在先確認 API state flow。
   */
  void journalText;

  return {
    empathyText,
    socraticQuestion: question,
    actionText: null,
    shouldContinue: true,
    conversationTurn: 1,
  };
}

function buildReflectionResponse({
  userAnswer,
  companionStyle,
  socraticMode,
  conversationTurn,
}) {
  const turn = Math.max(
    2,
    normalizeNumber(conversationTurn, 2)
  );

  let reflectionText =
    "你剛剛的回答讓重點更清楚了一些。";

  if (companionStyle === "warm") {
    reflectionText =
      "謝謝你把這一點說出來，現在比較能看見真正讓你在意的是什麼。";
  }

  if (companionStyle === "rational") {
    reflectionText =
      "從你的回答看，現在可以把原本混在一起的事情再拆得更清楚。";
  }

  if (companionStyle === "positive") {
    reflectionText =
      "你已經找到一個比較具體的重點，接下來可以先從最小的一步開始。";
  }

  /*
   * 第二輪先給一個新的觀點 + 小行動。
   * 真正 AI 接入後，會根據回答內容動態生成。
   */
  let actionText =
    "花 3 分鐘寫下你現在最能控制的一件事。";

  if (socraticMode === "study") {
    actionText =
      "先挑一個最小的課業步驟，例如整理一題、看一頁或列出一個問題。";
  }

  /*
   * 為了避免無限追問，
   * MVP 第二輪直接允許收尾。
   */
  const shouldContinue = false;

  void userAnswer;

  return {
    reflectionText,
    socraticQuestion: null,
    actionText,
    shouldContinue,
    conversationTurn: turn,
  };
}

/*
 * POST /api/socratic
 *
 * phase:
 *   "initial"    第一輪
 *   "reflection" 使用者回答後第二輪
 */
router.post("/", async (req, res) => {
  try {
    const {
      userId,

      phase = "initial",

      journalText = "",
      userAnswer = "",

      moodScore = null,
      stressScore = null,
      sleepScore = null,
      energyScore = null,

      conversationTurn = 1,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId",
      });
    }

    if (
      phase !== "initial" &&
      phase !== "reflection"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid phase",
      });
    }

    /*
     * 讀取使用者 Onboarding 設定
     */
    const profileResult = await pool.query(
      `
        SELECT
          user_identity,
          age_range,
          stress_sources,
          sleep_schedule,
          baseline_sleep,
          companion_style,
          current_energy_level,
          socratic_mode,
          terms_accepted,
          allow_profile_personalization,
          allow_history_analysis
        FROM user_profiles
        WHERE user_id = $1
      `,
      [userId]
    );

    const profile =
      profileResult.rows.length > 0
        ? profileResult.rows[0]
        : null;

    const companionStyle =
      getCompanionStyle(profile);

    const socraticMode =
      profile?.socratic_mode === "study"
        ? "study"
        : "emotional";

    /*
     * 之後真正串 AI 時會把這個 context
     * 丟進 System Prompt / user message。
     */
    const context = {
      profile: {
        userIdentity:
          profile?.user_identity || null,

        ageRange:
          profile?.age_range || null,

        stressSources:
          Array.isArray(
            profile?.stress_sources
          )
            ? profile.stress_sources
            : [],

        companionStyle,
        socraticMode,
      },

      checkin: {
        moodScore:
          normalizeNumber(moodScore),

        stressScore:
          normalizeNumber(stressScore),

        sleepScore:
          normalizeNumber(sleepScore),

        energyScore:
          normalizeNumber(energyScore),

        journalText:
          normalizeText(journalText),
      },
    };

    /*
     * 第一輪
     */
    if (phase === "initial") {
      const normalizedJournal =
        normalizeText(journalText);

      if (!normalizedJournal) {
        return res.status(400).json({
          success: false,
          message:
            "journalText is required for initial phase",
        });
      }

      const result =
        buildFirstResponse({
          journalText:
            normalizedJournal,

          stressScore:
            context.checkin
              .stressScore,

          companionStyle,
          socraticMode,
        });

      return res.status(200).json({
        success: true,

        phase: "question",

        empathyText:
          result.empathyText,

        socraticQuestion:
          result.socraticQuestion,

        actionText:
          result.actionText,

        shouldContinue:
          result.shouldContinue,

        conversationTurn:
          result.conversationTurn,

        /*
         * 目前 false。
         * 不拿一般分數直接做危機預測。
         */
        showSupportResources: false,
      });
    }

    /*
     * 第二輪
     */
    const normalizedAnswer =
      normalizeText(userAnswer);

    if (!normalizedAnswer) {
      return res.status(400).json({
        success: false,
        message:
          "userAnswer is required for reflection phase",
      });
    }

    const result =
      buildReflectionResponse({
        userAnswer:
          normalizedAnswer,

        companionStyle,
        socraticMode,

        conversationTurn:
          normalizeNumber(
            conversationTurn,
            2
          ),
      });

    return res.status(200).json({
      success: true,

      phase: "complete",

      reflectionText:
        result.reflectionText,

      socraticQuestion:
        result.socraticQuestion,

      actionText:
        result.actionText,

      shouldContinue:
        result.shouldContinue,

      conversationTurn:
        result.conversationTurn,

      showSupportResources: false,
    });
  } catch (error) {
    console.error(
      "Socratic API error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to generate Socratic response",
    });
  }
});

module.exports = router;