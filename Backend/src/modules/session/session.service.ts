import { v4 as uuidv4 } from "uuid";
import { sessionStore } from "./session.store.js";
import { type Session, type CreateSessionPayload, type CreateSessionResponse } from "../../types/session.types.js";
import { getLocalIP } from "../../utils/getLocalIP.js";
import { config } from "../../config/index.js";

function generateSessionCode(): string {
  // 6-character alphanumeric code e.g. "A3F9K1"
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const sessionService = {
  createSession(payload: CreateSessionPayload): CreateSessionResponse {
    const sessionId = uuidv4();
    const sessionCode = generateSessionCode();
    const localIP = getLocalIP();

    const session: Session = {
      id: sessionId,
      code: sessionCode,
      teacherSocketId: payload.teacherSocketId,
      students: new Map(),
      createdAt: new Date(),
      status: "active",
    };

    sessionStore.save(session);

    console.log(`[Session] Created: ${sessionCode} (${sessionId})`);

    return {
      sessionId,
      sessionCode,
      lanUrl: `http://${localIP}:${config.port}/join/${sessionCode}`,
    };
  },

  getSession(sessionId: string): Session | undefined {
    return sessionStore.findById(sessionId);
  },

  getSessionByCode(code: string): Session | undefined {
    return sessionStore.findByCode(code);
  },

  endSession(sessionId: string): boolean {
    const session = sessionStore.findById(sessionId);
    if (!session) return false;

    session.status = "ended";
    sessionStore.save(session);

    console.log(`[Session] Ended: ${session.code} (${sessionId})`);
    return true;
  },

  getStudentCount(sessionId: string): number {
    const session = sessionStore.findById(sessionId);
    if (!session) return 0;
    return Array.from(session.students.values()).filter((s) => s.isOnline).length;
  },

  isTeacher(sessionId: string, socketId: string): boolean {
    const session = sessionStore.findById(sessionId);
    return session?.teacherSocketId === socketId;
  },
};
