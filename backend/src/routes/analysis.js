const express = require("express");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {
      completedDays,
      averageMood,
      averageStress,
      averageSleep,
      recentRecords,
    } = req.body;

    if (
      completedDays === undefined ||
      averageMood === undefined ||
      averageStress === undefined ||
      averageSleep === undefined ||
      !Array.isArray(recentRecords)
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing analysis data",
      });
    }

    // 先用假資料測試整條流程
    let summary = "近期狀態整體相對穩定，可以持續完成每日 Check-in。";

    if (Number(averageStress) >= 4) {
      summary =
        "近期壓力紀錄偏高，建議持續觀察壓力來源與睡眠變化。";
    }

    if (Number(averageStress) >= 4 && Number(averageSleep) <= 2.5) {
      summary =
        "近期壓力紀錄偏高，且睡眠品質較低，建議特別留意休息與生活節奏。";
    }

    return res.status(200).json({
      success: true,
      data: {
        summary,
        completedDays,
        averageMood,
        averageStress,
        averageSleep,
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