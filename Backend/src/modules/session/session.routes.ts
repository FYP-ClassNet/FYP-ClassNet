import { Router, type Request, type Response } from "express";
import { sessionService } from "./session.service.js";
import { sessionStore } from "./session.store.js";

const router: Router = Router();

// GET /api/sessions/:code — get session info by code (used by student join page)
router.get("/:code", (req: Request, res: Response) => {
  const { code } = req.params;
  const session = sessionService.getSessionByCode(typeof code === 'string' ? code.toUpperCase() : '');

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
    studentCount: sessionService.getStudentCount(session.id),
    createdAt: session.createdAt,
    status: session.status,
  });
});

// GET /api/sessions/:id/students — get all students in session
router.get("/:id/students", (req: Request, res: Response) => {
  const session = sessionStore.findById(typeof req.params.id === 'string' ? req.params.id : '');

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const students = Array.from(session.students.values()).map((s) => ({
    id: s.id,
    name: s.name,
    joinedAt: s.joinedAt,
    isOnline: s.isOnline,
  }));

  res.json({ students });
});

export default router;
