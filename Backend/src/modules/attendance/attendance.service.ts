import { v4 as uuidv4 } from "uuid";
import db from "../../database/database.js";
import type { AttendanceRecord, AttendanceStatus } from "../../types/attendance.types.js";

const LATE_THRESHOLD_MINUTES = 10;

function toAttendanceRecord(row: Record<string, unknown>, reconnectCountOverride?: number): AttendanceRecord {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    studentId: String(row.student_id),
    studentName: String(row.student_name),
    rollNumber: String(row.roll_number),
    joinedAt: new Date(String(row.joined_at)),
    leftAt: row.left_at ? new Date(String(row.left_at)) : null,
    status: String(row.status) as AttendanceStatus,
    reconnectCount: reconnectCountOverride ?? Number(row.reconnect_count ?? 0),
    totalOnlineSeconds: Number(row.total_online_seconds ?? 0),
  };
}


export const attendanceService = {
  async markJoin(sessionId: string, studentId: string, studentName: string, rollNumber: string): Promise<AttendanceRecord> {
    // Replace the time diff calculation with this:
    const sessionResult = await db.execute({
      sql: `SELECT created_at FROM sessions WHERE id = ?`,
      args: [sessionId],
    });
    const session = sessionResult.rows[0];
    const now = new Date();

    // Parse as UTC explicitly
    const sessionStart = session?.created_at
      ? new Date((session.created_at as string).replace(" ", "T") + "Z")
      : now;

    const diffMinutes = (now.getTime() - sessionStart.getTime()) / 1000 / 60;
    const status = diffMinutes > LATE_THRESHOLD_MINUTES ? "late" : "present";

    const existingResult = await db.execute({
      sql: `SELECT * FROM attendance WHERE session_id = ? AND student_id = ?`,
      args: [sessionId, studentId],
    });

    if (existingResult.rows.length > 0) {
      await db.execute({
        sql: `UPDATE attendance SET reconnect_count = reconnect_count + 1 WHERE session_id = ? AND student_id = ?`,
        args: [sessionId, studentId],
      });
      return {
        ...toAttendanceRecord(existingResult?.rows[0] as Record<string, unknown>, Number(existingResult?.rows[0]?.reconnect_count) + 1),
      };
    }

    const id = uuidv4();
    await db.execute({
      sql: `INSERT INTO attendance (id, session_id, student_id, student_name, roll_number, status)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, sessionId, studentId, studentName, rollNumber, status],
    });

    console.log(`[Attendance] ${studentName} (${rollNumber}) marked as ${status}`);
    return toAttendanceRecord({ id, session_id: sessionId, student_id: studentId, student_name: studentName, roll_number: rollNumber, status, reconnect_count: 0 });
  },

  async markLeave(sessionId: string, studentId: string): Promise<void> {
    const result = await db.execute({
      sql: `SELECT joined_at FROM attendance WHERE session_id = ? AND student_id = ?`,
      args: [sessionId, studentId],
    });
    const record = result.rows[0];
    if (!record) return;

    const now = new Date();
    // Parse UTC correctly
    const joinedAt = new Date((record.joined_at as string).replace(" ", "T") + "Z");
    const seconds = Math.floor((now.getTime() - joinedAt.getTime()) / 1000);

    await db.execute({
      sql: `UPDATE attendance
          SET left_at = CURRENT_TIMESTAMP, total_online_seconds = total_online_seconds + ?
          WHERE session_id = ? AND student_id = ?`,
      args: [seconds, sessionId, studentId],
    });
  },

  async getSummary(sessionId: string) {
    const result = await db.execute({
      sql: `SELECT * FROM attendance WHERE session_id = ?`,
      args: [sessionId],
    });
    const records = result.rows;
    return {
      total: records.length,
      present: records.filter((r) => r.status === "present").length,
      late: records.filter((r) => r.status === "late").length,
      absent: records.filter((r) => r.status === "absent").length,
      records,
    };
  },
};
