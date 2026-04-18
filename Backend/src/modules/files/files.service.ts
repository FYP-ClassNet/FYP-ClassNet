import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import db from "../../database/database.js";
import { config } from "../../config/index.js";
import { getLocalIP } from "../../utils/getLocalIP.js";

function getCategory(mimeType: string): string {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.includes("word") || mimeType.includes("presentation") || mimeType.includes("text")) return "document";
  return "other";
}

export const filesService = {
  async saveFile(sessionId: string, originalName: string, storedName: string, mimeType: string, sizeBytes: number) {
    const fileId = uuidv4();
    const localIP = getLocalIP();
    const filePath = path.join(config.uploadDir, sessionId, storedName);
    const fileUrl = `http://${localIP}:${config.port}/uploads/${sessionId}/${storedName}`;
    const category = getCategory(mimeType);

    await db.execute({
      sql: `INSERT INTO files (id, session_id, original_name, stored_name, file_path, file_url, mime_type, category, size_bytes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [fileId, sessionId, originalName, storedName, filePath, fileUrl, mimeType, category, sizeBytes],
    });

    const result = await db.execute({
      sql: `SELECT * FROM files WHERE id = ?`,
      args: [fileId],
    });
    return result.rows[0];
  },

  async getSessionFiles(sessionId: string) {
    const result = await db.execute({
      sql: `SELECT * FROM files WHERE session_id = ?`,
      args: [sessionId],
    });
    return result.rows;
  },

  async deleteFile(sessionId: string, fileId: string): Promise<boolean> {
    const result = await db.execute({
      sql: `SELECT * FROM files WHERE id = ? AND session_id = ?`,
      args: [fileId, sessionId],
    });
    const file = result.rows[0];
    if (!file) return false;

    const fullPath = path.join(process.cwd(), file.file_path as string);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    await db.execute({ sql: `DELETE FROM files WHERE id = ?`, args: [fileId] });
    return true;
  },

  toEvent(file: any) {
    return {
      fileId: file.id,
      originalName: file.original_name,
      fileUrl: file.file_url,
      mimeType: file.mime_type,
      category: file.category,
      sizeBytes: file.size_bytes,
      uploadedAt: file.uploaded_at,
    };
  },
};