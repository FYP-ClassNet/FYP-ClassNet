export type QuizMode = "csv" | "oral";
export type QuizStatus = "active" | "ended";

export interface QuizQuestion {
  id: string;
  quizId: string;
  questionNumber: number;
  questionText: string | null;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  correctOption: string | null; // "A" | "B" | "C" | "D" — null for oral mode
}

export interface Quiz {
  id: string;
  sessionId: string;
  title: string;
  mode: QuizMode;
  totalQuestions: number;
  status: QuizStatus;
  createdAt: string;
  endedAt: string | null;
}

export interface SubmitAnswerPayload {
  quizId: string;
  questionId: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  selectedOption: string;
}

export interface QuizResult {
  studentId: string;
  studentName: string;
  rollNumber: string;
  totalAnswered: number;
  totalCorrect: number;
  totalWrong: number;
  totalUnanswered: number;
  scorePercent: number;
  answers: {
    questionNumber: number;
    questionText: string | null;
    selectedOption: string;
    correctOption: string | null;
    isCorrect: boolean | null;
  }[];
}