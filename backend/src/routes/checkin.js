const express = require("express");
const pool = require("../db");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {
      userId,
      moodScore,
      stressScore,
      sleepScore,
      note,
    } = req.body;

    if (
      !userId ||
      moodScore === undefined ||
      stressScore === undefined ||
      sleepScore === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const scores = [
      moodScore,
      stressScore,
      sleepScore,
    ];

    const invalidScore = scores.some(
      (score) =>
        !Number.isInteger(score) ||
        score < 1 ||
        score > 5
    );

    if (invalidScore) {
      return res.status(400).json({
        success: false,
        message: "Scores must be integers between 1 and 5",
      });
    }

    const query = `
      INSERT INTO daily_checkins (
        user_id,
        mood_score,
        stress_score,
        sleep_score,
        note
      )
      VALUES ($1, $2, $3, $4, $5)

      ON CONFLICT (user_id, checkin_date)
      DO UPDATE SET
        mood_score = EXCLUDED.mood_score,
        stress_score = EXCLUDED.stress_score,
        sleep_score = EXCLUDED.sleep_score,
        note = EXCLUDED.note,
        created_at = CURRENT_TIMESTAMP

      RETURNING
        checkin_id,
        user_id,
        mood_score,
        stress_score,
        sleep_score,
        note,
        checkin_date,
        created_at
    `;

    const values = [
      userId,
      moodScore,
      stressScore,
      sleepScore,
      note || null,
    ];

    const result = await pool.query(query, values);

    return res.status(201).json({
      success: true,
      message: "Daily check-in saved successfully",
      data: result.rows[0],
    });

  } catch (error) {

    console.error("Check-in error:", error);

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Today's check-in already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to save check-in",
    });
  }
});
// 取得指定匿名使用者的歷史 Check-in
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const query = `
      SELECT
        checkin_id,
        user_id,
        mood_score,
        stress_score,
        sleep_score,
        note,
        checkin_date,
        created_at
      FROM daily_checkins
      WHERE user_id = $1
      ORDER BY checkin_date DESC
    `;

    const result = await pool.query(query, [userId]);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get check-ins error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load check-in history",
    });
  }
});
module.exports = router;