import { Server as SocketServer, Socket } from "socket.io";
import { quizService } from "./quiz.service.js";

export function registerQuizSocketEvents(io: SocketServer, socket: Socket): void {

    // Teacher launches quiz — notifies all students
    socket.on(
        "quiz:launch",
        async ({ sessionId, quizId }: { sessionId: string; quizId: string }) => {
            const quiz = await quizService.getQuiz(quizId);
            if (!quiz) {
                socket.emit("error", { message: "Quiz not found" });
                return;
            }

            const questions = await quizService.getQuestionsForStudent(quizId);

            // Broadcast to all students in session
            io.to(sessionId).emit("quiz:started", { quiz, questions });
            console.log(`[Quiz] Launched: ${quiz.title}`);
        }
    );

    // Student submits an answer
    socket.on(
        "quiz:submit-answer",
        async ({
            quizId,
            questionId,
            studentId,
            studentName,
            rollNumber,
            selectedOption,
        }: {
            quizId: string;
            questionId: string;
            studentId: string;
            studentName: string;
            rollNumber: string;
            selectedOption: string;
        }) => {
            await quizService.submitAnswer(
                quizId,
                questionId,
                studentId,
                studentName,
                rollNumber,
                selectedOption
            );

            // Confirm to student — only tell them if answered, not if correct
            socket.emit("quiz:answer-confirmed", {
                questionId,
                selectedOption: selectedOption.toUpperCase(),
            });

            // Notify teacher of progress
            const progressResult = await quizService.getResults(quizId);
            const totalAnswered = progressResult.filter((r) => r.totalAnswered > 0).length;

            io.to(`${(await quizService.getQuiz(quizId))?.session_id}:teacher`).emit(
                "quiz:progress",
                { totalSubmitted: totalAnswered }
            );

            console.log(`[Quiz] ${studentName} answered Q${questionId}`);
        }
    );

    // Teacher ends quiz — broadcast results to teacher only
    socket.on("quiz:end", async ({ sessionId, quizId }: { sessionId: string; quizId: string }) => {
        await quizService.endQuiz(quizId);

        // Notify students quiz ended
        io.to(sessionId).emit("quiz:ended", { message: "Quiz has ended" });

        // Send results to teacher only
        const results = await quizService.getResults(quizId);
        socket.emit("quiz:results", { results });

        console.log(`[Quiz] Ended: ${quizId} — ${results.length} students participated`);
    });

    // Teacher requests results anytime
    socket.on("quiz:get-results", async ({ quizId }: { quizId: string }) => {
        const results = await quizService.getResults(quizId);
        socket.emit("quiz:results", { results });
    });

    // Student requests active quiz on join
    socket.on("quiz:get-active", async ({ sessionId }: { sessionId: string }) => {
        const quiz = await quizService.getActiveQuizBySession(sessionId);
        if (!quiz) {
            socket.emit("quiz:none");
            return;
        }
        const questions = await quizService.getQuestionsForStudent(quiz.id as string);
        socket.emit("quiz:started", { quiz, questions });
    });
}