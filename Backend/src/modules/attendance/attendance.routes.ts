import { Router, type Request, type Response } from "express";
import { attendanceService } from "./attendance.service.js";
import db from "../../database/database.js";

const router : Router = Router();

// GET /api/attendance/:sessionId
router.get("/:sessionId", async (req: Request, res: Response) => {
  const summary = await attendanceService.getSummary(req.params.sessionId as string);
  res.json(summary);
});

// PATCH /api/attendance/:sessionId/:studentId — manual override
router.patch("/:sessionId/:studentId", async (req: Request, res: Response) => {
  const { sessionId, studentId } = req.params;
  const { status } = req.body;

  if (!["present", "late", "absent"].includes(status)) {
    res.status(400).json({ error: "Invalid status. Must be present, late or absent" });
    return;
  }

  const result = await db.execute({
    sql: `UPDATE attendance SET status = ? WHERE session_id = ? AND student_id = ?`,
    args: [status, sessionId, studentId],
  });

  if ((result.rowsAffected ?? 0) === 0) {
    res.status(404).json({ error: "Attendance record not found" });
    return;
  }

  console.log(`[Attendance] Manual override: ${studentId} → ${status}`);
  res.json({ success: true, studentId, status });
});

export default router;