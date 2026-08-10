const express = require("express");
const pool = require("../db");

const router = express.Router();

// 建立匿名使用者
router.post("/", async (req, res) => {
  try {
    const result = await pool.query(`
      INSERT INTO users DEFAULT VALUES
      RETURNING user_id, created_at
    `);

    res.status(201).json({
      success: true,
      message: "Anonymous user created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create user error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create anonymous user",
    });
  }
});

module.exports = router;