import { v4 as uuidv4 } from "uuid";
import db from "../../database/database.js";
import { getLocalIP } from "../../utils/getLocalIP.js";
import { config } from "../../config/index.js";

export const sessionService = {
  async createSession(teacherSocketId: string) {
    const sessionId = uuidv4();
    const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const localIP = getLocalIP();

    await db.execute({
      sql: `INSERT INTO sessions (id, code, teacher_socket_id) VALUES (?, ?, ?)`,
      args: [sessionId, sessionCode, teacherSocketId],
    });

    console.log(`[Session] Created: ${sessionCode}`);
    return {
      sessionId,
      sessionCode,
      lanUrl: `http://${localIP}:${config.port}/join/${sessionCode}`,
    };
  },

  async getSessionById(sessionId: string) {
    const result = await db.execute({
      sql: `SELECT * FROM sessions WHERE id = ?`,
      args: [sessionId],
    });
    return result.rows[0] ?? null;
  },

  async getSessionByCode(code: string) {
    const result = await db.execute({
      sql: `SELECT * FROM sessions WHERE code = ?`,
      args: [code.toUpperCase()],
    });
    return result.rows[0] ?? null;
  },

  async endSession(sessionId: string): Promise<boolean> {
    const result = await db.execute({
      sql: `UPDATE sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'`,
      args: [sessionId],
    });
    return (result.rowsAffected ?? 0) > 0;
  },

  async getActiveSessionByTeacherSocket(socketId: string) {
    const result = await db.execute({
      sql: `SELECT * FROM sessions WHERE teacher_socket_id = ? AND status = 'active'`,
      args: [socketId],
    });
    return result.rows[0] ?? null;
  },

  async getOnlineStudentCount(sessionId: string): Promise<number> {
    const result = await db.execute({
      sql: `SELECT COUNT(*) as count FROM students WHERE session_id = ? AND is_online = 1`,
      args: [sessionId],
    });
    return Number(result.rows[0]?.count ?? 0);
  },
};