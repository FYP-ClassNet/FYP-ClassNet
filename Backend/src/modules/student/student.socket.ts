import { Server as SocketServer, Socket } from "socket.io";
import { studentService } from "./student.service.js";
import { type JoinSessionPayload } from "../../types/student.types.js";

export function registerStudentSocketEvents(io: SocketServer, socket: Socket): void {
  // Student joins a session
  socket.on("student:join", (payload: JoinSessionPayload) => {
    if (!payload.sessionCode || !payload.name?.trim()) {
      socket.emit("error", { message: "Session code and name are required" });
      return;
    }

    const result = studentService.joinSession(payload, socket.id);

    if (!result.success) {
      socket.emit("student:join-error", { message: result.error });
      return;
    }

    const { sessionId, studentId, name, sessionCode } = result.data;

    // Join student to session room
    socket.join(sessionId);

    // Confirm to student
    socket.emit("student:joined", result.data);

    // Get updated student list
    const studentList = studentService.getStudentList(sessionId);

    // Notify teacher with updated list
    io.to(`${sessionId}:teacher`).emit("session:student-list-updated", {
      studentList,
      event: "joined",
      student: { id: studentId, name },
    });

    console.log(`[Socket] ${name} joined session ${sessionCode}`);
  });

  // Student disconnects
  socket.on("disconnect", () => {
    const result = studentService.leaveSession(socket.id);

    if (result) {
      const studentList = studentService.getStudentList(result.sessionId);

      io.to(`${result.sessionId}:teacher`).emit("session:student-list-updated", {
        studentList,
        event: "left",
        student: { name: result.studentName },
      });
    }
  });
}