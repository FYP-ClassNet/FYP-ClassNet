import { useState, useEffect } from "react";
import { useTeacherQuiz } from "../../hooks/useTeacherQuiz";

interface Props {
  sessionId: string;
  students: {
    id: string;
    name: string;
    rollNumber: string;
    isOnline: boolean;
  }[];
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export function QuizManager({ sessionId, students ,quizState }: Props) {
  const {
    quizId,
    quizTitle,
    results,
    totalSubmitted,
    isCreating,
    quizActive,
    showResults,
    createOralQuiz,
    createCsvQuiz,
    launchQuiz,
    endQuiz,
    resetQuiz,
  } = useTeacherQuiz(sessionId);

  const [mode, setMode] = useState<"select" | "oral" | "csv">("select");
  const [oralTitle, setOralTitle] = useState("");
  const [oralTotalMarks, setOralTotalMarks] = useState(10);
  const [csvTitle, setCsvTitle] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Oral grading state
  const [oralQuizId, setOralQuizId] = useState<string | null>(null);
  const [oralQuizTitle, setOralQuizTitle] = useState("");
  const [grades, setGrades] = useState<Record<string, { marks: string; remarks: string }>>({});
  const [savedGrades, setSavedGrades] = useState<Record<string, boolean>>({});
  const [oralResults, setOralResults] = useState<any[]>([]);
  const [showOralResults, setShowOralResults] = useState(false);

  const handleCreateOral = async () => {
    if (!oralTitle.trim()) return;
    const res = await fetch(`${BACKEND_URL}/api/quiz/${sessionId}/oral`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: oralTitle, totalQuestions: oralTotalMarks }),
    });
    const data = await res.json();
    setOralQuizId(data.quiz.id);
    setOralQuizTitle(data.quiz.title);
  };

  const handleGradeStudent = async (student: { id: string; name: string; rollNumber: string }) => {
    if (!oralQuizId) return;
    const grade = grades[student.id];
    if (!grade?.marks) return;

    await fetch(`${BACKEND_URL}/api/quiz/${oralQuizId}/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        studentId: student.id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        marksObtained: Number(grade.marks),
        totalMarks: oralTotalMarks,
        remarks: grade.remarks ?? "",
      }),
    });

    setSavedGrades((prev) => ({ ...prev, [student.id]: true }));
  };

  const handleViewOralResults = async () => {
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
    setMode("select");
  };

  // ── Oral Results ──
  if (showOralResults) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">Oral Results — {oralQuizTitle}</h2>
          <button
            onClick={resetOral}
            className="text-zinc-400 hover:text-white text-xs bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            New Quiz
          </button>
        </div>

        {oralResults.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-4">No grades submitted</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {oralResults.map((r, i) => {
              const percent = Math.round((r.marks_obtained / r.total_marks) * 100);
              return (
                <div key={r.student_id} className="bg-zinc-800 rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-xs">#{i + 1}</span>
                      <p className="text-white text-sm font-medium">{r.student_name}</p>
                      <span className="text-zinc-500 text-xs">{r.roll_number}</span>
                    </div>
                    <span className={`text-sm font-bold ${
                      percent >= 70 ? "text-emerald-400" :
                      percent >= 40 ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {r.marks_obtained}/{r.total_marks}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex-1 bg-zinc-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          percent >= 70 ? "bg-emerald-500" :
                          percent >= 40 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    {r.remarks && (
                      <span className="text-zinc-500 text-xs shrink-0">{r.remarks}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Oral Grading Sheet ──
  if (oralQuizId) {
    const gradedCount = Object.keys(savedGrades).length;

    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">{oralQuizTitle}</h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              {gradedCount}/{students.length} graded · Total marks: {oralTotalMarks}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleViewOralResults}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              View Results
            </button>
            <button
              onClick={resetOral}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {students.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-4">
            No students in session yet
          </p>
        ) : (
          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
            {students.map((student) => {
              const isSaved = savedGrades[student.id];
              return (
                <div key={student.id} className={`rounded-xl p-4 flex flex-col gap-3 border ${
                  isSaved ? "bg-emerald-500/5 border-emerald-500/20" : "bg-zinc-800 border-transparent"
                }`}>
                  {/* Student info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{student.name}</p>
                      <p className="text-zinc-500 text-xs">{student.rollNumber}</p>
                    </div>
                    {isSaved && (
                      <span className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        ✓ Saved
                      </span>
                    )}
                  </div>

                  {/* Marks + Remarks */}
                  <div className="flex gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-zinc-500 text-xs">Marks / {oralTotalMarks}</label>
                      <input
                        type="number"
                        min={0}
                        max={oralTotalMarks}
                        value={grades[student.id]?.marks ?? ""}
                        onChange={(e) =>
                          setGrades((prev) => ({
                            ...prev,
                            [student.id]: { ...prev[student.id], marks: e.target.value },
                          }))
                        }
                        placeholder="0"
                        className="w-20 bg-zinc-700 border border-zinc-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-zinc-500 text-xs">Remarks (optional)</label>
                      <input
                        type="text"
                        value={grades[student.id]?.remarks ?? ""}
                        onChange={(e) =>
                          setGrades((prev) => ({
                            ...prev,
                            [student.id]: { ...prev[student.id], remarks: e.target.value },
                          }))
                        }
                        placeholder="e.g. Good explanation"
                        className="bg-zinc-700 border border-zinc-600 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1 justify-end">
                      <label className="text-zinc-500 text-xs opacity-0">.</label>
                      <button
                        onClick={() => handleGradeStudent(student)}
                        disabled={!grades[student.id]?.marks}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm px-3 py-2 rounded-lg transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── CSV Results ──
  if (showResults) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">Results — {quizTitle}</h2>
          <button
            onClick={resetQuiz}
            className="text-zinc-400 hover:text-white text-xs bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            New Quiz
          </button>
        </div>

        {results.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-4">No students answered</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {results.map((r, i) => (
              <div key={r.studentId} className="bg-zinc-800 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 text-xs">#{i + 1}</span>
                    <p className="text-white text-sm font-medium">{r.studentName}</p>
                    <span className="text-zinc-500 text-xs">{r.rollNumber}</span>
                  </div>
                  <span className={`text-sm font-bold ${
                    r.scorePercent >= 70 ? "text-emerald-400" :
                    r.scorePercent >= 40 ? "text-yellow-400" : "text-red-400"
                  }`}>
                    {r.scorePercent}%
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 bg-zinc-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        r.scorePercent >= 70 ? "bg-emerald-500" :
                        r.scorePercent >= 40 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${r.scorePercent}%` }}
                    />
                  </div>
                  <span className="text-zinc-500 text-xs shrink-0">
                    {r.totalCorrect}/{r.totalAnswered} correct
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── CSV Quiz Active ──
  if (quizActive) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">{quizTitle}</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Quiz in progress</p>
          </div>
          <button
            onClick={endQuiz}
            className="bg-red-600/20 hover:bg-red-600 border border-red-600/40 text-red-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-all"
          >
            End Quiz
          </button>
        </div>
        <div className="bg-zinc-800 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Students submitted</span>
            <span className="text-white font-semibold">
              {totalSubmitted} / {students.length}
            </span>
          </div>
          <div className="w-full bg-zinc-700 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: students.length > 0 ? `${(totalSubmitted / students.length) * 100}%` : "0%" }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── CSV Quiz Ready to Launch ──
  if (quizId) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-white font-semibold">Quiz Ready</h2>
        <div className="bg-zinc-800 rounded-xl p-4 text-center">
          <p className="text-zinc-400 text-sm mb-1">Quiz title</p>
          <p className="text-white font-semibold">{quizTitle}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={resetQuiz}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={launchQuiz}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Launch Quiz
          </button>
        </div>
      </div>
    );
  }

  // ── Mode Select ──
  if (mode === "select") {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-white font-semibold">Quiz</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode("oral")}
            className="bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 text-left transition-colors"
          >
            <p className="text-2xl mb-2">🎤</p>
            <p className="text-white text-sm font-medium">Oral Quiz</p>
            <p className="text-zinc-500 text-xs mt-1">Grade students manually</p>
          </button>
          <button
            onClick={() => setMode("csv")}
            className="bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 text-left transition-colors"
          >
            <p className="text-2xl mb-2">📋</p>
            <p className="text-white text-sm font-medium">CSV Quiz</p>
            <p className="text-zinc-500 text-xs mt-1">Upload MCQ file with answers</p>
          </button>
        </div>
      </div>
    );
  }

  // ── Oral Form ──
  if (mode === "oral") {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode("select")} className="text-zinc-500 hover:text-white transition-colors">←</button>
          <h2 className="text-white font-semibold">Oral Quiz</h2>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-sm">Quiz Title</label>
            <input
              type="text"
              value={oralTitle}
              onChange={(e) => setOralTitle(e.target.value)}
              placeholder="e.g. Chapter 3 Oral"
              className="bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-sm">Total Marks</label>
            <input
              type="number"
              value={oralTotalMarks}
              onChange={(e) => setOralTotalMarks(parseInt(e.target.value))}
              min={1}
              max={100}
              className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>
        <button
          onClick={handleCreateOral}
          disabled={!oralTitle.trim()}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Start Grading
        </button>
      </div>
    );
  }

  // ── CSV Form ──
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setMode("select")} className="text-zinc-500 hover:text-white transition-colors">←</button>
        <h2 className="text-white font-semibold">CSV Quiz</h2>
      </div>
      <div className="bg-zinc-800 rounded-lg p-3 text-xs text-zinc-400">
        <p className="font-medium text-zinc-300 mb-1">CSV Format:</p>
        <p>question,option_a,option_b,option_c,option_d,correct</p>
        <p>What is 2+2?,1,2,4,8,C</p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-sm">Quiz Title</label>
          <input
            type="text"
            value={csvTitle}
            onChange={(e) => setCsvTitle(e.target.value)}
            placeholder="e.g. Midterm Quiz"
            className="bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-sm">CSV File</label>
          <label className="cursor-pointer bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-lg px-4 py-3 text-sm text-zinc-400 transition-colors text-center">
            {csvFile ? csvFile.name : "Click to select CSV file"}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>
      <button
        onClick={() => csvFile && createCsvQuiz(csvTitle, csvFile)}
        disabled={isCreating || !csvTitle.trim() || !csvFile}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {isCreating ? "Creating..." : "Create Quiz"}
      </button>
    </div>
  );
}