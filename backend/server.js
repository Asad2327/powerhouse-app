require('dotenv').config();

const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

server.keepAliveTimeout = 60000;
server.headersTimeout = 65000;

// ==========================
// 🔥 GLOBAL ERROR HANDLING
// ==========================
process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("🔥 UNHANDLED REJECTION:", err);
});

// ==========================
// 🌐 FRONTEND URL
// ==========================
const FRONTEND_URL = process.env.FRONTEND_URL;

const allowedOrigins = [
  "http://localhost:5173",
  FRONTEND_URL,
  "https://powerhouse-app-eight.vercel.app",
  "https://www.powerhouse-app-eight.vercel.app"
].filter(Boolean);

// ==========================
// 🔥 SOCKET SETUP
// ==========================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  },
  transports: ["websocket", "polling"]
});

app.set("io", io);

// ==========================
// 🔌 SOCKET CONNECTION
// ==========================
io.on("connection", (socket) => {
  console.log("⚡ Client connected:", socket.id);

  socket.onAny((event, ...args) => {
    console.log("📡 EVENT:", event, args);
  });

  socket.on("joinUser", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User joined room: user_${userId}`);
  });

  socket.emit("connected", "Welcome Client ✅");

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// ==========================
// 📦 ROUTES IMPORT
// ==========================
const userRoutes = require("./routes/user");
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/task");
const activityRoutes = require("./routes/activity");
const toolsRoutes = require("./routes/tools");

// ==========================
// 🧠 MIDDLEWARES
// ==========================
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// ✅ FIXED PREFLIGHT (IMPORTANT)
app.options("*", (req, res) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, role");
  res.header("Access-Control-Allow-Credentials", "true");
  return res.sendStatus(200);
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ==========================
// 📁 STATIC FILES
// ==========================
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use("/uploads", express.static(uploadDir));

// ==========================
// 🚀 API ROUTES
// ==========================
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/task", taskRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/tools", toolsRoutes);

// ==========================
// 🧪 DB TEST ROUTE (FIXED POSITION)
// ==========================
app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT 1");
    res.json({ success: true, msg: "DB OK" });
  } catch (err) {
    console.error("DB TEST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// ❤️ HEALTH CHECK
// ==========================
app.get("/", (req, res) => {
  res.send("🚀 PowerHouse API Running...");
});

// ==========================
// ❌ ERROR HANDLER
// ==========================
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err);

  res.status(500).json({
    success: false,
    msg: err.message || "Something went wrong",
  });
});

// ==========================
// 🚀 START SERVER
// ==========================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});