import { useState, useEffect, useRef } from "react";
import { getSocket } from "../lib/socket";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export interface QuizResult {
  studentId: string;
  studentName: string;
  rollNumber: string;
  totalAnswered: number;
  totalCorrect: number;
  totalWrong: number;
  totalUnanswered: number;
  scorePercent: number;
}

export function useTeacherQuiz(sessionId: string | undefined) {
  const socket = getSocket();
  const [quizId, setQuizId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizMode, setQuizMode] = useState<"csv" | "oral" | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [totalSubmitted, setTotalSubmitted] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [quizActive, setQuizActive] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Oral quiz state
  const [oralQuizId, setOralQuizId] = useState<string | null>(null);
  const [oralQuizTitle, setOralQuizTitle] = useState("");
  const [oralTotalMarks, setOralTotalMarks] = useState(10);
  const [grades, setGrades] = useState<Record<string, { marks: string; remarks: string }>>({});
  const [savedGrades, setSavedGrades] = useState<Record<string, boolean>>({});
  const [oralResults, setOralResults] = useState<any[]>([]);
  const [showOralResults, setShowOralResults] = useState(false);

  useEffect(() => {
    socket.on("quiz:progress", ({ totalSubmitted }: { totalSubmitted: number }) => {
      setTotalSubmitted(totalSubmitted);
    });

    socket.on("quiz:results", ({ results }: { results: QuizResult[] }) => {
      setResults(results);
      setShowResults(true);
      setQuizActive(false);
    });

    return () => {
      socket.off("quiz:progress");
      socket.off("quiz:results");
    };
  }, []);

  const createOralQuiz = async (title: string, totalMarks: number) => {
    if (!sessionId) return;
    setIsCreating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/quiz/${sessionId}/oral`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, totalQuestions: totalMarks }),
      });
      const data = await res.json();
      setOralQuizId(data.quiz.id);
      setOralQuizTitle(data.quiz.title);
      setOralTotalMarks(totalMarks);
    } finally {
      setIsCreating(false);
    }
  };

  const createCsvQuiz = async (title: string, file: File) => {
    if (!sessionId) return;
    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("file", file);
      const res = await fetch(`${BACKEND_URL}/api/quiz/${sessionId}/csv`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setQuizId(data.quiz.id);
      setQuizTitle(data.quiz.title);
      setQuizMode("csv");
    } finally {
      setIsCreating(false);
    }
  };

  const launchQuiz = () => {
    if (!sessionId || !quizId) return;
    socket.emit("quiz:launch", { sessionId, quizId });
    setQuizActive(true);
    setTotalSubmitted(0);
  };

  const endQuiz = () => {
    if (!sessionId || !quizId) return;
    socket.emit("quiz:end", { sessionId, quizId });
  };

  const resetQuiz = () => {
    setQuizId(null);
    setQuizTitle("");
    setQuizMode(null);
    setResults([]);
    setTotalSubmitted(0);
    setQuizActive(false);
    setShowResults(false);
  };

  const gradeStudent = async (
    studentId: string,
    studentName: string,
    rollNumber: string,
    marks: string,
    remarks: string
  ) => {
    if (!oralQuizId || !sessionId) return;
    await fetch(`${BACKEND_URL}/api/quiz/${oralQuizId}/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        studentId,
        studentName,
        rollNumber,
        marksObtained: Number(marks),
        totalMarks: oralTotalMarks,
        remarks,
      }),
    });
    setSavedGrades((prev) => ({ ...prev, [studentId]: true }));
  };

  const viewOralResults = async () => {
    if (!oralQuizId) return;
    const res = await fetch(`${BACKEND_URL}/api/quiz/${oralQuizId}/oral-results`);
    const data = await res.json();
    setOralResults(data.results);
    setShowOralResults(true);
  };

  const resetOral = () => {
    setOralQuizId(null);
    setOralQuizTitle("");
    setGrades({});
    setSavedGrades({});
    setOralResults([]);
    setShowOralResults(false);
  };

  return {
    // CSV quiz
    quizId, quizTitle, quizMode,
    results, totalSubmitted,
    isCreating, quizActive, showResults,
    createCsvQuiz, launchQuiz, endQuiz, resetQuiz,

    // Oral quiz
    oralQuizId, oralQuizTitle, oralTotalMarks,
    grades, setGrades, savedGrades,
    oralResults, showOralResults,
    createOralQuiz, gradeStudent, viewOralResults, resetOral,
  };
}