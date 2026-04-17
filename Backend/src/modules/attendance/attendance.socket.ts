import { Server as SocketServer, Socket } from "socket.io";
import { attendanceService } from "./attendance.service.js";
import { sessionStore } from "../session/session.store.js";

export function registerAttendanceSocketEvents(_io: SocketServer, socket: Socket): void {
    // Called after student:join succeeds — mark attendance
    socket.on(
        "attendance:mark",
        ({ sessionId, studentId, studentName }: { sessionId: string; studentId: string; studentName: string }) => {
            const session = sessionStore.findById(sessionId);

            if (!session || session.status === "ended") {
                socket.emit("error", { message: "Invalid session" });
                return;
            }

            const record = attendanceService.markJoin(sessionId, studentId, studentName);

            // Send status back to student
            socket.emit("attendance:confirmed", {
                status: record.status,
                joinedAt: record.joinedAt,
                reconnectCount: record.reconnectCount,
            });
        }
    );
}