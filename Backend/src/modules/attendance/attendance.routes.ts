import { Router, type Request, type Response } from "express";
import { attendanceService } from "./attendance.service.js";

const router: Router = Router();

// GET /api/attendance/:sessionId — get full attendance summary
router.get("/:sessionId", (req: Request<{ sessionId: string }>, res: Response) => {
    const { sessionId } = req.params;

    if (!sessionId) {
        res.status(400).json({ error: "sessionId is required" });
        return;
    }

    const summary = attendanceService.getSummary(sessionId);
    res.json(summary);
});

export default router;