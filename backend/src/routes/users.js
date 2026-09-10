const express = require("express");
const pool = require("../db");
const {
  issueAnonymousToken,
  verifyAnonymousToken,
  parseBearerToken,
} = require("../services/anonymousAuth");

const router = express.Router();

// 新匿名帳號：使用者與憑證在同一交易中建立，避免只建立其中一項。
router.post("/", async (req, res) => {
  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const result = await client.query(`
      INSERT INTO users DEFAULT VALUES
      RETURNING user_id, created_at
    `);

    const user = result.rows[0];
    const credential = await issueAnonymousToken(client, user.user_id);

    await client.query("COMMIT");
    transactionStarted = false;

    // 原始憑證只在簽發時回傳，不存入 users，也不寫入伺服器日誌。
    return res.status(201).json({
      success: true,
      message: "Anonymous user created successfully",
      data: {
        ...user,
        anonymous_credential: credential.token,
        credential_expires_at: credential.expiresAt,
      },
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Create anonymous user rollback failed:", rollbackError);
      }
    }
    console.error("Create anonymous user failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create anonymous user",
    });
  } finally {
    if (client) client.release();
  }
});

// GET /api/users/me：驗證憑證所代表的匿名帳號。
// 不接受 body、query 或 URL 中的 userId 作為身份證明。
router.get("/me", async (req, res) => {
  try {
    const token = parseBearerToken(req.get("authorization"));
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Anonymous credential required",
      });
    }

    const identity = await verifyAnonymousToken(pool, token);
    if (!identity) {
      return res.status(401).json({
        success: false,
        message: "Anonymous credential invalid or expired",
      });
    }

    return res.status(200).json({
      success: true,
      data: { user_id: identity.userId },
    });
  } catch (error) {
    console.error("Verify anonymous user failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify anonymous user",
    });
  }
});

module.exports = router;
