import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import { config } from "./config/index.js";
import { initSocket } from "./sockets/index.js";
import { getLocalIP } from "./utils/getLocalIP.js";
import { initDatabase } from "./database/database.js";
import sessionRoutes from "./modules/session/session.routes.js";
import attendanceRoutes from "./modules/attendance/attendance.routes.js";
import filesRoutes from "./modules/files/files.routes.js";
import logsRoutes from "./modules/logs/logs.routes.js";
import quizRoutes from "./modules/quiz/quiz.routes.js";
import streamRoutes from "./modules/stream/stream.routes.js";
import { initMediasoup } from "./modules/sfu/sfu.manager.js";
import { fileURLToPath } from "url";

const app = express();
const httpServer = http.createServer(app);
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
app.use(cors());

// Skip body parsing for stream frame uploads
const isStreamFrame = (req: express.Request) =>
  req.originalUrl.includes("/api/stream/") &&
  req.originalUrl.includes("/frame") &&
  req.method === "POST";

app.use((req, res, next) => {
  if (isStreamFrame(req)) return next();
  express.json()(req, res, next);
});

app.use((req, res, next) => {
  if (isStreamFrame(req)) return next();
  express.urlencoded({ extended: true })(req, res, next);
});




app.use("/uploads", express.static(path.join(moduleDir, "..", config.uploadDir)));

app.use("/api/sessions", sessionRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/stream", streamRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "ClassNet server is running" });
});

initSocket(httpServer);
initMediasoup();
async function bootstrap() {
  await initDatabase();
  httpServer.listen(config.port, "0.0.0.0", () => {
    const localIP = getLocalIP();
    console.log("=================================");
    console.log("  🎓 ClassNet Server Started");
    console.log("=================================");
    console.log(`  Local:   http://localhost:${config.port}`);
    console.log(`  LAN:     http://${localIP}:${config.port}`);
    console.log("=================================");
  });
}

bootstrap();







