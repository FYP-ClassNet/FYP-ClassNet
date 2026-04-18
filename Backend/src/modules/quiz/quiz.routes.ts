import { Router, type Request, type Response } from "express";
import multer from "multer";
import { quizService } from "./quiz.service.js";

const router : Router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/quiz/:sessionId/oral — create oral quiz
router.post("/:sessionId/oral", async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { title, totalQuestions } = req.body;

  if (!title || !totalQuestions) {
    res.status(400).json({ error: "title and totalQuestions are required" });
    return;
  }

  const result = await quizService.createOralQuiz(
    sessionId as string,
    title,
    parseInt(totalQuestions)
  );
  res.status(201).json(result);
});

// POST /api/quiz/:sessionId/csv — create CSV quiz
router.post(
  "/:sessionId/csv",
  upload.single("file"),
  async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { title } = req.body;

    if (!req.file || !title) {
      res.status(400).json({ error: "title and CSV file are required" });
      return;
    }

    const csvText = req.file.buffer.toString("utf-8");
    const questions = quizService.parseCsv(csvText);

    if (questions.length === 0) {
      res.status(400).json({ error: "No valid questions found in CSV" });
      return;
    }

    const result = await quizService.createCsvQuiz(sessionId as string, title, questions);
    res.status(201).json(result);
  }
);

// GET /api/quiz/:sessionId/active — get active quiz for session (for students)
router.get("/:sessionId/active", async (req: Request, res: Response) => {
  const quiz = await quizService.getActiveQuizBySession(req.params.sessionId as string);
  if (!quiz) {
    res.status(404).json({ error: "No active quiz" });
    return;
  }

  const questions = await quizService.getQuestionsForStudent(quiz.id as string);
  res.json({ quiz, questions });
});

// GET /api/quiz/:quizId/results — teacher gets results
router.get("/:quizId/results", async (req: Request, res: Response) => {
  const results = await quizService.getResults(req.params.quizId as string);
  res.json({ results });
});

// POST /api/quiz/:quizId/end — teacher ends quiz
router.post("/:quizId/end", async (req: Request, res: Response) => {
  const ended = await quizService.endQuiz(req.params.quizId as string);
  if (!ended) {
    res.status(404).json({ error: "Quiz not found or already ended" });
    return;
  }
  res.json({ success: true });
});

export default router;