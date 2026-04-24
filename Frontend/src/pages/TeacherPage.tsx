import { useTeacherSession } from "../hooks/useTeacherSession";
import { useTeacherQuiz } from "../hooks/useTeacherQuiz";
import { useState, useEffect } from "react";
import { FileUpload } from "../components/teacher/FileUpload";
import { QuizManager } from "../components/teacher/QuizManager";
import { SfuScreenShare } from "../components/teacher/SfuScreenShare";
import { Whiteboard } from "../components/teacher/Whiteboard";
import { useStream } from "../hooks/useStream";
import { exportAttendanceCsv } from "../lib/exportCsv";
import { useNavigate } from "react-router-dom";
import { SessionQRCode } from "../components/teacher/QRCode";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

interface AttendanceRecord {
  student_name: string;
  roll_number: string;
  status: string;
  joined_at: string;
  left_at: string | null;
  total_online_seconds: number;
  reconnect_count: number;
}

interface UploadedFile {
  fileId: string;
  originalName: string;
  fileUrl: string;
  category: string;
  sizeBytes: number;
}

type ActivePanel = "students" | "attendance" | "files" | "quiz" | "screen";

export function TeacherPage() {
  const navigate = useNavigate();
  const {
    session,
    students,
    raisedHands,
    isConnected,
    isLoading,
    isRejoining,
    createSession,
    endSession,
    dismissHand,
  } = useTeacherSession();

  const {
    isStreaming,
    streamMode,
    startScreenShare,
    startWhiteboard,
    stopCapture,
    postWhiteboardFrame,
  } = useStream(session?.sessionId);

  const quizState = useTeacherQuiz(session?.sessionId);

  const [copied, setCopied] = useState<"code" | "url" | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activePanel, setActivePanel] = useState<ActivePanel>("students");

  // ── Lifted file state ──
  const [files, setFiles] = useState<UploadedFile[]>([]);

  // Fetch attendance when students update
  useEffect(() => {
    if (!session) return;
    fetch(`${BACKEND_URL}/api/attendance/${session.sessionId}`)
      .then((r) => r.json())
      .then((d) => setAttendance(d.records ?? []));
  }, [students, session]);

  // Fetch files on session start
  useEffect(() => {
    if (!session) return;
    fetch(`${BACKEND_URL}/api/files/${session.sessionId}`)
      .then((r) => r.json())
      .then((d) => setFiles(d.files ?? []));
  }, [session?.sessionId]);

  // Reset state when session ends
  useEffect(() => {
    if (!session) {
      setFiles([]);
      setAttendance([]);
      setActivePanel("students");
    }
  }, [session]);

  const copy = (text: string, type: "code" | "url") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const onlineCount = students.filter((s) => s.isOnline).length;
  const presentCount = attendance.filter((a) => a.status === "present").length;
  const lateCount = attendance.filter((a) => a.status === "late").length;

  // ── Connecting ──
  if (!isConnected || isRejoining) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">
            {isRejoining ? "Rejoining session..." : "Connecting to server..."}
          </p>
        </div>
      </div>
    );
  }

  // ── No Session ──
  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm flex flex-col gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/50">
                <span className="text-3xl">🎓</span>
              </div>
              <div className="text-center">
                <h1 className="text-white text-2xl font-bold tracking-tight">ClassNet</h1>
                <p className="text-zinc-500 text-sm mt-1">Offline LAN Classroom</p>
              </div>
            </div>
            <div className="w-full h-px bg-zinc-800" />
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400">Server connected</span>
            </div>
            <button
              onClick={createSession}
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-900/30"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting...
                </span>
              ) : "Start Class"}
            </button>
          </div>
          <button
            onClick={() => navigate("/reports")}
            className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <span>📊</span> View Past Reports
          </button>
        </div>
      </div>
    );
  }



  const navItems: { id: ActivePanel; label: string; icon: string; badge?: number }[] = [
    { id: "students", label: "Students", icon: "👥", badge: onlineCount },
    { id: "attendance", label: "Attendance", icon: "✅", badge: attendance.length },
    { id: "files", label: "Files", icon: "📁", badge: files.length },
    { id: "quiz", label: "Quiz", icon: "📝" },
    { id: "screen", label: "Screen", icon: "🖥️" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">

      {/* Navbar */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-sm">🎓</span>
          </div>
          <span className="text-white font-bold tracking-tight">ClassNet</span>
          <div className="flex items-center gap-1.5 ml-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 text-xs font-medium">Live</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session && <SfuScreenShare sessionId={session.sessionId} />}
          <button
            onClick={() => navigate("/reports")}
            className="text-zinc-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-all"
          >
            Reports
          </button>
          <button
            onClick={endSession}
            className="bg-red-500/10 hover:bg-red-500 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-white text-sm px-4 py-1.5 rounded-lg transition-all font-medium"
          >
            End Class
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0">
          <div className="p-5 border-b border-zinc-800">
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-3">
              Session Code
            </p>
            <div className="bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-center mb-3">
              <span className="text-white text-3xl font-bold tracking-[0.25em]">
                {session.sessionCode}
              </span>
            </div>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => copy(session.sessionCode, "code")}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2 rounded-lg transition-colors"
              >
                {copied === "code" ? "✓ Copied!" : "Copy Code"}
              </button>
              <button
                onClick={() => copy(session.lanUrl, "url")}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2 rounded-lg transition-colors"
              >
                {copied === "url" ? "✓ Copied!" : "Copy URL"}
              </button>
            </div>

            {/* QR Code */}
            <SessionQRCode
              sessionCode={session.sessionCode}
              lanUrl={session.lanUrl}
            />

            <p className="text-zinc-600 text-xs font-mono mt-2 truncate text-center">
              {session.lanUrl}
            </p>
          </div>

          <div className="p-5 border-b border-zinc-800">
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-3">Live Stats</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-zinc-800 rounded-xl p-3 text-center">
                <p className="text-white text-xl font-bold">{onlineCount}</p>
                <p className="text-zinc-500 text-xs mt-0.5">Online</p>
              </div>
              <div className="bg-zinc-800 rounded-xl p-3 text-center">
                <p className="text-emerald-400 text-xl font-bold">{presentCount}</p>
                <p className="text-zinc-500 text-xs mt-0.5">Present</p>
              </div>
              <div className="bg-zinc-800 rounded-xl p-3 text-center">
                <p className="text-yellow-400 text-xl font-bold">{lateCount}</p>
                <p className="text-zinc-500 text-xs mt-0.5">Late</p>
              </div>
            </div>
          </div>

          <nav className="p-3 flex flex-col gap-1 flex-1">
            <p className="text-zinc-600 text-xs font-medium uppercase tracking-wider px-2 py-1">Panels</p>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePanel(item.id)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activePanel === item.id
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${activePanel === item.id ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700 text-zinc-400"
                    }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

          {/* Raised Hands */}
          {raisedHands.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span>✋</span>
                <h3 className="text-yellow-400 font-semibold text-sm">
                  {raisedHands.length} student{raisedHands.length > 1 ? "s" : ""} raised hand
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {raisedHands.map((h) => (
                  <div key={h.studentId} className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                    <span className="text-white text-sm font-medium">{h.studentName}</span>
                    <span className="text-yellow-600 text-xs">
                      {new Date(h.raisedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      onClick={() => dismissHand(h.studentId)}
                      className="text-yellow-400 hover:text-white text-xs bg-yellow-500/20 hover:bg-yellow-500/40 px-2 py-0.5 rounded transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Students Panel */}
          {activePanel === "students" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800">
                <h2 className="text-white font-semibold">Students</h2>
                <p className="text-zinc-500 text-xs mt-0.5">{onlineCount} online · {students.length} total</p>
              </div>
              {students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <span className="text-4xl">👥</span>
                  <p className="text-zinc-500 text-sm">Waiting for students to join...</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {students.map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${s.isOnline ? "bg-emerald-500" : "bg-zinc-600"}`} />
                        <div>
                          <p className="text-white text-sm font-medium">{s.name}</p>
                          <p className="text-zinc-500 text-xs">{s.rollNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {raisedHands.find((h) => h.studentId === s.id) && (
                          <span className="text-sm animate-bounce">✋</span>
                        )}
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.isOnline ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                          }`}>
                          {s.isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attendance Panel */}
          {activePanel === "attendance" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-semibold">Attendance</h2>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {presentCount} present · {lateCount} late · {attendance.length} total
                  </p>
                </div>
                {attendance.length > 0 && (
                  <button
                    onClick={() => exportAttendanceCsv(session.sessionCode, attendance)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span>↓</span> Export CSV
                  </button>
                )}
              </div>
              {attendance.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <span className="text-4xl">✅</span>
                  <p className="text-zinc-500 text-sm">No attendance records yet</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {attendance.map((a, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/50 transition-colors">
                      <div>
                        <p className="text-white text-sm font-medium">{a.student_name}</p>
                        <p className="text-zinc-500 text-xs">{a.roll_number}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${a.status === "present"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : a.status === "late"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-red-500/10 text-red-400"
                        }`}>
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Files Panel — state lives in TeacherPage, survives tab switch */}
          {activePanel === "files" && (
            <FileUpload
              sessionId={session.sessionId}
              files={files}
              onFileUploaded={(file) => setFiles((prev) => [...prev, file])}
              onFileDeleted={(fileId) => setFiles((prev) => prev.filter((f) => f.fileId !== fileId))}
            />
          )}

          {/* Quiz Panel — state lives in useTeacherQuiz hook, survives tab switch */}
          {activePanel === "quiz" && (
            <QuizManager
              sessionId={session.sessionId}
              students={students}
              quizState={quizState}
            />
          )}

          {/* Screen Panel */}
          {activePanel === "screen" && (
            <div className="flex flex-col gap-4">
              {/* Mode switcher */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
                <p className="text-zinc-400 text-sm mr-2">Mode:</p>
                <button
                  onClick={() => {
                    if (isStreaming && streamMode === "whiteboard") stopCapture();
                    startScreenShare();
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${isStreaming && streamMode === "screen"
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    }`}
                >
                  🖥️ Screen Share
                </button>
                <button
                  onClick={() => {
                    if (isStreaming && streamMode === "screen") stopCapture();
                    startWhiteboard();
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${isStreaming && streamMode === "whiteboard"
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    }`}
                >
                  🎨 Whiteboard
                </button>
                {isStreaming && (
                  <button
                    onClick={stopCapture}
                    className="ml-auto bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-sm px-4 py-2 rounded-lg transition-all"
                  >
                    Stop Streaming
                  </button>
                )}
              </div>

              {/* Whiteboard */}
              {streamMode === "whiteboard" && isStreaming && (
                <Whiteboard
                  onFrame={postWhiteboardFrame}
                  isStreaming={isStreaming}
                />
              )}

              {/* Screen share info */}
              {streamMode === "screen" && isStreaming && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <p className="text-white font-medium">Screen sharing is live</p>
                  </div>
                  <p className="text-zinc-500 text-sm">Students can see your screen</p>
                </div>
              )}

              {/* Not streaming */}
              {!isStreaming && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4">
                  <p className="text-zinc-500 text-sm text-center">
                    Choose a mode above to start streaming to students
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-800 rounded-xl p-4 text-center">
                      <span className="text-3xl">🖥️</span>
                      <p className="text-white text-sm font-medium mt-2">Screen Share</p>
                      <p className="text-zinc-500 text-xs mt-1">Share your entire screen or a window</p>
                    </div>
                    <div className="bg-zinc-800 rounded-xl p-4 text-center">
                      <span className="text-3xl">🎨</span>
                      <p className="text-white text-sm font-medium mt-2">Whiteboard</p>
                      <p className="text-zinc-500 text-xs mt-1">Draw and write for students</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}