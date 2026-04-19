import { Router, type Request, type Response } from "express";
import { logsService } from "./logs.service.js";
import db from "../../database/database.js";

const router : Router = Router();

// GET /api/logs/sessions — all past sessions
router.get("/sessions", async (_req: Request, res: Response) => {
  const result = await db.execute({
    sql: `SELECT id, code, status, created_at, ended_at FROM sessions ORDER BY created_at DESC`,
    args: [],
  });
  res.json({ sessions: result.rows });
});

// GET /api/logs/:sessionId — all raw logs
router.get("/:sessionId", async (req: Request, res: Response) => {
  const logs = await logsService.getSessionLogs(req.params.sessionId as string);
  res.json({ logs });
});

// GET /api/logs/:sessionId/summary — full summary
router.get("/:sessionId/summary", async (req: Request, res: Response) => {
  const summary = await logsService.getSessionSummary(req.params.sessionId as string);
  res.json(summary);
});

export default router;