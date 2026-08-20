const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * 取得使用者 Profile / Onboarding 設定
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
          sleep_schedule,
          baseline_sleep,

          stress_sources,
          coping_methods,
          companion_style,
          preferred_elements,
          user_target,

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
    console.error("Get profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load profile",
    });
  }
});


/**
 * 新增 / 更新 Profile / Onboarding
 */
router.put("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const {
      lifeStatus,

      userIdentity,
      sleepSchedule,
      baselineSleep,

      stressSources,
      copingMethods,
      companionStyle,
      preferredElements,
      userTarget,

      allowProfilePersonalization,
      allowHistoryAnalysis,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId",
      });
    }

    /*
     * 陣列型欄位驗證
     */
    if (
      stressSources !== undefined &&
      stressSources !== null &&
      !Array.isArray(stressSources)
    ) {
      return res.status(400).json({
        success: false,
        message: "stressSources must be an array",
      });
    }

    if (
      copingMethods !== undefined &&
      copingMethods !== null &&
      !Array.isArray(copingMethods)
    ) {
      return res.status(400).json({
        success: false,
        message: "copingMethods must be an array",
      });
    }

    if (
      preferredElements !== undefined &&
      preferredElements !== null &&
      !Array.isArray(preferredElements)
    ) {
      return res.status(400).json({
        success: false,
        message: "preferredElements must be an array",
      });
    }

    /*
     * 單選 / 字串欄位正規化
     */
    const normalizedLifeStatus =
      typeof lifeStatus === "string" &&
      lifeStatus.trim().length > 0
        ? lifeStatus.trim()
        : null;

    const normalizedUserIdentity =
      typeof userIdentity === "string" &&
      userIdentity.trim().length > 0
        ? userIdentity.trim()
        : null;

    const normalizedSleepSchedule =
      typeof sleepSchedule === "string" &&
      sleepSchedule.trim().length > 0
        ? sleepSchedule.trim()
        : null;

    const normalizedBaselineSleep =
      typeof baselineSleep === "string" &&
      baselineSleep.trim().length > 0
        ? baselineSleep.trim()
        : null;

    const normalizedCompanionStyle =
      typeof companionStyle === "string" &&
      companionStyle.trim().length > 0
        ? companionStyle.trim()
        : null;

    const normalizedUserTarget =
      typeof userTarget === "string" &&
      userTarget.trim().length > 0
        ? userTarget.trim()
        : null;

    /*
     * 多選陣列欄位正規化
     */
    const normalizedStressSources =
      Array.isArray(stressSources)
        ? stressSources
            .filter(
              (item) =>
                typeof item === "string" &&
                item.trim().length > 0
            )
            .map((item) => item.trim())
        : [];

    const normalizedCopingMethods =
      Array.isArray(copingMethods)
        ? copingMethods
            .filter(
              (item) =>
                typeof item === "string" &&
                item.trim().length > 0
            )
            .map((item) => item.trim())
        : [];

    const normalizedPreferredElements =
      Array.isArray(preferredElements)
        ? preferredElements
            .filter(
              (item) =>
                typeof item === "string" &&
                item.trim().length > 0
            )
            .map((item) => item.trim())
        : [];

    /*
     * AI 權限
     */
    const profilePersonalization =
      typeof allowProfilePersonalization === "boolean"
        ? allowProfilePersonalization
        : false;

    const historyAnalysis =
      typeof allowHistoryAnalysis === "boolean"
        ? allowHistoryAnalysis
        : true;

    const result = await pool.query(
      `
        INSERT INTO user_profiles (
          user_id,

          life_status,
          user_identity,
          sleep_schedule,
          baseline_sleep,

          stress_sources,
          coping_methods,
          companion_style,
          preferred_elements,
          user_target,

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
          $12
        )

        ON CONFLICT (user_id)
        DO UPDATE SET
          life_status = EXCLUDED.life_status,

          user_identity = EXCLUDED.user_identity,
          sleep_schedule = EXCLUDED.sleep_schedule,
          baseline_sleep = EXCLUDED.baseline_sleep,

          stress_sources = EXCLUDED.stress_sources,
          coping_methods = EXCLUDED.coping_methods,
          companion_style = EXCLUDED.companion_style,
          preferred_elements = EXCLUDED.preferred_elements,
          user_target = EXCLUDED.user_target,

          allow_profile_personalization =
            EXCLUDED.allow_profile_personalization,

          allow_history_analysis =
            EXCLUDED.allow_history_analysis,

          updated_at = CURRENT_TIMESTAMP

        RETURNING
          profile_id,
          user_id,

          life_status,
          user_identity,
          sleep_schedule,
          baseline_sleep,

          stress_sources,
          coping_methods,
          companion_style,
          preferred_elements,
          user_target,

          allow_profile_personalization,
          allow_history_analysis,

          created_at,
          updated_at
      `,
      [
        userId,

        normalizedLifeStatus,
        normalizedUserIdentity,
        normalizedSleepSchedule,
        normalizedBaselineSleep,

        normalizedStressSources,
        normalizedCopingMethods,
        normalizedCompanionStyle,
        normalizedPreferredElements,
        normalizedUserTarget,

        profilePersonalization,
        historyAnalysis,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Profile saved successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Save profile error:", error);

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to save profile",
    });
  }
});

module.exports = router;