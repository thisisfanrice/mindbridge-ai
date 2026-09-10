const express = require("express");
const pool = require("../db");
const { callStage1 } = require("../services/aiClient");

const router = express.Router();

/**
 * 數字欄位正規化
 */
function normalizeNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : NaN;
}

/**
 * 文字欄位正規化
 */
function normalizeText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

/**
 * 驗證 Check-in 欄位
 */
function validateCheckin({
  moodScore,
  stressScore,
  sleepScore,
  energyScore,
  inputType,
}) {
  if (
    moodScore !== null &&
    (!Number.isInteger(moodScore) ||
      moodScore < 1 ||
      moodScore > 6)
  ) {
    return "moodScore must be between 1 and 6";
  }

  if (
    stressScore !== null &&
    (!Number.isInteger(stressScore) ||
      stressScore < 1 ||
      stressScore > 10)
  ) {
    return "stressScore must be between 1 and 10";
  }

  if (
    sleepScore !== null &&
    (!Number.isInteger(sleepScore) ||
      sleepScore < 1 ||
      sleepScore > 10)
  ) {
    return "sleepScore must be between 1 and 10";
  }

  if (
    energyScore !== null &&
    (!Number.isInteger(energyScore) ||
      energyScore < 1 ||
      energyScore > 5)
  ) {
    return "energyScore must be between 1 and 5";
  }

  if (!["text", "voice"].includes(inputType)) {
    return "inputType must be text or voice";
  }

  return null;
}

/**
 * 新增 / 更新今天的 Check-in
 */
router.post("/", async (req, res) => {
  try {
    const {
      userId,
      moodScore,
      stressScore,
      sleepScore,
      energyScore,
      note,
      inputType,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId",
      });
    }

    const normalizedMood = normalizeNumber(moodScore);
    const normalizedStress = normalizeNumber(stressScore);
    const normalizedSleep = normalizeNumber(sleepScore);
    const normalizedEnergy = normalizeNumber(energyScore);

    const normalizedNote = normalizeText(note);

    const normalizedInputType =
      inputType === "voice" ? "voice" : "text";

    const validationError = validateCheckin({
      moodScore: normalizedMood,
      stressScore: normalizedStress,
      sleepScore: normalizedSleep,
      energyScore: normalizedEnergy,
      inputType: normalizedInputType,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    /*
     * 至少要填一個實際內容。
     * inputType 本身不算 Check-in 內容。
     */
    const hasContent =
      normalizedMood !== null ||
      normalizedStress !== null ||
      normalizedSleep !== null ||
      normalizedEnergy !== null ||
      normalizedNote !== null;

    if (!hasContent) {
      return res.status(400).json({
        success: false,
        message: "Please complete at least one check-in item",
      });
    }

    const result = await pool.query(
      `
        INSERT INTO daily_checkins (
          user_id,
          mood_score,
          stress_score,
          sleep_score,
          energy_score,
          note,
          input_type,
          checkin_date
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          CURRENT_DATE
        )

        ON CONFLICT (user_id, checkin_date)
        DO UPDATE SET
          mood_score = EXCLUDED.mood_score,
          stress_score = EXCLUDED.stress_score,
          sleep_score = EXCLUDED.sleep_score,
          energy_score = EXCLUDED.energy_score,
          note = EXCLUDED.note,
          input_type = EXCLUDED.input_type,
          created_at = CURRENT_TIMESTAMP

        RETURNING
          checkin_id,
          user_id,
          mood_score,
          stress_score,
          sleep_score,
          energy_score,
          note,
          input_type,
          checkin_date,
          created_at
      `,
      [
        userId,
        normalizedMood,
        normalizedStress,
        normalizedSleep,
        normalizedEnergy,
        normalizedNote,
        normalizedInputType,
      ]
    );

    const checkin = result.rows[0];

    // 建立 conversation
    const conversationResult = await pool.query(
      `
  INSERT INTO conversations (
    user_id,
    checkin_id,
    conversation_end,
    safety_escalation
  )
  VALUES ($1, $2, false, false)
  RETURNING conversation_id
  `,
      [checkin.user_id, checkin.checkin_id]
    );

    const conversationId =
      conversationResult.rows[0].conversation_id;

    // 存第一輪 user message
    const initialUserContent =
      normalizedNote ||
      `Mood: ${normalizedMood ?? "N/A"}, Stress: ${normalizedStress ?? "N/A"
      }, Sleep: ${normalizedSleep ?? "N/A"}, Energy: ${normalizedEnergy ?? "N/A"
      }`;

    await pool.query(
      `
  INSERT INTO conversation_messages (
    conversation_id,
    role,
    content,
    input_type
  )
  VALUES ($1, 'user', $2, $3)
  `,
      [
        conversationId,
        initialUserContent,
        normalizedInputType,
      ]
    );

    const stage1Response = {
      safety_escalation: false,
      summary_state: "已收到今天的 Check-in。",
      message:
        "我有收到你今天的紀錄，我們可以先從你最在意的部分開始整理。",
      question:
        "現在最讓你掛心的，是哪一件事情？",
      conversation_end: false,
      xai_reason:
        "根據今天的 Check-in 數值與你提供的文字內容進行初步整理。",
    };

    // 存 assistant 第一輪
    await pool.query(
      `
  INSERT INTO conversation_messages (
    conversation_id,
    role,
    content,
    input_type
  )
  VALUES ($1, 'assistant', $2, NULL)
  `,
      [
        conversationId,
        [
          stage1Response.message,
          stage1Response.question,
        ]
          .filter(Boolean)
          .join("\n"),
      ]
    );

    // 最後才回 response
    return res.status(200).json({
      success: true,
      message: "Check-in saved successfully",
      data: checkin,

      safety_escalation:
        stage1Response.safety_escalation,

      summary_state:
        stage1Response.summary_state,

      ai_message:
        stage1Response.message,

      question:
        stage1Response.question,

      demo_mode: stage1Response.demo_mode === true,

      posture_state: "listening",

      conversation_end:
        stage1Response.conversation_end,

      xai_reason:
        stage1Response.xai_reason,

      conversation_id:
        conversationId,
    });
  } catch (error) {
    console.error("Create check-in error:", error && error.code ? error.code : "internal");

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to save check-in",
    });
  }
});

