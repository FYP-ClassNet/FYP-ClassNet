export type AttendanceStatus = "present" | "late" | "absent";

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  joinedAt: Date;
  leftAt: Date | null;
  status: AttendanceStatus;
  reconnectCount: number;
  totalOnlineSeconds: number;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  late: number;
  absent: number;
  records: AttendanceRecord[];
}