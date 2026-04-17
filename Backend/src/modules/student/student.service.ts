import { v4 as uuidv4 } from "uuid";
import { sessionStore } from "../session/session.store.js";
import { type Student } from "../../types/session.types.js";
import { type JoinSessionPayload, type StudentJoinedResponse } from "../../types/student.types.js";

export const studentService = {
    joinSession(
        payload: JoinSessionPayload,
        socketId: string
    ): { success: true; data: StudentJoinedResponse } | { success: false; error: string } {
        const session = sessionStore.findByCode(payload.sessionCode.toUpperCase());

        if (!session) {
            return { success: false, error: "Session not found" };
        }

        if (session.status === "ended") {
            return { success: false, error: "Session has already ended" };
        }

        // Check for duplicate name in session
        const nameExists = Array.from(session.students.values()).some(
            (s) => s.name.toLowerCase() === payload.name.toLowerCase() && s.isOnline
        );

        if (nameExists) {
            return { success: false, error: "Name already taken in this session" };
        }

        const studentId = uuidv4();

        const student: Student = {
            id: studentId,
            name: payload.name.trim(),
            socketId,
            joinedAt: new Date(),
            isOnline: true,
        };

        session.students.set(studentId, student);
        sessionStore.save(session);

        console.log(`[Student] ${payload.name} joined session ${session.code}`);

        return {
            success: true,
            data: {
                studentId,
                name: student.name,
                sessionId: session.id,
                sessionCode: session.code,
            },
        };
    },

    leaveSession(socketId: string): { sessionId: string; studentName: string } | null {
        const sessions = sessionStore.getAll();

        for (const session of sessions) {
            for (const [, student] of session.students) {
                if (student.socketId === socketId && student.isOnline) {
                    student.isOnline = false;
                    sessionStore.save(session);
                    console.log(`[Student] ${student.name} left session ${session.code}`);
                    return { sessionId: session.id, studentName: student.name };
                }
            }
        }

        return null;
    },

    getStudentList(sessionId: string) {
        const session = sessionStore.findById(sessionId);
        if (!session) return [];

        return Array.from(session.students.values()).map((s) => ({
            id: s.id,
            name: s.name,
            joinedAt: s.joinedAt,
            isOnline: s.isOnline,
        }));
    },
};