/**
 * 取得某位使用者的 Check-in 歷史
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `
        SELECT
          checkin_id,
          user_id,
          mood_score,
          stress_score,
          sleep_score,
          energy_score,
          note,
          input_type,
          checkin_date,
          created_at

        FROM daily_checkins

        WHERE user_id = $1

        ORDER BY
          checkin_date DESC,
          created_at DESC
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get check-ins error:", error && error.code ? error.code : "internal");

    return res.status(500).json({
      success: false,
      message: "Unable to load check-ins",
    });
  }
});

/**
 * 修改指定 Check-in
 */
router.put("/:checkinId", async (req, res) => {
  try {
    const { checkinId } = req.params;

    const {
      userId,
      moodScore,
      stressScore,
      sleepScore,
      energyScore,
      note,
      inputType,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId",
      });
    }

    const normalizedMood = normalizeNumber(moodScore);
    const normalizedStress = normalizeNumber(stressScore);
    const normalizedSleep = normalizeNumber(sleepScore);
    const normalizedEnergy = normalizeNumber(energyScore);

    const normalizedNote = normalizeText(note);

    const normalizedInputType =
      inputType === "voice" ? "voice" : "text";

    const validationError = validateCheckin({
      moodScore: normalizedMood,
      stressScore: normalizedStress,
      sleepScore: normalizedSleep,
      energyScore: normalizedEnergy,
      inputType: normalizedInputType,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const hasContent =
      normalizedMood !== null ||
      normalizedStress !== null ||
      normalizedSleep !== null ||
      normalizedEnergy !== null ||
      normalizedNote !== null;

    if (!hasContent) {
      return res.status(400).json({
        success: false,
        message: "Please complete at least one check-in item",
      });
    }

    const result = await pool.query(
      `
        UPDATE daily_checkins

        SET
          mood_score = $1,
          stress_score = $2,
          sleep_score = $3,
          energy_score = $4,
          note = $5,
          input_type = $6

        WHERE
          checkin_id = $7
          AND user_id = $8

        RETURNING
          checkin_id,
          user_id,
          mood_score,
          stress_score,
          sleep_score,
          energy_score,
          note,
          input_type,
          checkin_date,
          created_at
      `,
      [
        normalizedMood,
        normalizedStress,
        normalizedSleep,
        normalizedEnergy,
        normalizedNote,
        normalizedInputType,
        checkinId,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Check-in not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Check-in updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update check-in error:", error && error.code ? error.code : "internal");

    return res.status(500).json({
      success: false,
      message: "Unable to update check-in",
    });
  }
});

/**
 * 刪除指定 Check-in
 */
router.delete("/:checkinId", async (req, res) => {
  try {
    const { checkinId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId",
      });
    }

    const result = await pool.query(
      `
        DELETE FROM daily_checkins

        WHERE
          checkin_id = $1
          AND user_id = $2

        RETURNING checkin_id
      `,
      [checkinId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Check-in not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Check-in deleted successfully",
    });
  } catch (error) {
    console.error("Delete check-in error:", error && error.code ? error.code : "internal");

    return res.status(500).json({
      success: false,
      message: "Unable to delete check-in",
    });
  }
});

module.exports = router;