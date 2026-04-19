import { Server as SocketServer, Socket } from "socket.io";
import { sessionService } from "./session.service.js";
import { logsService } from "../logs/logs.service.js";
import { attendanceService } from "../attendance/attendance.service.js";
import db from "../../database/database.js";

export function registerSessionSocketEvents(io: SocketServer, socket: Socket): void {
  socket.on("session:create", async () => {
    const result = await sessionService.createSession(socket.id);
    socket.join(result.sessionId);
    socket.join(`${result.sessionId}:teacher`);
    socket.emit("session:created", result);
    await logsService.log(result.sessionId, "session_started");
  });

  socket.on("session:end", async ({ sessionId }: { sessionId: string }) => {
    const session = await sessionService.getSessionById(sessionId);
    if (!session) {
      socket.emit("error", { message: "Session not found" });
      return;
    }
    if (session.teacher_socket_id !== socket.id) {
      socket.emit("error", { message: "Only the teacher can end the session" });
      return;
    }

    // Mark leave for all still-online students
    await markLeaveForAllStudents(sessionId);

    await sessionService.endSession(sessionId);
    await logsService.log(sessionId, "session_ended");
    io.to(sessionId).emit("session:ended", { message: "Teacher has ended the session" });
  });

  socket.on("disconnect", async () => {
    const session = await sessionService.getActiveSessionByTeacherSocket(socket.id);
    if (session) {
      await markLeaveForAllStudents(session.id as string);
      await sessionService.endSession(session.id as string);
      await logsService.log(session.id as string, "session_ended", {
        data: { reason: "teacher_disconnected" },
      });
      io.to(session.id as string).emit("session:ended", {
        message: "Teacher disconnected. Session has ended.",
      });
    }
  });
}

async function markLeaveForAllStudents(sessionId: string) {
  const result = await db.execute({
    sql: `SELECT id FROM students WHERE session_id = ? AND is_online = 1`,
    args: [sessionId],
  });

  for (const student of result.rows) {
    await attendanceService.markLeave(sessionId, student.id as string);
  }
}