
const express = require("express");
const pool = require("../db");

const router = express.Router();

const USER_IDENTITIES = [
  "working", "freelance", "unemployed",
  "homemaker", "senior", "student",
];

const AGE_RANGES = [
  "under_15", "15_18", "19_22", "23_30", "over_30",
];

const STRESS_SOURCES = [
  "career", "finance", "future",
  "relationships_family", "health", "study",
];

const STRESS_SOURCE_ALIASES = {
  career: "career",
  finance: "finance",
  future: "future",
  relationships_family: "relationships_family",
  health: "health",
  study: "study",
  work: "career",
  relation: "relationships_family",
  family: "relationships_family",
  other: "future",
  工作: "career",
  職涯: "career",
  經濟: "finance",
  未來規劃: "future",
  人際: "relationships_family",
  家庭: "relationships_family",
  健康: "health",
  課業: "study",
};

const SLEEP_SCHEDULES = ["early", "night", "irregular"];
const BASELINE_SLEEP = ["under_5", "5_7", "7_9", "over_9"];
const COMPANION_STYLES = ["warm", "rational", "positive"];
const ENERGY_LEVELS = ["full", "maintaining", "drained"];
const SOCRATIC_MODES = ["study", "emotional"];

const AVATAR_IDS = [
  "animal-cat", "animal-dog", "animal-rabbit", "animal-bear",
  "animal-fox", "animal-panda", "animal-frog", "animal-owl",
];
const DEFAULT_NICKNAME = "匿名旅人";

function validateNickname(value) {
  return (
    typeof value === "string" &&
    Array.from(value.trim()).length >= 1 &&
    Array.from(value.trim()).length <= 20 &&
    !/[\u0000-\u001f\u007f]/u.test(value)
  );
}


const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key);

function normalizeString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => item.trim());
}

function validateChoice(value, allowedValues) {
  return value === null || allowedValues.includes(value);
}

function validateBoolean(body, key) {
  return !hasOwn(body, key) || typeof body[key] === "boolean";
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!UUID_REGEX.test(userId)) {
      return badRequest(res, "Invalid userId");
    }

    const result = await pool.query(
      `SELECT
        profile_id, user_id, nickname, avatar_id, life_status,
        user_identity, age_range, stress_sources,
        sleep_schedule, baseline_sleep, companion_style,
        current_energy_level, socratic_mode,
        coping_methods, preferred_elements, user_target,
        terms_accepted,
        privacy_agreed,
        has_completed_onboarding,
        allow_profile_personalization,
        allow_history_analysis,
        created_at,
        updated_at
       FROM user_profiles
       WHERE user_id = $1`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows[0] || null,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load profile",
    });
  }
});


