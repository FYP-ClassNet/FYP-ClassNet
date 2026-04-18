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

const app = express();
const httpServer = http.createServer(app);
const moduleDir = path.dirname(fileURLToPath(import.meta.url));


// --- Init Database ---
initDatabase();

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Static file serving (uploads) ---
app.use("/uploads", express.static(path.join(moduleDir, "..", config.uploadDir)));


// --- Routes ---
app.use("/api/sessions", sessionRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/logs", logsRoutes);

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