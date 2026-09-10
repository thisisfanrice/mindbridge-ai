const express = require("express");
const profileRouter = require("./profile");
const {
  requireSession,
  requireAllowedOrigin,
} = require("./session");

const router = express.Router();

// Parallel, protected endpoint for migration testing.
// The existing Profile implementation remains the single source of truth.
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.use(requireSession);

router.use("/:userId", (req, res, next) => {
  if (req.params.userId !== req.anonymousUserId) {
    return res.status(403).json({
      success: false,
      message: "Profile does not belong to this session",
    });
  }
  next();
});

router.use("/:userId", (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") return next();
  if (req.method === "PUT") {
    return requireAllowedOrigin(req, res, () => {
      if (!req.is("application/json")) {
        return res.status(415).json({
          success: false,
          message: "JSON required",
        });
      }
      next();
    });
  }
  return res.status(405).json({
    success: false,
    message: "Method not allowed",
  });
});

router.use(profileRouter);

module.exports = router;
