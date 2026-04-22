import { useEffect, useState } from "react";
import { getSocket } from "../lib/socket";

interface QuizQuestion {
  id: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

interface Quiz {
  id: string;
  title: string;
  mode: string;
  total_questions: number;
}

export function useQuiz(studentData: {
  studentId: string;
  name: string;
  rollNumber: string;
  sessionId: string;
} | null) {
  const socket = getSocket();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizEnded, setQuizEnded] = useState(false);

  useEffect(() => {
    socket.on("quiz:started", ({ quiz, questions }: { quiz: Quiz; questions: QuizQuestion[] }) => {
      setQuiz(quiz);
      setQuestions(questions);
      setAnswers({});
      setQuizEnded(false);
    });

    socket.on("quiz:ended", () => setQuizEnded(true));

    socket.on("quiz:none", () => {
      setQuiz(null);
      setQuestions([]);
    });

    return () => {
      socket.off("quiz:started");
      socket.off("quiz:ended");
      socket.off("quiz:none");
    };
  }, []);

  // Check for active quiz on join
  useEffect(() => {
    if (!studentData) return;
    socket.emit("quiz:get-active", { sessionId: studentData.sessionId });
  }, [studentData]);

  const submitAnswer = (questionId: string, selectedOption: string) => {
    if (!studentData || !quiz) return;

    setAnswers((prev) => ({ ...prev, [questionId]: selectedOption }));

    socket.emit("quiz:submit-answer", {
      quizId: quiz.id,
      questionId,
      studentId: studentData.studentId,
      studentName: studentData.name,
      rollNumber: studentData.rollNumber,
      selectedOption,
    });
  };

  return { quiz, questions, answers, quizEnded, submitAnswer };
}