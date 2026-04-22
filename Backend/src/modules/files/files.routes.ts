import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { filesService } from "./files.service.js";
import { config } from "../../config/index.js";
import { getIO } from "../../sockets/index.js";

const router: Router = Router();

const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const uploadPath = path.join(process.cwd(), config.uploadDir, req.params.sessionId as string);
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    },
});

const upload = multer({ storage, limits: { fileSize: config.maxFileSizeMB * 1024 * 1024 } });

router.post("/:sessionId/upload", upload.single("file"), async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
    }

    const file = await filesService.saveFile(
        req.params.sessionId as string,
        req.file.originalname,
        req.file.filename,
        req.file.mimetype,
        req.file.size
    );

    const event = filesService.toEvent(file);

    try {
        getIO().to(req.params.sessionId as string).emit("file:shared", event);
    } catch {
        console.warn("[Files] Socket not available");
    }

    res.status(201).json(event);
});

router.get("/:sessionId", async (req: Request, res: Response) => {
    const files = await filesService.getSessionFiles(req.params.sessionId as string);
    res.json({ files: files.map(filesService.toEvent) });
});

router.delete("/:sessionId/:fileId", async (req: Request, res: Response) => {
    const deleted = await filesService.deleteFile(req.params.sessionId as string, req.params.fileId as string);
    if (!deleted) {
        res.status(404).json({ error: "File not found" });
        return;
    }

    try {
        getIO().to(req.params.sessionId as string).emit("file:deleted", { fileId: req.params.fileId as string });
    } catch {
        console.warn("[Files] Socket not available");
    }

    res.json({ success: true });
});

export default router;