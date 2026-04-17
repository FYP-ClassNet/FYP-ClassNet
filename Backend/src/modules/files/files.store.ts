import { type SharedFile } from "../../types/files.types.js";

// sessionId -> fileId -> SharedFile
const store = new Map<string, Map<string, SharedFile>>();

export const filesStore = {
  save(file: SharedFile): void {
    if (!store.has(file.sessionId)) {
      store.set(file.sessionId, new Map());
    }
    store.get(file.sessionId)!.set(file.id, file);
  },

  findBySession(sessionId: string): SharedFile[] {
    return Array.from(store.get(sessionId)?.values() ?? []);
  },

  findById(sessionId: string, fileId: string): SharedFile | undefined {
    return store.get(sessionId)?.get(fileId);
  },

  deleteFile(sessionId: string, fileId: string): boolean {
    return store.get(sessionId)?.delete(fileId) ?? false;
  },
};