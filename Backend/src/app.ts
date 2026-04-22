import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { initSocket } from "./sockets/index.js";
import { getLocalIP } from "./utils/getLocalIP.js";
import { config } from "./config/index.js";
import attendanceRoutes from "./modules/attendance/attendance.routes.js";
import sessionRoutes from "./modules/session/session.routes.js";
import filesRoutes from "./modules/files/files.routes.js";
import { initDatabase } from "./database/database.js";
import logsRoutes from "./modules/logs/logs.routes.js";
import quizRoutes from "./modules/quiz/quiz.routes.js";
import streamRoutes from "./modules/stream/stream.routes.js";

const app = express();
const httpServer = http.createServer(app);
const moduleDir = path.dirname(fileURLToPath(import.meta.url));


// --- Init Database ---
initDatabase();

// --- Middleware ---
app.use(cors());
app.use(express.raw({ type: "image/jpeg", limit: "2mb" }));

app.use((req, res, next) => {
  if (req.path.startsWith("/api/stream") && req.method === "POST") {
    return next(); // skip body parsing for stream frames
  }
  express.json()(req, res, next);
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/stream") && req.method === "POST") {
    return next();
  }
  express.urlencoded({ extended: true })(req, res, next);
});

// --- Static file serving (uploads) ---
app.use("/uploads", express.static(path.join(moduleDir, "..", config.uploadDir)));

app.use((req, res, next) => {
  if (req.headers['content-type'] === 'image/jpeg') {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      (req as any).rawBody = Buffer.concat(chunks);
      next();
    });
  } else {
    next();
  }
});


// --- Routes ---
app.use("/api/sessions", sessionRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/stream", streamRoutes);

// --- Health check ---
app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "ClassNet server is running" });
});


// --- Socket.io ---
initSocket(httpServer);

// --- Start server ---
httpServer.listen(config.port, "0.0.0.0", () => {
  const localIP = getLocalIP();
  console.log("=================================");
  console.log("  🎓 ClassNet Server Started");
  console.log("=================================");
  console.log(`  Local:   http://localhost:${config.port}`);
  console.log(`  LAN:     http://${localIP}:${config.port}`);
  console.log("=================================");
});