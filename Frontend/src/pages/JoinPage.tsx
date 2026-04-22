import { useParams } from "react-router-dom";
import { useStudentSession } from "../hooks/useStudentSession";
import { useState } from "react";
import { useQuiz } from "../hooks/useQuiz";
import { QuizPanel } from "../components/student/QuizPanel";
import { StreamViewer } from "../components/student/StreamViewer";

// Replace old ScreenViewer with:


function categoryIcon(category: string) {
  if (category === "pdf") return "📄";
  if (category === "image") return "🖼️";
  if (category === "video") return "🎥";
  if (category === "document") return "📝";
  return "📎";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function JoinPage() {
  const { code } = useParams();

  const {
    studentData,
    attendanceStatus,
    handRaised,
    files,
    error,
    isLoading,
    sessionEnded,
    teacherReconnecting,
    joinSession,
    raiseHand,
    lowerHand,
  } = useStudentSession();
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [sessionCode, setSessionCode] = useState(code ?? "");
  const { quiz, questions, answers, quizEnded, submitAnswer } = useQuiz(studentData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && rollNumber.trim() && sessionCode.trim()) {
      joinSession(sessionCode.trim().toUpperCase(), name.trim(), rollNumber.trim());
    }
  };

  if (sessionEnded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center flex flex-col gap-4">
          <div className="text-4xl">🔴</div>
          <p className="text-white font-semibold text-lg">Class Ended</p>
          <p className="text-zinc-500 text-sm">The teacher has ended the session.</p>
        </div>
      </div>
    );
  }

  if (studentData) {
    return (
      <div className="min-h-screen bg-zinc-950 p-4 flex flex-col items-center">
        <div className="w-full max-w-sm flex flex-col gap-4 py-4">

          {/* Header */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">{studentData.name}</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                {studentData.rollNumber} · {studentData.sessionCode}
              </p>
            </div>
            {attendanceStatus && (
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${attendanceStatus === "present"
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-yellow-500/10 text-yellow-400"
                }`}>
                {attendanceStatus === "present" ? "✅ Present" : "⚠️ Late"}
              </span>
            )}
          </div>

          {teacherReconnecting && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-yellow-500/50 border-t-yellow-400 rounded-full animate-spin shrink-0" />
              <p className="text-yellow-400 text-sm">
                Teacher disconnected — waiting for reconnect...
              </p>
            </div>
          )}
          {/* Screen Viewer — shown always, hides when not sharing */}
         <StreamViewer sessionId={studentData.sessionId} />

          {/* Raise Hand */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
            <p className="text-zinc-500 text-sm text-center">Have a question?</p>
            <button
              onClick={handRaised ? lowerHand : raiseHand}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${handRaised
                ? "bg-yellow-500/20 border-2 border-yellow-500/50 text-yellow-400 animate-pulse"
                : "bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-transparent"
                }`}
            >
              {handRaised ? "✋ Hand Raised — Tap to Lower" : "✋ Raise Hand"}
            </button>
            {handRaised && (
              <p className="text-zinc-600 text-xs text-center">
                Teacher has been notified
              </p>
            )}
          </div>

          {/* Files */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">Shared Files</h2>
              {files.length > 0 && (
                <span className="text-zinc-500 text-xs">{files.length} file{files.length > 1 ? "s" : ""}</span>
              )}
            </div>

            {files.length === 0 ? (
              <div className="text-center py-6 text-zinc-600 text-sm">
                No files shared yet
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {files.map((file) => (

                  <a
                    key={file.fileId}
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-zinc-800 hover:bg-zinc-700 rounded-lg px-4 py-3 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{categoryIcon(file.category)}</span>
                      <div>
                        <p className="text-white text-sm group-hover:text-emerald-400 transition-colors">
                          {file.originalName}
                        </p>
                        <p className="text-zinc-500 text-xs">{formatSize(file.sizeBytes)}</p>
                      </div>
                    </div>
                    <span className="text-zinc-600 group-hover:text-emerald-400 transition-colors text-sm">↓</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quiz — shown only when active */}
          {quiz && (
            <QuizPanel
              quiz={quiz}
              questions={questions}
              answers={answers}
              quizEnded={quizEnded}
              onSubmitAnswer={submitAnswer}
            />
          )}

          <p className="text-zinc-700 text-xs text-center">Keep this page open during class</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎓</span>
          </div>
          <h1 className="text-white text-2xl font-bold">ClassNet</h1>
          <p className="text-zinc-500 text-sm mt-1">Join your class</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-sm">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ali Khan"
              className="bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-sm">Roll Number</label>
            <input
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. F22BINFT001"
              className="bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-sm">Session Code</label>
            <input
              type="text"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123"
              maxLength={6}
              className="bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm tracking-widest uppercase focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !name.trim() || !rollNumber.trim() || !sessionCode.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Joining...
              </span>
            ) : "Join Class"}
          </button>
        </form>
      </div>
    </div>
  );
}