import { Server as SocketServer, Socket } from "socket.io";
import { sessionService } from "./session.service.js";
import { sessionStore } from "./session.store.js";

export function registerSessionSocketEvents(io: SocketServer, socket: Socket): void {
  // Teacher creates a session
  socket.on("session:create", () => {
    const result = sessionService.createSession({
      teacherSocketId: socket.id,
    });

    socket.join(result.sessionId);
    socket.join(`${result.sessionId}:teacher`);

    socket.emit("session:created", result);
    console.log(`[Socket] Teacher ${socket.id} created session ${result.sessionCode}`);
  });

  // Teacher ends the session
  socket.on("session:end", ({ sessionId }: { sessionId: string }) => {
    const session = sessionService.getSession(sessionId);

    if (!session) {
      socket.emit("error", { message: "Session not found" });
      return;
    }

    if (session.teacherSocketId !== socket.id) {
      socket.emit("error", { message: "Only the teacher can end the session" });
      return;
    }

    sessionService.endSession(sessionId);
    io.to(sessionId).emit("session:ended", { message: "Teacher has ended the session" });
    console.log(`[Socket] Session ${session.code} ended by teacher`);
  });

  // Handle teacher disconnect
  socket.on("disconnect", () => {
    const sessions = sessionStore.getAll();

    for (const session of sessions) {
      if (session.teacherSocketId === socket.id && session.status === "active") {
        sessionService.endSession(session.id);
        io.to(session.id).emit("session:ended", {
          message: "Teacher disconnected. Session has ended.",
        });
        console.log(`[Socket] Session ${session.code} ended due to teacher disconnect`);
      }
    }
  });
}
