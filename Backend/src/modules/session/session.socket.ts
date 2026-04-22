import { Server as SocketServer, Socket } from "socket.io";
import { sessionService } from "./session.service.js";
import { logsService } from "../logs/logs.service.js";
import { attendanceService } from "../attendance/attendance.service.js";
import db from "../../database/database.js";

// Track reconnect timers per session
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function registerSessionSocketEvents(io: SocketServer, socket: Socket): void {

  socket.on("session:create", async () => {
    const result = await sessionService.createSession(socket.id);
    socket.join(result.sessionId);
    socket.join(`${result.sessionId}:teacher`);
    socket.emit("session:created", result);
    await logsService.log(result.sessionId, "session_started");
    console.log(`[Session] Created: ${result.sessionCode}`);
  });

  // Teacher rejoins existing session after reload
  socket.on("session:rejoin", async ({ sessionId }: { sessionId: string }) => {
    const session = await sessionService.getSessionById(sessionId);

    if (!session || session.status === "ended") {
      socket.emit("session:rejoin-failed", { message: "Session no longer active" });
      return;
    }

    // Cancel pending disconnect timer
    const timer = disconnectTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      disconnectTimers.delete(sessionId);
      console.log(`[Session] Teacher rejoined ${session.code} — timer cancelled`);
    }

    // Update teacher socket ID
    // await sessionService.updateTeacherSocket(sessionId as string, socket.id as string);

    socket.join(sessionId);
    socket.join(`${sessionId}:teacher`);

    // Send session data back to teacher
    socket.emit("session:rejoined", {
      sessionId: session.id,
      sessionCode: session.code,
      lanUrl: `http://${(await import("../../utils/getLocalIP.js")).getLocalIP()}:${(await import("../../config/index.js")).config.port}/join/${session.code}`,
    });

    console.log(`[Session] Teacher rejoined session ${session.code}`);
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

    await markLeaveForAllStudents(sessionId);
    await sessionService.endSession(sessionId);
    await logsService.log(sessionId, "session_ended");
    io.to(sessionId).emit("session:ended", { message: "Teacher has ended the session" });
  });

  socket.on("disconnect", async () => {
    const session = await sessionService.getActiveSessionByTeacherSocket(socket.id);

    if (session) {
      const sessionId = session.id as string;
      console.log(`[Session] Teacher disconnected from ${session.code} — waiting 30s for rejoin`);

      // Notify students teacher is temporarily disconnected
      io.to(sessionId).emit("session:teacher-disconnected", {
        message: "Teacher disconnected. Waiting for reconnect...",
      });

      // Start grace period timer
      const timer = setTimeout(async () => {
        disconnectTimers.delete(sessionId);

        // Check if teacher already rejoined
        const currentSession = await sessionService.getSessionById(sessionId);
        if (currentSession?.status === "active") {
          await markLeaveForAllStudents(sessionId);
          await sessionService.endSession(sessionId);
          await logsService.log(sessionId, "session_ended", {
            data: { reason: "teacher_disconnected_timeout" },
          });
          io.to(sessionId).emit("session:ended", {
            message: "Teacher did not reconnect. Session ended.",
          });
          console.log(`[Session] ${session.code} ended — teacher did not rejoin in 30s`);
        }
      }, 30000); // 30 second grace period

      disconnectTimers.set(sessionId, timer);
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