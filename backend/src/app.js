require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authorizeApi = require("./middleware/authorizeApi");
const tutorRouter = require("./routes/tutor");
const conversationRouter = require("./routes/conversation");
const checkinRouter = require("./routes/checkin");

const analysisRoutes = require("./routes/analysis");
const profileRoutes = require("./routes/profile");

const sessionRouter = require("./routes/session");
const app = express();

const PORT = process.env.PORT || 3000;

// Explicit origins are required for credentialed browser requests.
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = (process.env.FRONTEND_ORIGINS || (
  isProduction ? "" : "http://127.0.0.1:3001,http://localhost:3001"
)).split(",").map(value => value.trim()).filter(Boolean);

if (isProduction && allowedOrigins.length === 0) {
  throw new Error("FRONTEND_ORIGINS must be configured in production");
}
if (allowedOrigins.some(origin => {
  try {
    const url = new URL(origin);
    return !["http:", "https:"].includes(url.protocol) ||
      url.origin !== origin || url.username || url.password ||
      (isProduction && url.protocol !== "https:");
  } catch { return true; }
})) {
  throw new Error("Invalid FRONTEND_ORIGINS");
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "MindBridge API is running",
  });
});

app.use("/api/session", sessionRouter);
app.use("/api", authorizeApi);
app.use("/api/conversation", conversationRouter);
app.use("/api/checkin", checkinRouter);

app.use("/api/analysis", analysisRoutes);
app.use("/api/profile", profileRoutes);

app.use("/api/tutor", tutorRouter);


app.use((err, req, res, next) => {
  console.error("API error:", err && err.code ? err.code : "internal");

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

if (require.main === module) app.listen(PORT, () => {
  console.log(`MindBridge API running at http://localhost:${PORT}`);
});
module.exports = app;
