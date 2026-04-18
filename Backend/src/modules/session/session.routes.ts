import { Router, type Request, type Response } from "express";
import { sessionService } from "./session.service.js";
import db from "../../database/database.js";

const router: Router = Router();

router.get("/:code", async (req: Request, res: Response) => {
  const session = await sessionService.getSessionByCode(req.params.code as string);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (session.status === "ended") {
    res.status(410).json({ error: "Session has ended" });
    return;
  }
  res.json({
    sessionId: session.id,
    sessionCode: session.code,
    studentCount: await sessionService.getOnlineStudentCount(session.id as string),
    createdAt: session.created_at,
    status: session.status,
  });
});

router.get("/:id/students", async (req: Request, res: Response) => {
  const result = await db.execute({
    sql: `SELECT id, name, joined_at, is_online FROM students WHERE session_id = ?`,
    args: [req.params.id as string],
  });
  res.json({ students: result.rows });
});

export default router;