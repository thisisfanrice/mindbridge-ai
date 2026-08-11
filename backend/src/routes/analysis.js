const express = require("express");
const pool = require("../db");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {
      userId,
      completedDays,
      averageMood,
      averageStress,
      averageSleep,
      recentRecords,
    } = req.body;

    if (
      !userId ||
      completedDays === undefined ||
      !Array.isArray(recentRecords)
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing analysis data",
      });
    }

    // 讀取個人化設定
    const profileResult = await pool.query(
      `
        SELECT
          life_status,
          stress_sources,
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

    const allowHistoryAnalysis =
      profile?.allow_history_analysis ?? true;

    const allowProfilePersonalization =
      profile?.allow_profile_personalization ?? false;

    // 如果使用者不允許分析歷史紀錄
    if (!allowHistoryAnalysis) {
      return res.status(200).json({
        success: true,
        data: {
          summary:
            "你目前已關閉歷史 Check-in 分析。可以在個人化設定中重新開啟這項功能。",
          analysisEnabled: false,
          usedProfileData: false,
        },
      });
    }

    const mood =
      averageMood === null ||
      averageMood === undefined
        ? null
        : Number(averageMood);

    const stress =
      averageStress === null ||
      averageStress === undefined
        ? null
        : Number(averageStress);

    const sleep =
      averageSleep === null ||
      averageSleep === undefined
        ? null
        : Number(averageSleep);

    let summary =
      "目前已有一些近期紀錄，可以持續完成 Check-in，觀察狀態是否出現明顯變化。";

    // 規則式分析
    if (
      stress !== null &&
      stress >= 8 &&
      sleep !== null &&
      sleep <= 3
    ) {
      summary =
        "近期壓力紀錄偏高，同時睡眠品質較低，可以特別留意休息與壓力來源的變化。";
    } else if (
      stress !== null &&
      stress >= 8
    ) {
      summary =
        "近期壓力紀錄偏高，可以觀察最近是否有持續性的壓力來源。";
    } else if (
      sleep !== null &&
      sleep <= 3
    ) {
      summary =
        "近期睡眠品質紀錄較低，可以留意作息與休息狀況的變化。";
    } else if (
      mood !== null &&
      mood <= 2
    ) {
      summary =
        "近期心情紀錄偏低，可以持續記錄，觀察這個狀態是否延續。";
    } else if (
      mood !== null &&
      mood >= 5 &&
      stress !== null &&
      stress <= 3
    ) {
      summary =
        "近期心情較佳、壓力也相對較低，目前整體狀態看起來相對穩定。";
    } else if (
      stress !== null &&
      stress >= 6
    ) {
      summary =
        "近期壓力紀錄有些偏高，可以持續觀察壓力來源與睡眠變化。";
    }

    // 只有使用者允許時才使用 Profile 資料
    let usedProfileData = false;

    if (
      allowProfilePersonalization &&
      profile
    ) {
      const lifeStatus =
        profile.life_status || null;

      const stressSources =
        Array.isArray(profile.stress_sources)
          ? profile.stress_sources
          : [];

      if (lifeStatus || stressSources.length > 0) {
        usedProfileData = true;

        if (stressSources.length > 0) {
          summary += ` 你曾設定較常見的壓力來源包含：${stressSources.join(
            "、"
          )}，可以特別留意這些因素近期是否有變化。`;
        } else if (lifeStatus) {
          summary += ` 系統目前會參考你設定的生活狀態「${lifeStatus}」提供個人化的觀察方向。`;
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        summary,
        completedDays,
        averageMood: mood,
        averageStress: stress,
        averageSleep: sleep,
        analysisEnabled: true,
        usedProfileData,
      },
    });
  } catch (error) {
    console.error("Analysis error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate analysis",
    });
  }
});

module.exports = router;