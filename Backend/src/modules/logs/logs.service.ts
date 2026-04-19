import { v4 as uuidv4 } from "uuid";
import db from "../../database/database.js";

export type LogEventType =
  | "session_started"
  | "session_ended"
  | "student_joined"
  | "student_disconnected"
  | "student_reconnected"
  | "file_shared"
  | "hand_raised"
  | "hand_dismissed";

export const logsService = {
  async log(
    sessionId: string,
    eventType: LogEventType,
    extra?: {
      studentId?: string;
      studentName?: string;
      rollNumber?: string;
      data?: Record<string, unknown>;
    }
  ): Promise<void> {
    await db.execute({
      sql: `INSERT INTO activity_logs (id, session_id, student_id, roll_number, student_name, event_type, event_data)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        uuidv4(),
        sessionId,
        extra?.studentId ?? null,
        extra?.rollNumber ?? null,
        extra?.studentName ?? null,
        eventType,
        extra?.data ? JSON.stringify(extra.data) : null,
      ],
    });
  },

  async getSessionLogs(sessionId: string) {
    const result = await db.execute({
      sql: `SELECT * FROM activity_logs WHERE session_id = ? ORDER BY timestamp ASC`,
      args: [sessionId],
    });
    return result.rows;
  },

async getSessionSummary(sessionId: string) {
  // Session info
  const sessionResult = await db.execute({
    sql: `SELECT * FROM sessions WHERE id = ?`,
    args: [sessionId],
  });
  const session = sessionResult.rows[0];

  // Attendance records
  const attendanceResult = await db.execute({
    sql: `SELECT * FROM attendance WHERE session_id = ? ORDER BY joined_at ASC`,
    args: [sessionId],
  });
  const records = attendanceResult.rows;

  // Average online time
  const avgResult = await db.execute({
    sql: `SELECT AVG(total_online_seconds) as avg_seconds FROM attendance WHERE session_id = ?`,
    args: [sessionId],
  });
  const avgSeconds = Number(avgResult.rows[0]?.avg_seconds ?? 0);

  // Class duration
  const startedAt = session?.created_at
    ? new Date((session.created_at as string).replace(" ", "T") + "Z")
    : null;
  const endedAt = session?.ended_at
    ? new Date((session.ended_at as string).replace(" ", "T") + "Z")
    : new Date();
  const classDurationSeconds = startedAt
    ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
    : 0;

  // Quizzes for this session
  const quizzesResult = await db.execute({
    sql: `SELECT * FROM quizzes WHERE session_id = ? ORDER BY created_at ASC`,
    args: [sessionId],
  });
  const quizzes = quizzesResult.rows;

  // For each quiz get results
  const quizReports = [];
  for (const quiz of quizzes) {
    if (quiz.mode === "csv") {
      // CSV quiz results
      const answersResult = await db.execute({
        sql: `SELECT DISTINCT student_id, student_name, roll_number FROM quiz_answers WHERE quiz_id = ?`,
        args: [quiz.id],
      });

      const studentResults = [];
      for (const student of answersResult.rows) {
        const statsResult = await db.execute({
          sql: `SELECT
                  COUNT(*) as total_answered,
                  SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as total_correct
                FROM quiz_answers
                WHERE quiz_id = ? AND student_id = ?`,
          args: [quiz.id, student.student_id],
        });
        const stats = statsResult.rows[0];
        const totalCorrect = Number(stats?.total_correct ?? 0);
        const totalAnswered = Number(stats?.total_answered ?? 0);
        const scorePercent = Math.round((totalCorrect / Number(quiz.total_questions)) * 100);

        studentResults.push({
          studentName: student.student_name,
          rollNumber: student.roll_number,
          totalCorrect,
          totalAnswered,
          totalQuestions: quiz.total_questions,
          scorePercent,
        });
      }

      quizReports.push({
        quizId: quiz.id,
        title: quiz.title,
        mode: "csv",
        totalQuestions: quiz.total_questions,
        status: quiz.status,
        createdAt: quiz.created_at,
        results: studentResults.sort((a, b) => b.scorePercent - a.scorePercent),
      });
    } else {
      // Oral quiz results
      const gradesResult = await db.execute({
        sql: `SELECT * FROM oral_grades WHERE quiz_id = ? ORDER BY marks_obtained DESC`,
        args: [quiz.id as string  ],
      });

      quizReports.push({
        quizId: quiz.id,
        title: quiz.title,
        mode: "oral",
        totalMarks: quiz.total_questions, // reused field
        status: quiz.status,
        createdAt: quiz.created_at,
        results: gradesResult.rows.map((g) => ({
          studentName: g.student_name,
          rollNumber: g.roll_number,
          marksObtained: g.marks_obtained,
          totalMarks: g.total_marks,
          remarks: g.remarks,
          scorePercent: Math.round((Number(g.marks_obtained) / Number(g.total_marks)) * 100),
        })),
      });
    }
  }

  return {
    sessionId,
    sessionCode: session?.code,
    status: session?.status,
    startedAt: session?.created_at,
    endedAt: session?.ended_at,
    classDurationSeconds,
    classDurationFormatted: formatSeconds(classDurationSeconds),
    totalStudents: records.length,
    present: records.filter((r) => r.status === "present").length,
    late: records.filter((r) => r.status === "late").length,
    averageAttendanceSeconds: Math.floor(avgSeconds),
    averageAttendanceFormatted: formatSeconds(Math.floor(avgSeconds)),
    students: records.map((r) => ({
      studentId: r.student_id,
      student_name: r.student_name,
      roll_number: r.roll_number,
      status: r.status,
      joined_at: r.joined_at,
      left_at: r.left_at,
      total_online_seconds: r.total_online_seconds,
      totalOnlineFormatted: formatSeconds(Number(r.total_online_seconds)),
      reconnect_count: r.reconnect_count,
    })),
    quizzes: quizReports,
  };
}
};

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}