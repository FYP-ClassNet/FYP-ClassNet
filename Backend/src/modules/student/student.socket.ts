import { Server as SocketServer, Socket } from "socket.io";
import { studentService } from "./student.service.js";
import { logsService } from "../logs/logs.service.js";
import { attendanceService } from "../attendance/attendance.service.js";

export function registerStudentSocketEvents(io: SocketServer, socket: Socket): void {
  socket.on(
    "student:join",
    async ({ sessionCode, name, rollNumber }: { sessionCode: string; name: string; rollNumber: string }) => {
      if (!sessionCode || !name?.trim() || !rollNumber?.trim()) {
        socket.emit("error", { message: "Name, roll number and session code are required" });
        return;
      }

      const result = await studentService.joinSession(sessionCode, name, rollNumber, socket.id);
      if (!result.success) {
        socket.emit("student:join-error", { message: result.error });
        return;
      }

      const { sessionId, studentId, name: studentName, rollNumber: roll, sessionCode: code } = result.data!;

      socket.join(sessionId);
      socket.emit("student:joined", result.data);

      const studentList = await studentService.getStudentList(sessionId);
      io.to(`${sessionId}:teacher`).emit("session:student-list-updated", {
        studentList,
        event: "joined",
        student: { id: studentId, name: studentName, rollNumber: roll },
      });

      // Log join
      await logsService.log(sessionId, "student_joined", {
        studentId,
        studentName,
        rollNumber: roll,
      });

      console.log(`[Socket] ${studentName} (${roll}) joined session ${code}`);
    }
  );

socket.on("disconnect", async () => {
  const result = await studentService.leaveSession(socket.id);
  if (result) {
    // Mark leave time in attendance
    await attendanceService.markLeave(result.sessionId, result.studentId);

    const studentList = await studentService.getStudentList(result.sessionId);
    io.to(`${result.sessionId}:teacher`).emit("session:student-list-updated", {
      studentList,
      event: "left",
      student: { name: result.studentName, rollNumber: result.rollNumber },
    });

    await logsService.log(result.sessionId, "student_disconnected", {
      studentId: result.studentId,
      studentName: result.studentName,
      rollNumber: result.rollNumber,
    });
  }
});
}