import { type Session } from "../../types/session.types.js";

// In-memory store: sessionId -> Session
const sessions = new Map<string, Session>();

// Secondary index: sessionCode -> sessionId (for fast lookup by code)
const codeIndex = new Map<string, string>();

export const sessionStore = {
  save(session: Session): void {
    sessions.set(session.id, session);
    codeIndex.set(session.code, session.id);
  },

  findById(sessionId: string): Session | undefined {
    return sessions.get(sessionId);
  },

  findByCode(code: string): Session | undefined {
    const sessionId = codeIndex.get(code);
    if (!sessionId) return undefined;
    return sessions.get(sessionId);
  },

  delete(sessionId: string): void {
    const session = sessions.get(sessionId);
    if (session) {
      codeIndex.delete(session.code);
      sessions.delete(sessionId);
    }
  },

  getAll(): Session[] {
    return Array.from(sessions.values());
  },
};
