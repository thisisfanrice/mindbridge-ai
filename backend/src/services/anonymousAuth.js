const { randomBytes, createHash, timingSafeEqual } = require("node:crypto");

const TOKEN_PATTERN = /^[0-9a-f]{64}$/;
const TOKEN_TTL_DAYS = 30;

function createAnonymousToken() {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashToken(token) };
}

function hashToken(token) {
  if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) {
    throw new TypeError("Invalid anonymous credential");
  }
  return createHash("sha256").update(token, "ascii").digest("hex");
}

function parseBearerToken(header) {
  if (typeof header !== "string") return null;
  const match = /^Bearer ([0-9a-f]{64})$/.exec(header);
  return match ? match[1] : null;
}

async function verifyAnonymousToken(pool, token) {
  if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) return null;
  const tokenHash = hashToken(token);
  const result = await pool.query(
    `SELECT user_id, token_hash FROM anonymous_credentials
     WHERE token_hash = $1 AND revoked_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP`,
    [tokenHash]
  );
  const credential = result.rows[0];
  if (!credential || !TOKEN_PATTERN.test(credential.token_hash)) return null;
  const expected = Buffer.from(tokenHash, "hex");
  const actual = Buffer.from(credential.token_hash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { userId: credential.user_id };
}

async function issueAnonymousToken(client, userId) {
  const { token, tokenHash } = createAnonymousToken();
  const result = await client.query(
    `INSERT INTO anonymous_credentials (user_id, token_hash, expires_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP + ($3 * INTERVAL '1 day'))
     RETURNING credential_id, expires_at`,
    [userId, tokenHash, TOKEN_TTL_DAYS]
  );
  return {
    token,
    credentialId: result.rows[0].credential_id,
    expiresAt: result.rows[0].expires_at,
  };
}

module.exports = {
  createAnonymousToken, hashToken, parseBearerToken,
  verifyAnonymousToken, issueAnonymousToken,
};
