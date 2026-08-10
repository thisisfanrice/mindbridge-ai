require("dotenv").config();

const express = require("express");
const cors = require("cors");

const checkinRouter = require("./routes/checkin");
const userRoutes = require("./routes/users");
const analysisRoutes = require("./routes/analysis");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "MindBridge API is running",
  });
});

app.use("/api/checkin", checkinRouter);
app.use("/api/users", userRoutes);
app.use("/api/analysis", analysisRoutes);

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`MindBridge API running at http://localhost:${PORT}`);
});