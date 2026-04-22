import { v4 as uuidv4 } from "uuid";
import db from "../../database/database.js";
import type { QuizQuestion, QuizResult } from "../../types/quiz.types.js";

export const quizService = {


    // Create CSV quiz — questions parsed from CSV
    async createCsvQuiz(
        sessionId: string,
        title: string,
        questions: Omit<QuizQuestion, "id" | "quizId">[]
    ) {
        const quizId = uuidv4();

        await db.execute({
            sql: `INSERT INTO quizzes (id, session_id, title, mode, total_questions)
            VALUES (?, ?, ?, 'csv', ?)`,
            args: [quizId, sessionId, title, questions.length],
        });

        for (const q of questions) {
            await db.execute({
                sql: `INSERT INTO quiz_questions
              (id, quiz_id, question_number, question_text, option_a, option_b, option_c, option_d, correct_option)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    uuidv4(),
                    quizId,
                    q.questionNumber,
                    q.questionText,
                    q.optionA,
                    q.optionB,
                    q.optionC,
                    q.optionD,
                    q.correctOption,
                ],
            });
        }

        const quiz = await quizService.getQuiz(quizId);
        const qs = await quizService.getQuestions(quizId);
        console.log(`[Quiz] CSV quiz created: ${title} (${questions.length} questions)`);
        return { quiz, questions: qs };
    },

    async getQuiz(quizId: string) {
        const result = await db.execute({
            sql: `SELECT * FROM quizzes WHERE id = ?`,
            args: [quizId],
        });
        return result.rows[0] ?? null;
    },

    async getActiveQuizBySession(sessionId: string) {
        const result = await db.execute({
            sql: `SELECT * FROM quizzes 
          WHERE session_id = ? 
          AND status = 'active' 
          ORDER BY created_at DESC LIMIT 1`,
            args: [sessionId],
        });
        return result.rows[0] ?? null;
    },

    async getQuestions(quizId: string) {
        const result = await db.execute({
            sql: `SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY question_number ASC`,
            args: [quizId],
        });
        return result.rows;
    },

    // For students — questions without correct_option revealed
    async getQuestionsForStudent(quizId: string) {
        const result = await db.execute({
            sql: `SELECT id, quiz_id, question_number, question_text, option_a, option_b, option_c, option_d
            FROM quiz_questions WHERE quiz_id = ? ORDER BY question_number ASC`,
            args: [quizId],
        });
        return result.rows;
    },

    async submitAnswer(
        quizId: string,
        questionId: string,
        studentId: string,
        studentName: string,
        rollNumber: string,
        selectedOption: string
    ) {
        // Get correct answer if CSV mode
        const qResult = await db.execute({
            sql: `SELECT correct_option FROM quiz_questions WHERE id = ?`,
            args: [questionId],
        });
        const correctOption = qResult.rows[0]?.correct_option as string | null;

        const isCorrect =
            correctOption !== null
                ? selectedOption.toUpperCase() === correctOption.toUpperCase()
                    ? 1
                    : 0
                : null;

        // Upsert — student can change answer before quiz ends
        await db.execute({
            sql: `INSERT INTO quiz_answers (id, quiz_id, question_id, student_id, student_name, roll_number, selected_option, is_correct)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(quiz_id, question_id, student_id)
            DO UPDATE SET selected_option = excluded.selected_option,
                          is_correct = excluded.is_correct,
                          answered_at = CURRENT_TIMESTAMP`,
            args: [
                uuidv4(),
                quizId,
                questionId,
                studentId,
                studentName,
                rollNumber,
                selectedOption.toUpperCase(),
                isCorrect,
            ],
        });

        return { isCorrect };
    },

    async endQuiz(quizId: string): Promise<boolean> {
        const result = await db.execute({
            sql: `UPDATE quizzes SET status = 'ended', ended_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'active'`,
            args: [quizId],
        });
        return (result.rowsAffected ?? 0) > 0;
    },

    async getResults(quizId: string): Promise<QuizResult[]> {
        const quiz = await quizService.getQuiz(quizId);
        if (!quiz) return [];

        const questions = await quizService.getQuestions(quizId);
        const totalQuestions = questions.length;

        // Get all students who participated
        const studentsResult = await db.execute({
            sql: `SELECT DISTINCT student_id, student_name, roll_number FROM quiz_answers WHERE quiz_id = ?`,
            args: [quizId],
        });

        const results: QuizResult[] = [];

        for (const student of studentsResult.rows) {
            const answersResult = await db.execute({
                sql: `SELECT qa.*, qq.question_number, qq.question_text, qq.correct_option
              FROM quiz_answers qa
              JOIN quiz_questions qq ON qq.id = qa.question_id
              WHERE qa.quiz_id = ? AND qa.student_id = ?
              ORDER BY qq.question_number ASC`,
                args: [quizId as string, student.student_id as string],
            });

            const answers = answersResult.rows;
            const totalAnswered = answers.length;
            const totalCorrect = answers.filter((a) => a.is_correct === 1).length;
            const totalWrong = answers.filter((a) => a.is_correct === 0).length;
            const totalUnanswered = totalQuestions - totalAnswered;
            const scorePercent =
                quiz.mode === "csv"
                    ? Math.round((totalCorrect / totalQuestions) * 100)
                    : Math.round((totalAnswered / totalQuestions) * 100);

            results.push({
                studentId: student.student_id as string,
                studentName: student.student_name as string,
                rollNumber: student.roll_number as string,
                totalAnswered,
                totalCorrect,
                totalWrong,
                totalUnanswered,
                scorePercent,
                answers: answers.map((a) => ({
                    questionNumber: a.question_number as number,
                    questionText: a.question_text as string | null,
                    selectedOption: a.selected_option as string,
                    correctOption: a.correct_option as string | null,
                    isCorrect: a.is_correct === null ? null : a.is_correct === 1,
                })),
            });
        }

        // Sort by score descending
        return results.sort((a, b) => b.scorePercent - a.scorePercent);
    },

    // Parse CSV string into questions
    parseCsv(csvText: string): Omit<QuizQuestion, "id" | "quizId">[] {
        const lines = csvText.trim().split("\n");
        if (lines.length === 0) return []
            ;
        const questions: Omit<QuizQuestion, "id" | "quizId">[] = [];

        // Skip header row if it contains "question" text
        const startIndex =
            lines[0]!.toLowerCase().includes("question") ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const cols = lines[i]!.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
            if (cols.length < 5) continue;

            questions.push({
                questionNumber: questions.length + 1,
                questionText: cols[0] || null,
                optionA: cols[1] || null,
                optionB: cols[2] || null,
                optionC: cols[3] || null,
                optionD: cols[4] || null,
                correctOption: cols[5]?.toUpperCase() || null,
            });
        }

        return questions;
    },

    async createOralQuiz(sessionId: string, title: string, totalMarks: number) {
        const quizId = uuidv4();

        await db.execute({
            sql: `INSERT INTO quizzes (id, session_id, title, mode, total_questions)
          VALUES (?, ?, ?, 'oral', ?)`,
            args: [quizId, sessionId, title, totalMarks],
        });

        console.log(`[Quiz] Oral quiz created: ${title} (total marks: ${totalMarks})`);
        const quiz = await quizService.getQuiz(quizId);
        return { quiz };
    },

    async gradeStudent(
        quizId: string,
        sessionId: string,
        studentId: string,
        studentName: string,
        rollNumber: string,
        marksObtained: number,
        totalMarks: number,
        remarks: string
    ) {
        await db.execute({
            sql: `INSERT INTO oral_grades (id, quiz_id, session_id, student_id, student_name, roll_number, marks_obtained, total_marks, remarks)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(quiz_id, student_id)
          DO UPDATE SET marks_obtained = excluded.marks_obtained,
                        remarks = excluded.remarks,
                        graded_at = CURRENT_TIMESTAMP`,
            args: [uuidv4(), quizId, sessionId, studentId, studentName, rollNumber, marksObtained, totalMarks, remarks],
        });

        console.log(`[Quiz] Graded ${studentName}: ${marksObtained}/${totalMarks}`);
    },

    async getOralResults(quizId: string) {
        const result = await db.execute({
            sql: `SELECT * FROM oral_grades WHERE quiz_id = ? ORDER BY marks_obtained DESC`,
            args: [quizId],
        });
        return result.rows;
    },
};