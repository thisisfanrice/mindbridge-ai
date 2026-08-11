const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * 取得使用者 Profile
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
          stress_sources,
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
 * 新增 / 更新 Profile
 */
router.put("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const {
      lifeStatus,
      stressSources,
      allowProfilePersonalization,
      allowHistoryAnalysis,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId",
      });
    }

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

    const normalizedLifeStatus =
      typeof lifeStatus === "string" &&
      lifeStatus.trim().length > 0
        ? lifeStatus.trim()
        : null;

    const normalizedStressSources =
      Array.isArray(stressSources)
        ? stressSources.filter(
            (item) =>
              typeof item === "string" &&
              item.trim().length > 0
          )
        : [];

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
          stress_sources,
          allow_profile_personalization,
          allow_history_analysis
        )
        VALUES ($1, $2, $3, $4, $5)

        ON CONFLICT (user_id)
        DO UPDATE SET
          life_status = EXCLUDED.life_status,
          stress_sources = EXCLUDED.stress_sources,
          allow_profile_personalization =
            EXCLUDED.allow_profile_personalization,
          allow_history_analysis =
            EXCLUDED.allow_history_analysis,
          updated_at = CURRENT_TIMESTAMP

        RETURNING
          profile_id,
          user_id,
          life_status,
          stress_sources,
          allow_profile_personalization,
          allow_history_analysis,
          created_at,
          updated_at
      `,
      [
        userId,
        normalizedLifeStatus,
        normalizedStressSources,
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