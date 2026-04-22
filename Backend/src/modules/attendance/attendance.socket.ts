import { Server as SocketServer, Socket } from "socket.io";
import { attendanceService } from "./attendance.service.js";
import db from "../../database/database.js";

export function registerAttendanceSocketEvents(io: SocketServer, socket: Socket): void {
  // Auto mark on join
  socket.on(
    "attendance:mark",
    async ({
      sessionId,
      studentId,
      studentName,
      rollNumber,
    }: {
      sessionId: string;
      studentId: string;
      studentName: string;
      rollNumber: string;
    }) => {
      const record = await attendanceService.markJoin(sessionId, studentId, studentName, rollNumber);
      socket.emit("attendance:confirmed", {
        status: record.status,
        joinedAt: record.joinedAt,
        reconnectCount: record.reconnectCount,
      });
    }
  );

  // Teacher manually overrides attendance
  socket.on(
    "attendance:override",
    async ({
      sessionId,
      studentId,
      status,
    }: {
      sessionId: string;
      studentId: string;
      status: string;
    }) => {
      if (!["present", "late", "absent"].includes(status)) {
        socket.emit("error", { message: "Invalid status" });
        return;
      }

      await db.execute({
        sql: `UPDATE attendance SET status = ? WHERE session_id = ? AND student_id = ?`,
        args: [status, sessionId, studentId],
      });

      console.log(`[Attendance] Override via socket: ${studentId} → ${status}`);

      // Confirm back to teacher
      socket.emit("attendance:override-confirmed", { studentId, status });

      // Notify the specific student their status changed
      const studentResult = await db.execute({
        sql: `SELECT socket_id FROM students WHERE id = ? AND is_online = 1`,
        args: [studentId],
      });

      const student = studentResult.rows[0];
      if (student) {
        io.to(student.socket_id as string).emit("attendance:status-updated", { status });
      }
    }
  );
}