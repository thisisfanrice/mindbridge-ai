const express = require("express");
const pool = require("../db");
const {
  issueAnonymousToken, verifyAnonymousToken, hashToken,
} = require("../services/anonymousAuth");

const router = express.Router();
const COOKIE_NAME = "mindbridge_session";
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const SAME_SITE = process.env.SESSION_SAME_SITE || "lax";

if (!["lax", "strict", "none"].includes(SAME_SITE)) {
  throw new Error("Invalid SESSION_SAME_SITE");
}
if (SAME_SITE === "none" && !IS_PRODUCTION) {
  throw new Error("SameSite=None requires HTTPS and production configuration");
}

const allowedOrigins = (process.env.FRONTEND_ORIGINS || (
  IS_PRODUCTION ? "" : "http://127.0.0.1:3001,http://localhost:3001"
)).split(",").map(value => value.trim()).filter(Boolean);

if (IS_PRODUCTION && allowedOrigins.length === 0) {
  throw new Error("FRONTEND_ORIGINS must be configured in production");
}
if (allowedOrigins.some(origin => {
  try {
    const url = new URL(origin);
    return !["http:", "https:"].includes(url.protocol) ||
      url.origin !== origin || url.username || url.password ||
      (IS_PRODUCTION && url.protocol !== "https:");
  } catch { return true; }
})) {
  throw new Error("Invalid FRONTEND_ORIGINS");
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: SAME_SITE,
    path: "/api",
    maxAge: MAX_AGE,
  };
}

function readCookie(req) {
  const header = req.get("cookie");
  if (!header) return null;
  const matches = header.split(";").map(value => value.trim())
    .filter(value => value.startsWith(`${COOKIE_NAME}=`));
  if (matches.length !== 1) return null;
  const value = matches[0].slice(COOKIE_NAME.length + 1);
  return /^[0-9a-f]{64}$/.test(value) ? value : null;
}

function requireAllowedOrigin(req, res, next) {
  const origin = req.get("origin");
  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(403).json({ success: false, message: "Origin not allowed" });
  }
  next();
}

// The cookie is not sufficient by itself for cross-site state changes.
// All session mutations require an explicit allowed Origin and JSON body.
function requireJson(req, res, next) {
  if (!req.is("application/json")) {
    return res.status(415).json({ success: false, message: "JSON required" });
  }
  next();
}

async function requireSession(req, res, next) {
  try {
    const token = readCookie(req);
    const identity = token ? await verifyAnonymousToken(pool, token) : null;
    if (!identity) {
      return res.status(401).json({
        success: false, message: "Anonymous session required",
      });
    }
    req.anonymousUserId = identity.userId;
    next();
  } catch (error) {
    console.error("Anonymous session verification failed:", error && error.code ? error.code : "internal");
    res.status(500).json({ success: false, message: "Unable to verify session" });
  }
}

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.post("/anonymous", requireAllowedOrigin, requireJson, async (req, res) => {
  let client;
  let transactionStarted = false;
  try {
    const existingToken = readCookie(req);
    if (existingToken) {
      const existing = await verifyAnonymousToken(pool, existingToken);
      if (existing) {
        return res.status(409).json({
          success: false, message: "Session already exists",
        });
      }
    }
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;
    const result = await client.query(
      "INSERT INTO users DEFAULT VALUES RETURNING user_id, created_at"
    );
    const user = result.rows[0];
    const credential = await issueAnonymousToken(client, user.user_id);
    await client.query("COMMIT");
    transactionStarted = false;
    res.cookie(COOKIE_NAME, credential.token, cookieOptions());
    return res.status(201).json({
      success: true,
      data: { user_id: user.user_id, created_at: user.created_at },
    });
  } catch (error) {
    if (client && transactionStarted) {
      try { await client.query("ROLLBACK"); }
      catch (rollbackError) { console.error("Session rollback failed:", rollbackError && rollbackError.code ? rollbackError.code : "internal"); }
    }
    console.error("Create anonymous session failed:", error && error.code ? error.code : "internal");
    return res.status(500).json({ success: false, message: "Unable to create session" });
  } finally {
    if (client) client.release();
  }
});

router.get("/me", requireSession, (req, res) => {
  res.json({ success: true, data: { user_id: req.anonymousUserId } });
});

router.post("/logout", requireAllowedOrigin, requireJson, requireSession, async (req, res) => {
  try {
    const token = readCookie(req);
    await pool.query(
      `UPDATE anonymous_credentials SET revoked_at = CURRENT_TIMESTAMP
       WHERE token_hash = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [hashToken(token), req.anonymousUserId]
    );
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: SAME_SITE,
      path: "/api",
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Anonymous session logout failed:", error && error.code ? error.code : "internal");
    res.status(500).json({ success: false, message: "Unable to revoke session" });
  }
});

module.exports = router;
module.exports.requireSession = requireSession;
module.exports.requireAllowedOrigin = requireAllowedOrigin;
