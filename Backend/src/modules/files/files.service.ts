import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { filesStore } from "./files.store.js";
import { type SharedFile, type FileCategory, type FileUploadedEvent } from "../../types/files.types.js";
import { config } from "../../config/index.js";
import { getLocalIP } from "../../utils/getLocalIP.js";

function getCategory(mimeType: string): FileCategory {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (
    mimeType.includes("word") ||
    mimeType.includes("presentation") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("text")
  )
    return "document";
  return "other";
}

export const filesService = {
  saveFile(
    sessionId: string,
    originalName: string,
    storedName: string,
    mimeType: string,
    sizeBytes: number
  ): SharedFile {
    const fileId = uuidv4();
    const localIP = getLocalIP();

    const filePath = path.join(config.uploadDir, sessionId, storedName);
    const fileUrl = `http://${localIP}:${config.port}/uploads/${sessionId}/${storedName}`;

    const file: SharedFile = {
      id: fileId,
      sessionId,
      originalName,
      storedName,
      filePath,
      fileUrl,
      mimeType,
      category: getCategory(mimeType),
      sizeBytes,
      uploadedAt: new Date(),
    };

    filesStore.save(file);
    console.log(`[Files] Saved: ${originalName} for session ${sessionId}`);
    return file;
  },

  getSessionFiles(sessionId: string): SharedFile[] {
    return filesStore.findBySession(sessionId);
  },

  deleteFile(sessionId: string, fileId: string): boolean {
    const file = filesStore.findById(sessionId, fileId);
    if (!file) return false;

    // Remove from disk
    const fullPath = path.join(process.cwd(), file.filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    filesStore.deleteFile(sessionId, fileId);
    console.log(`[Files] Deleted: ${file.originalName}`);
    return true;
  },

  toEvent(file: SharedFile): FileUploadedEvent {
    return {
      fileId: file.id,
      originalName: file.originalName,
      fileUrl: file.fileUrl,
      mimeType: file.mimeType,
      category: file.category,
      sizeBytes: file.sizeBytes,
      uploadedAt: file.uploadedAt,
    };
  },
};