import { type AttendanceRecord } from "../student/attendance.types.js";

// sessionId -> studentId -> AttendanceRecord
const store = new Map<string, Map<string, AttendanceRecord>>();

export const attendanceStore = {
  save(record: AttendanceRecord): void {
    if (!store.has(record.sessionId)) {
      store.set(record.sessionId, new Map());
    }
    store.get(record.sessionId)!.set(record.studentId, record);
  },

  findBySession(sessionId: string): AttendanceRecord[] {
    return Array.from(store.get(sessionId)?.values() ?? []);
  },

  findOne(sessionId: string, studentId: string): AttendanceRecord | undefined {
    return store.get(sessionId)?.get(studentId);
  },

  deleteSession(sessionId: string): void {
    store.delete(sessionId);
  },
};