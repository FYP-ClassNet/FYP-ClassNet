import { v4 as uuidv4 } from "uuid";
import { attendanceStore } from "./attendance.store.js";
import { type AttendanceRecord, type AttendanceStatus, type AttendanceSummary } from "../student/attendance.types.js";
import { sessionStore } from "../session/session.store.js";

// Late threshold in minutes — can be made configurable later
const LATE_THRESHOLD_MINUTES = 10;

export const attendanceService = {
    markJoin(sessionId: string, studentId: string, studentName: string): AttendanceRecord {
        const session = sessionStore.findById(sessionId);
        const now = new Date();

        // Determine if late
        let status: AttendanceStatus = "present";
        if (session) {
            const sessionStartMs = new Date(session.createdAt).getTime();
            const joinedMs = now.getTime();
            const diffMinutes = (joinedMs - sessionStartMs) / 1000 / 60;

            if (diffMinutes > LATE_THRESHOLD_MINUTES) {
                status = "late";
            }
        }

        // Check if reconnecting
        const existing = attendanceStore.findOne(sessionId, studentId);
        if (existing) {
            existing.reconnectCount += 1;
            existing.status = existing.status === "late" ? "late" : status;
            attendanceStore.save(existing);
            console.log(`[Attendance] ${studentName} reconnected (x${existing.reconnectCount})`);
            return existing;
        }

        const record: AttendanceRecord = {
            id: uuidv4(),
            sessionId,
            studentId,
            studentName,
            joinedAt: now,
            leftAt: null,
            status,
            reconnectCount: 0,
            totalOnlineSeconds: 0,
        };

        attendanceStore.save(record);
        console.log(`[Attendance] ${studentName} marked as ${status}`);
        return record;
    },

    markLeave(sessionId: string, studentId: string): void {
        const record = attendanceStore.findOne(sessionId, studentId);
        if (!record) return;

        const now = new Date();
        record.leftAt = now;

        // Accumulate online time
        const joinMs = new Date(record.joinedAt).getTime();
        record.totalOnlineSeconds += Math.floor((now.getTime() - joinMs) / 1000);

        attendanceStore.save(record);
        console.log(`[Attendance] ${record.studentName} left — online ${record.totalOnlineSeconds}s`);
    },

    getSummary(sessionId: string): AttendanceSummary {
        const records = attendanceStore.findBySession(sessionId);

        return {
            total: records.length,
            present: records.filter((r) => r.status === "present").length,
            late: records.filter((r) => r.status === "late").length,
            absent: records.filter((r) => r.status === "absent").length,
            records,
        };
    },
};