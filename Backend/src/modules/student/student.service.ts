import { v4 as uuidv4 } from "uuid";
import db from "../../database/database.js";

export const studentService = {
  async joinSession(sessionCode: string, name: string, rollNumber: string, socketId: string) {
    const sessionResult = await db.execute({
      sql: `SELECT * FROM sessions WHERE code = ? AND status = 'active'`,
      args: [sessionCode.toUpperCase()],
    });
    const session = sessionResult.rows[0];
    if (!session) return { success: false, error: "Session not found or ended" };

    // Check duplicate name
    // Change duplicate name check to this:
    const dupName = await db.execute({
      sql: `SELECT id FROM students 
        WHERE session_id = ? 
        AND LOWER(name) = LOWER(?) 
        AND is_online = 1
        AND roll_number != ?`,
      args: [session.id as string, name, rollNumber.trim()],
    });
    if (dupName.rows.length > 0) return { success: false, error: "Name already taken in this session" };

    // Check duplicate roll number
    const dupRoll = await db.execute({
      sql: `SELECT id FROM students WHERE session_id = ? AND roll_number = ?`,
      args: [session.id as string, rollNumber.trim()],
    });
    if (dupRoll.rows.length > 0) return { success: false, error: "Roll number already used in this session" };

    const studentId = uuidv4();
    await db.execute({
      sql: `INSERT INTO students (id, session_id, name, roll_number, socket_id) VALUES (?, ?, ?, ?, ?)`,
      args: [studentId, session.id as string, name.trim(), rollNumber.trim(), socketId],
    });

    console.log(`[Student] ${name} (${rollNumber}) joined session ${session.code}`);
    return {
      success: true,
      data: {
        studentId,
        name: name.trim(),
        rollNumber: rollNumber.trim(),
        sessionId: session.id as string,
        sessionCode: session.code as string,
      },
    };
  },

  async leaveSession(socketId: string) {
    const result = await db.execute({
      sql: `SELECT s.*, ss.id as sess_id, ss.code as sess_code
          FROM students s
          JOIN sessions ss ON ss.id = s.session_id
          WHERE s.socket_id = ? AND s.is_online = 1`,
      args: [socketId],
    });
    const student = result.rows[0];
    if (!student) return null;

    // Use id directly — more reliable than socketId
    await db.execute({
      sql: `UPDATE students SET is_online = 0 WHERE id = ?`,
      args: [student.id as string],
    });

    return {
      sessionId: student.sess_id as string,
      studentId: student.id as string,
      studentName: student.name as string,
      rollNumber: student.roll_number as string,
    };
  },

  async getStudentList(sessionId: string) {
    const result = await db.execute({
      sql: `SELECT id, name, roll_number, joined_at, is_online FROM students WHERE session_id = ?`,
      args: [sessionId],
    });
    return result.rows;
  },
};