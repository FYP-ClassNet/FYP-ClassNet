import { Server as SocketServer, Socket } from "socket.io";
import db from "../../database/database.js";
import { sessionService } from "../session/session.service.js";

export function registerHandSocketEvents(io: SocketServer, socket: Socket): void {
  socket.on(
    "hand:raise",
    async ({ sessionId, studentId, studentName }: { sessionId: string; studentId: string; studentName: string }) => {
      const session = await sessionService.getSessionById(sessionId);
      if (!session || session.status === "ended") {
        socket.emit("error", { message: "Invalid session" });
        return;
      }

      const existing = await db.execute({
        sql: `SELECT 1 FROM raised_hands WHERE session_id = ? AND student_id = ?`,
        args: [sessionId, studentId],
      });
      if (existing.rows.length > 0) {
        socket.emit("hand:already-raised");
        return;
      }

      await db.execute({
        sql: `INSERT INTO raised_hands (student_id, session_id, student_name) VALUES (?, ?, ?)`,
        args: [studentId, sessionId, studentName],
      });

      const raisedAt = new Date();
      socket.emit("hand:raised", { raisedAt });
      io.to(`${sessionId}:teacher`).emit("hand:new", { studentId, studentName, sessionId, raisedAt });
    }
  );

  socket.on("hand:lower", async ({ sessionId, studentId }: { sessionId: string; studentId: string }) => {
    await db.execute({
      sql: `DELETE FROM raised_hands WHERE session_id = ? AND student_id = ?`,
      args: [sessionId, studentId],
    });
    socket.emit("hand:lowered");
    io.to(`${sessionId}:teacher`).emit("hand:dismissed", { studentId });
  });

  socket.on("hand:dismiss", async ({ sessionId, studentId }: { sessionId: string; studentId: string }) => {
    const session = await sessionService.getSessionById(sessionId);
    if (!session || session.teacher_socket_id !== socket.id) {
      socket.emit("error", { message: "Unauthorized" });
      return;
    }

    await db.execute({
      sql: `DELETE FROM raised_hands WHERE session_id = ? AND student_id = ?`,
      args: [sessionId, studentId],
    });

    const studentResult = await db.execute({
      sql: `SELECT socket_id FROM students WHERE id = ?`,
      args: [studentId],
    });
    const student = studentResult.rows[0];
    if (student) io.to(student.socket_id as string).emit("hand:dismissed-by-teacher");

    socket.emit("hand:dismissed", { studentId });
  });

  socket.on("hand:get-all", async ({ sessionId }: { sessionId: string }) => {
    const result = await db.execute({
      sql: `SELECT * FROM raised_hands WHERE session_id = ?`,
      args: [sessionId],
    });
    socket.emit("hand:list", { hands: result.rows });
  });

  socket.on("disconnect", async () => {
    const result = await db.execute({
      sql: `SELECT id, session_id FROM students WHERE socket_id = ? AND is_online = 1`,
      args: [socket.id],
    });
    const student = result.rows[0];
    if (student) {
      await db.execute({
        sql: `DELETE FROM raised_hands WHERE session_id = ? AND student_id = ?`,
        args: [student.session_id as string, student.id as string],
      });
      io.to(`${student.session_id}:teacher`).emit("hand:dismissed", { studentId: student.id });
    }
  });
}