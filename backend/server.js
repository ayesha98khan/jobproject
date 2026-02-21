require("dotenv").config();
const required = ["JWT_SECRET", "MONGODB_URI"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing environment variable: ${key}`);
    process.exit(1);
  }
}
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./db");

const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth");
const jobRoutes = require("./routes/jobs");
// Global error handler (keep this after routes)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Something went wrong",
  });
});

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true
  })
);

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);

const PORT = Number(process.env.PORT || 5000);

(async () => {
  try {
    await connectDB(
      process.env.MONGODB_URI,
      process.env.MONGODB_DB || "jobproject"
    );

    app.listen(PORT, () => {
      console.log(`✅ Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
})();
