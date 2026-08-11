const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * 新增 / 更新今日 Check-in
 */
router.post("/", async (req, res) => {
  try {
    const {
      userId,
      moodScore,
      stressScore,
      sleepScore,
      note,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId",
      });
    }

    const normalizedMood =
      moodScore === undefined || moodScore === null
        ? null
        : moodScore;

    const normalizedStress =
      stressScore === undefined || stressScore === null
        ? null
        : stressScore;

    const normalizedSleep =
      sleepScore === undefined || sleepScore === null
        ? null
        : sleepScore;

    const normalizedNote =
      typeof note === "string" && note.trim().length > 0
        ? note.trim()
        : null;

    const hasAnyCheckinData =
      normalizedMood !== null ||
      normalizedStress !== null ||
      normalizedSleep !== null ||
      normalizedNote !== null;

    if (!hasAnyCheckinData) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one check-in item",
      });
    }

    if (
      normalizedMood !== null &&
      (
        !Number.isInteger(normalizedMood) ||
        normalizedMood < 1 ||
        normalizedMood > 6
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "moodScore must be an integer between 1 and 6",
      });
    }

    if (
      normalizedStress !== null &&
      (
        !Number.isInteger(normalizedStress) ||
        normalizedStress < 1 ||
        normalizedStress > 10
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "stressScore must be an integer between 1 and 10",
      });
    }

    if (
      normalizedSleep !== null &&
      (
        !Number.isInteger(normalizedSleep) ||
        normalizedSleep < 1 ||
        normalizedSleep > 10
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "sleepScore must be an integer between 1 and 10",
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
      normalizedMood,
      normalizedStress,
      normalizedSleep,
      normalizedNote,
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

    return res.status(500).json({
      success: false,
      message: "Unable to save check-in",
    });
  }
});


/**
 * 取得指定匿名使用者的歷史 Check-in
 */
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
      ORDER BY checkin_date DESC, created_at DESC
    `;

    const result = await pool.query(query, [userId]);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get check-ins error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load check-in history",
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
      note,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId",
      });
    }

    const normalizedMood =
      moodScore === undefined || moodScore === null
        ? null
        : moodScore;

    const normalizedStress =
      stressScore === undefined || stressScore === null
        ? null
        : stressScore;

    const normalizedSleep =
      sleepScore === undefined || sleepScore === null
        ? null
        : sleepScore;

    const normalizedNote =
      typeof note === "string" && note.trim().length > 0
        ? note.trim()
        : null;

    const hasAnyCheckinData =
      normalizedMood !== null ||
      normalizedStress !== null ||
      normalizedSleep !== null ||
      normalizedNote !== null;

    if (!hasAnyCheckinData) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one check-in item",
      });
    }

    if (
      normalizedMood !== null &&
      (
        !Number.isInteger(normalizedMood) ||
        normalizedMood < 1 ||
        normalizedMood > 6
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "moodScore must be an integer between 1 and 6",
      });
    }

    if (
      normalizedStress !== null &&
      (
        !Number.isInteger(normalizedStress) ||
        normalizedStress < 1 ||
        normalizedStress > 10
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "stressScore must be an integer between 1 and 10",
      });
    }

    if (
      normalizedSleep !== null &&
      (
        !Number.isInteger(normalizedSleep) ||
        normalizedSleep < 1 ||
        normalizedSleep > 10
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "sleepScore must be an integer between 1 and 10",
      });
    }

    const result = await pool.query(
      `
        UPDATE daily_checkins
        SET
          mood_score = $1,
          stress_score = $2,
          sleep_score = $3,
          note = $4,
          created_at = CURRENT_TIMESTAMP
        WHERE checkin_id = $5
          AND user_id = $6
        RETURNING
          checkin_id,
          user_id,
          mood_score,
          stress_score,
          sleep_score,
          note,
          checkin_date,
          created_at
      `,
      [
        normalizedMood,
        normalizedStress,
        normalizedSleep,
        normalizedNote,
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
    console.error("Update check-in error:", error);

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
        WHERE checkin_id = $1
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
      data: {
        checkinId: result.rows[0].checkin_id,
      },
    });
  } catch (error) {
    console.error("Delete check-in error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete check-in",
    });
  }
});

module.exports = router;