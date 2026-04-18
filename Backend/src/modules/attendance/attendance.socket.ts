import { Server as SocketServer, Socket } from "socket.io";
import { attendanceService } from "./attendance.service.js";

export function registerAttendanceSocketEvents(_io: SocketServer, socket: Socket): void {
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
}