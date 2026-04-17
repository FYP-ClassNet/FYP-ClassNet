import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { filesService } from "./files.service.js";
import { config } from "../../config/index.js";
import { getIO } from "../../sockets/index.js";

const router: Router = Router();

function getSessionId(sessionId: string | string[] | undefined): string {
    if (typeof sessionId !== "string" || !sessionId.trim()) {
        throw new Error("sessionId is required");
    }

    return sessionId;
}

// Multer storage — organized by sessionId folder
const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const sessionId = getSessionId(req.params.sessionId);

        const uploadPath = path.join(process.cwd(), config.uploadDir, sessionId);

        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: config.maxFileSizeMB * 1024 * 1024 },
});

// POST /api/files/:sessionId/upload — teacher uploads file
router.post(
    "/:sessionId/upload",
    upload.single("file"),
    (req: Request, res: Response) => {
        const sessionId = getSessionId(req.params.sessionId);

        if (!req.file) {
            res.status(400).json({ error: "No file uploaded" });
            return;
        }

        const file = filesService.saveFile(
            sessionId,
            req.file.originalname,
            req.file.filename,
            req.file.mimetype,
            req.file.size
        );

        const event = filesService.toEvent(file);

        // Broadcast to all students in session
        try {
            const io = getIO();
            io.to(sessionId).emit("file:shared", event);
        } catch {
            console.warn("[Files] Socket not available for broadcast");
        }

        res.status(201).json(event);
    }
);

// GET /api/files/:sessionId — list all files in session
router.get("/:sessionId", (req: Request, res: Response) => {
    const sessionId = getSessionId(req.params.sessionId);
    const files = filesService.getSessionFiles(sessionId);
    res.json({ files: files.map(filesService.toEvent) });
});

// DELETE /api/files/:sessionId/:fileId — teacher deletes file
router.delete("/:sessionId/:fileId", (req: Request, res: Response) => {
    const sessionId = getSessionId(req.params.sessionId);
    const fileId = getSessionId(req.params.fileId);
    const deleted = filesService.deleteFile(sessionId, fileId);

    if (!deleted) {
        res.status(404).json({ error: "File not found" });
        return;
    }

    try {
        const io = getIO();
        io.to(sessionId).emit("file:deleted", { fileId });
    } catch {
        console.warn("[Files] Socket not available for broadcast");
    }

    res.json({ success: true });
});

export default router;