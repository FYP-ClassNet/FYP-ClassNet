import { Router, type Request, type Response } from "express";

const router : Router = Router();
const frames = new Map<string, Buffer>();

router.post("/:sessionId/frame", (req: Request, res: Response) => {
  const chunks: Buffer[] = [];

  req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  req.on("end", () => {
    const buf = Buffer.concat(chunks);
    console.log(`[Stream] Frame received for ${req.params.sessionId} — size: ${buf.length} bytes`);

    if (buf.length > 0) {
      frames.set(req.params.sessionId as string, buf);
      res.status(200).end();
    } else {
      console.warn(`[Stream] Empty frame received`);
      res.status(400).end();
    }
  });

  req.on("error", (err) => {
    console.error(`[Stream] Frame receive error:`, err);
    res.status(500).end();
  });
});

router.get("/:sessionId/frame", (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const frame = frames.get(sessionId as string);

  console.log(`[Stream] Frame requested for ${sessionId} — exists: ${!!frame} size: ${frame?.length ?? 0}`);

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
  console.log(`[Stream] Frame cleared for ${req.params.sessionId}`);
  res.json({ success: true });
});

export default router;