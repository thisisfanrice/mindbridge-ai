const pool = require("../db");
const { requireSession, requireAllowedOrigin } = require("../routes/session");

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const methods = {
  profile: { GET: /^\/[0-9a-f-]+$/i, PUT: /^\/[0-9a-f-]+$/i },
  checkin: { GET: /^\/[0-9a-f-]+$/i, POST: /^\/$/, PUT: /^\/[0-9a-f-]+$/i, DELETE: /^\/[0-9a-f-]+$/i },
  conversation: { GET: /^\/current$/, POST: /^\/$/, DELETE: /^\/history$/ },
  analysis: { POST: /^\/$/ },
  tutor: { POST: /^\/$/ },
};

// Deny unknown routes, methods and legacy identity issuance by default.
function authorizeApi(req, res, next) {
  res.set("Cache-Control", "no-store");
  const path = req.path;
  if (path === "/health" && req.method === "GET") return next();
  if (path.startsWith("/session/")) return next();

  const parts = path.split("/").filter(Boolean);
  const resource = parts[0];
  if (!methods[resource] || !methods[resource][req.method] ||
      !methods[resource][req.method].test("/" + parts.slice(1).join("/"))) {
    return res.status(404).json({ success: false, message: "API unavailable" });
  }

  return requireSession(req, res, () => {
    const userId = req.anonymousUserId;
    const requestedId = resource === "profile" ||
      (resource === "checkin" && req.method === "GET") ? parts[1] : null;
    if (requestedId && (!uuid.test(requestedId) || requestedId !== userId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    // Legacy body identity is accepted only when it matches the authenticated session.
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, "userId") &&
        req.body.userId !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const proceed = () => {
      // Existing route handlers receive only the verified identity.
      if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
        req.body = { ...req.body, userId };
      }
      if (resource !== "checkin" || !["PUT", "DELETE"].includes(req.method)) {
        return next();
      }
      const checkinId = parts[1];
      if (!uuid.test(checkinId)) return res.status(400).json({ success: false, message: "Invalid checkinId" });
      return pool.query(
        "SELECT checkin_id FROM daily_checkins WHERE checkin_id = $1 AND user_id = $2",
        [checkinId, userId]
      ).then(result => {
        if (!result.rowCount) return res.status(404).json({ success: false, message: "Check-in not found" });
        next();
      }).catch(next);
    };

    if (["GET", "HEAD"].includes(req.method)) return proceed();
    return requireAllowedOrigin(req, res, () => {
      if (!req.is("application/json")) {
        return res.status(415).json({ success: false, message: "JSON required" });
      }
      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return res.status(400).json({ success: false, message: "Invalid JSON body" });
      }
      proceed();
    });
  });
}

module.exports = authorizeApi;
