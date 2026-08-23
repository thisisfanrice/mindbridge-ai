const express = require("express");
const pool = require("../db");

const router = express.Router();

/*
 * =========================
 * Allowed values
 * =========================
 */

const USER_IDENTITIES = [
  "working",
  "freelance",
  "unemployed",
  "homemaker",
  "senior",
  "student",
];

const AGE_RANGES = [
  "under_15",
  "15_18",
  "19_22",
  "23_30",
  "over_30",
];

const STRESS_SOURCES = [
  "career",
  "finance",
  "future",
  "relationships_family",
  "health",
  "study",
];

const STRESS_SOURCE_ALIASES = {
  // 新版
  career: "career",
  finance: "finance",
  future: "future",
  relationships_family: "relationships_family",
  health: "health",
  study: "study",

  // 舊版英文
  work: "career",
  relation: "relationships_family",
  family: "relationships_family",
  other: "future",

  // 舊版中文
  工作: "career",
  職涯: "career",
  經濟: "finance",
  未來規劃: "future",
  人際: "relationships_family",
  家庭: "relationships_family",
  健康: "health",
  課業: "study",
};

const SLEEP_SCHEDULES = [
  "early",
  "night",
  "irregular",
];

const BASELINE_SLEEP = [
  "under_5",
  "5_7",
  "7_9",
  "over_9",
];

const COMPANION_STYLES = [
  "warm",
  "rational",
  "positive",
];

const ENERGY_LEVELS = [
  "full",
  "maintaining",
  "drained",
];

const SOCRATIC_MODES = [
  "study",
  "emotional",
];

/*
 * =========================
 * Helpers
 * =========================
 */

function normalizeString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0
    ? trimmed
    : null;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0
    )
    .map((item) => item.trim());
}

function validateChoice(value, allowedValues) {
  if (value === null) {
    return true;
  }

  return allowedValues.includes(value);
}

/*
 * =========================
 * GET Profile
 * =========================
 */

router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `
        SELECT
          profile_id,
          user_id,

          life_status,

          user_identity,
          age_range,
          stress_sources,
          sleep_schedule,
          baseline_sleep,
          companion_style,
          current_energy_level,
          socratic_mode,

          coping_methods,
          preferred_elements,
          user_target,

          terms_accepted,
          allow_profile_personalization,
          allow_history_analysis,

          created_at,
          updated_at

        FROM user_profiles

        WHERE user_id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Get profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load profile",
    });
  }
});

/*
 * =========================
 * PUT Profile
 * =========================
 */

router.put("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const {
      userIdentity,
      ageRange,
      stressSources,
      sleepSchedule,
      baselineSleep,
      companionStyle,
      currentEnergyLevel,
      socraticMode,

      termsAccepted,
      allowDataAnalysis,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId",
      });
    }

    const normalizedUserIdentity =
      normalizeString(userIdentity);

    const normalizedAgeRange =
      normalizeString(ageRange);

    const normalizedStressSources =
      normalizeStringArray(stressSources)
        .map(
          (item) =>
            STRESS_SOURCE_ALIASES[item] || item
        )
        .filter(
          (item, index, array) =>
            array.indexOf(item) === index
        );

    const normalizedSleepSchedule =
      normalizeString(
        sleepSchedule
      );

    const normalizedBaselineSleep =
      normalizeString(
        baselineSleep
      );

    const normalizedCompanionStyle =
      normalizeString(
        companionStyle
      );

    const normalizedEnergyLevel =
      normalizeString(
        currentEnergyLevel
      );

    const normalizedSocraticMode =
      normalizeString(
        socraticMode
      );

    /*
     * =========================
     * Validate choices
     * =========================
     */

    if (
      !validateChoice(
        normalizedUserIdentity,
        USER_IDENTITIES
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid userIdentity",
      });
    }

    if (
      !validateChoice(
        normalizedAgeRange,
        AGE_RANGES
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid ageRange",
      });
    }

    if (
      !validateChoice(
        normalizedSleepSchedule,
        SLEEP_SCHEDULES
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid sleepSchedule",
      });
    }

    if (
      !validateChoice(
        normalizedBaselineSleep,
        BASELINE_SLEEP
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid baselineSleep",
      });
    }

    if (
      !validateChoice(
        normalizedCompanionStyle,
        COMPANION_STYLES
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid companionStyle",
      });
    }

    if (
      !validateChoice(
        normalizedEnergyLevel,
        ENERGY_LEVELS
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid currentEnergyLevel",
      });
    }

    if (
      !validateChoice(
        normalizedSocraticMode,
        SOCRATIC_MODES
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid socraticMode",
      });
    }

    const invalidStressSource =
      normalizedStressSources.find(
        (item) =>
          !STRESS_SOURCES.includes(
            item
          )
      );

    if (invalidStressSource) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid stress source",
      });
    }

    /*
     * 條款
     */
    const normalizedTermsAccepted =
      termsAccepted === true;

    /*
     * UI 的「允許系統記錄與分析」
     * 同時控制目前既有的：
     *
     * allow_profile_personalization
     * allow_history_analysis
     *
     * 之後如果想拆成兩個選項也可以。
     */
    const normalizedDataPermission =
      allowDataAnalysis === true;

    const result = await pool.query(
      `
        INSERT INTO user_profiles (
          user_id,

          life_status,

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
        )

        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13
        )

        ON CONFLICT (user_id)

        DO UPDATE SET
          life_status =
            EXCLUDED.life_status,

          user_identity =
            EXCLUDED.user_identity,

          age_range =
            EXCLUDED.age_range,

          stress_sources =
            EXCLUDED.stress_sources,

          sleep_schedule =
            EXCLUDED.sleep_schedule,

          baseline_sleep =
            EXCLUDED.baseline_sleep,

          companion_style =
            EXCLUDED.companion_style,

          current_energy_level =
            EXCLUDED.current_energy_level,

          socratic_mode =
            EXCLUDED.socratic_mode,

          terms_accepted =
            EXCLUDED.terms_accepted,

          allow_profile_personalization =
            EXCLUDED.allow_profile_personalization,

          allow_history_analysis =
            EXCLUDED.allow_history_analysis,

          updated_at =
            CURRENT_TIMESTAMP

        RETURNING
          profile_id,
          user_id,

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
          allow_history_analysis,

          created_at,
          updated_at
      `,
      [
        userId,

        // 舊欄位 life_status 暫時同步存同一個值
        normalizedUserIdentity,

        normalizedUserIdentity,
        normalizedAgeRange,
        normalizedStressSources,
        normalizedSleepSchedule,
        normalizedBaselineSleep,
        normalizedCompanionStyle,
        normalizedEnergyLevel,
        normalizedSocraticMode,

        normalizedTermsAccepted,
        normalizedDataPermission,
        normalizedDataPermission,
      ]
    );

    return res.status(200).json({
      success: true,
      message:
        "Profile saved successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Save profile error:",
      error
    );

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to save profile",
    });
  }
});

module.exports = router;