import { Router, type Request, type Response } from "express";
import { attendanceService } from "./attendance.service.js";

const router : Router = Router();

router.get("/:sessionId", async (req: Request, res: Response) => {
  const summary = await attendanceService.getSummary(req.params.sessionId as string);
  res.json(summary);
});

export default router;