router.put("/:userId", async (req, res) => {
  const { userId } = req.params;
  const body = req.body;

  if (!UUID_REGEX.test(userId)) {
    return badRequest(res, "Invalid userId");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest(res, "Invalid request body");
  }

  const textFields = [
    ["userIdentity", "user_identity", USER_IDENTITIES],
    ["ageRange", "age_range", AGE_RANGES],
    ["sleepSchedule", "sleep_schedule", SLEEP_SCHEDULES],
    ["baselineSleep", "baseline_sleep", BASELINE_SLEEP],
    ["companionStyle", "companion_style", COMPANION_STYLES],
    ["currentEnergyLevel", "current_energy_level", ENERGY_LEVELS],
    ["socraticMode", "socratic_mode", SOCRATIC_MODES],
  ];

  const updates = {};

  // 匿名外觀欄位獨立驗證，只允許預設的八款頭像。
  if (hasOwn(body, "avatarId")) {
    if (
      typeof body.avatarId !== "string" ||
      !AVATAR_IDS.includes(body.avatarId)
    ) {
      return badRequest(res, "Invalid avatarId");
    }
    updates.avatar_id = body.avatarId;
  }

  if (hasOwn(body, "nickname")) {
    if (!validateNickname(body.nickname)) {
      return badRequest(res, "暱稱請輸入 1–20 個字，且不可包含換行或控制字元。");
    }
    updates.nickname = body.nickname.trim();
  }

  // 文字欄位：只更新本次有提供的欄位。
  for (const [requestKey, column, allowed] of textFields) {
    if (!hasOwn(body, requestKey)) continue;

    if (
      body[requestKey] !== null &&
      typeof body[requestKey] !== "string"
    ) {
      return badRequest(res, `Invalid ${requestKey}`);
    }

    const value = normalizeString(body[requestKey]);

    if (!validateChoice(value, allowed)) {
      return badRequest(res, `Invalid ${requestKey}`);
    }

    updates[column] = value;
  }

  // 壓力來源多選。
  if (hasOwn(body, "stressSources")) {
    if (!Array.isArray(body.stressSources)) {
      return badRequest(res, "Invalid stressSources");
    }

    const sources = normalizeStringArray(body.stressSources)
      .map((item) => STRESS_SOURCE_ALIASES[item] || item)
      .filter((item, index, array) => array.indexOf(item) === index);

    if (sources.some((item) => !STRESS_SOURCES.includes(item))) {
      return badRequest(res, "Invalid stress source");
    }

    updates.stress_sources = sources;
  }

  // 布林欄位驗證。
  for (const key of [
    "termsAccepted",
    "privacyAgreed",
    "hasCompletedOnboarding",
    "allowDataAnalysis",
    "allowProfilePersonalization",
    "allowHistoryAnalysis",
  ]) {
    if (!validateBoolean(body, key)) {
      return badRequest(res, `Invalid ${key}`);
    }
  }

  if (hasOwn(body, "termsAccepted")) {
    updates.terms_accepted = body.termsAccepted;
  }

  if (hasOwn(body, "privacyAgreed")) {
    updates.privacy_agreed = body.privacyAgreed;
  }

  if (hasOwn(body, "hasCompletedOnboarding")) {
    updates.has_completed_onboarding = body.hasCompletedOnboarding;
  }

  // 舊版 Onboarding 相容：新獨立權限優先。
  if (hasOwn(body, "allowDataAnalysis")) {
    if (!hasOwn(body, "allowProfilePersonalization")) {
      updates.allow_profile_personalization = body.allowDataAnalysis;
    }

    if (!hasOwn(body, "allowHistoryAnalysis")) {
      updates.allow_history_analysis = body.allowDataAnalysis;
    }
  }

  if (hasOwn(body, "allowProfilePersonalization")) {
    updates.allow_profile_personalization =
      body.allowProfilePersonalization;
  }

  if (hasOwn(body, "allowHistoryAnalysis")) {
    updates.allow_history_analysis =
      body.allowHistoryAnalysis;
  }

  // 舊欄位 life_status 與身份同步。
  if (hasOwn(updates, "user_identity")) {
    updates.life_status = updates.user_identity;
  }

  if (Object.keys(updates).length === 0) {
    return badRequest(res, "No profile fields provided");
  }

  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    // 鎖定使用者，讓同一個使用者的 Profile 寫入依序執行。
    const userResult = await client.query(
      "SELECT user_id FROM users WHERE user_id = $1 FOR UPDATE",
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return badRequest(res, "Invalid user ID");
    }

    // 確保 Profile 存在。
    await client.query(
      `INSERT INTO user_profiles (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    // 在同一個交易中讀取並鎖定既有狀態。
    const existingResult = await client.query(
      `SELECT
         terms_accepted,
         privacy_agreed,
         has_completed_onboarding
       FROM user_profiles
       WHERE user_id = $1
       FOR UPDATE`,
      [userId]
    );

    const existing = existingResult.rows[0];

    const nextTermsAccepted = hasOwn(updates, "terms_accepted")
      ? updates.terms_accepted
      : existing.terms_accepted === true;

    const nextPrivacyAgreed = hasOwn(updates, "privacy_agreed")
      ? updates.privacy_agreed
      : existing.privacy_agreed === true;

    // 明確要求完成時，兩項必要同意都必須成立。
    if (
      updates.has_completed_onboarding === true &&
      (!nextTermsAccepted || !nextPrivacyAgreed)
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return badRequest(
        res,
        "完成 Onboarding 前，必須同意使用服務條款與隱私政策。"
      );
    }

    // 任一必要同意取消，完成狀態同步取消。
    if (!nextTermsAccepted || !nextPrivacyAgreed) {
      updates.has_completed_onboarding = false;
    }

    // 欄位名稱只來自上方固定白名單，不接受使用者自訂 SQL 欄位。
    const columns = Object.keys(updates);
    const values = [userId];

    const assignments = columns.map((column) => {
      values.push(updates[column]);
      return `${column} = $${values.length}`;
    });

    const saved = await client.query(
      `UPDATE user_profiles
       SET ${assignments.join(", ")},
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING
         profile_id, user_id, nickname, avatar_id, life_status,
         user_identity, age_range, stress_sources,
         sleep_schedule, baseline_sleep, companion_style,
         current_energy_level, socratic_mode,
         coping_methods, preferred_elements, user_target,
         terms_accepted,
         privacy_agreed,
         has_completed_onboarding,
         allow_profile_personalization,
         allow_history_analysis,
         created_at,
         updated_at`,
      values
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: "Profile saved successfully",
      data: saved.rows[0],
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Profile rollback error:", rollbackError);
      }
    }

    console.error("Save profile error:", error);

    if (error.code === "23503") {
      return badRequest(res, "Invalid user ID");
    }

    return res.status(500).json({
      success: false,
      message: "Unable to save profile",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;