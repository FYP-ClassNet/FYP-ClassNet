import { Router, type Request, type Response } from "express";

const router : Router = Router();
const frames = new Map<string, Buffer>();

router.post("/:sessionId/frame", (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const chunks: Buffer[] = [];

  req.on("data", (chunk) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });

  req.on("end", () => {
    if (chunks.length === 0) {
      console.warn(`[Stream] No chunks received for ${sessionId}`);
      res.status(400).end();
      return;
    }

    const buf = Buffer.concat(chunks);
    console.log(`[Stream] Frame saved for ${sessionId} — ${buf.length} bytes`);
    frames.set(sessionId as string, buf);
    res.status(200).end();
  });

  req.on("error", (err) => {
    console.error(`[Stream] Error:`, err);
    res.status(500).end();
  });

  // Safety timeout — respond after 5s no matter what
  setTimeout(() => {
    if (!res.headersSent) {
      console.warn(`[Stream] Timeout — forcing response`);
      res.status(408).end();
    }
  }, 5000);
});

router.get("/:sessionId/frame", (req: Request, res: Response) => {
  const frame = frames.get(req.params.sessionId as string);
  if (!frame) {
    res.status(404).end();
    return;
  }
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.send(frame);
});

router.delete("/:sessionId/frame", (req: Request, res: Response) => {
  frames.delete(req.params.sessionId as string);
  res.json({ success: true });
});

export default router;