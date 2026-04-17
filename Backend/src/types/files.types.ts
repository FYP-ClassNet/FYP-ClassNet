export type FileCategory = "pdf" | "image" | "video" | "document" | "other";

export interface SharedFile {
  id: string;
  sessionId: string;
  originalName: string;
  storedName: string;
  filePath: string;
  fileUrl: string;
  mimeType: string;
  category: FileCategory;
  sizeBytes: number;
  uploadedAt: Date;
}

export interface FileUploadedEvent {
  fileId: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  category: FileCategory;
  sizeBytes: number;
  uploadedAt: Date;
}