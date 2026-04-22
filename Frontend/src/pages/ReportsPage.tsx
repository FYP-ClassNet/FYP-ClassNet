import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

interface Session {
  id: string;
  code: string;
  status: string;
  created_at: string;
  ended_at: string | null;
}

interface AttendanceRecord {
  student_name: string;
  roll_number: string;
  status: string;
  joined_at: string;
  left_at: string | null;
  total_online_seconds: number;
  reconnect_count: number;
}

interface CsvResult {
  studentName: string;
  rollNumber: string;
  totalCorrect: number;
  totalAnswered: number;
  totalQuestions: number;
  scorePercent: number;
}

interface OralResult {
  studentName: string;
  rollNumber: string;
  marksObtained: number;
  totalMarks: number;
  remarks: string;
  scorePercent: number;
}

interface QuizReport {
  quizId: string;
  title: string;
  mode: "csv" | "oral";
  totalQuestions?: number;
  totalMarks?: number;
  status: string;
  createdAt: string;
  results: CsvResult[] | OralResult[];
}

interface Summary {
  sessionCode: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  classDurationFormatted: string;
  totalStudents: number;
  present: number;
  late: number;
  averageAttendanceFormatted: string;
  students: AttendanceRecord[];
  quizzes: QuizReport[];
}

interface LogEvent {
  event_type: string;
  student_name: string | null;
  roll_number: string | null;
  timestamp: string;
}

function formatDate(dt: string) {
  return new Date(dt.replace(" ", "T") + "Z").toLocaleString();
}

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function eventIcon(type: string) {
  if (type === "session_started") return "🟢";
  if (type === "session_ended") return "🔴";
  if (type === "student_joined") return "➕";
  if (type === "student_disconnected") return "➖";
  return "•";
}

function ScoreBar({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 bg-zinc-700 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${
            percent >= 70 ? "bg-emerald-500" :
            percent >= 40 ? "bg-yellow-500" : "bg-red-500"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-xs font-semibold w-10 text-right shrink-0 ${
        percent >= 70 ? "text-emerald-400" :
        percent >= 40 ? "text-yellow-400" : "text-red-400"
      }`}>
        {percent}%
      </span>
    </div>
  );
}

export function ReportsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"attendance" | "quiz" | "logs">("attendance");
  const [selectedQuiz, setSelectedQuiz] = useState<QuizReport | null>(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/logs/sessions`)
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []));
  }, []);

  const loadReport = async (session: Session) => {
    setSelectedSession(session);
    setLoading(true);
    setSummary(null);
    setLogs([]);
    setSelectedQuiz(null);
    setActiveTab("attendance");

    const [summaryRes, logsRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/logs/${session.id}/summary`),
      fetch(`${BACKEND_URL}/api/logs/${session.id}`),
    ]);

    setSummary(await summaryRes.json());
    setLogs((await logsRes.json()).logs ?? []);
    setLoading(false);
  };

  const exportCsv = (filename: string, headers: string[], rows: any[][]) => {
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAttendance = () => {
    if (!summary || !selectedSession) return;
    exportCsv(
      `attendance-${selectedSession.code}.csv`,
      ["Roll Number", "Name", "Status", "Joined At", "Left At", "Online Time", "Reconnects"],
      summary.students.map((s) => [
        s.roll_number, s.student_name, s.status,
        s.joined_at ? formatDate(s.joined_at) : "-",
        s.left_at ? formatDate(s.left_at) : "Still Online",
        formatSeconds(Number(s.total_online_seconds)),
        s.reconnect_count,
      ])
    );
  };

  const exportQuiz = (quiz: QuizReport) => {
    if (!selectedSession) return;
    if (quiz.mode === "csv") {
      exportCsv(
        `quiz-${quiz.title}-${selectedSession.code}.csv`,
        ["Roll Number", "Name", "Correct", "Total", "Score %"],
        (quiz.results as CsvResult[]).map((r) => [
          r.rollNumber, r.studentName, r.totalCorrect, r.totalQuestions, `${r.scorePercent}%`,
        ])
      );
    } else {
      exportCsv(
        `oral-${quiz.title}-${selectedSession.code}.csv`,
        ["Roll Number", "Name", "Marks", "Total Marks", "Score %", "Remarks"],
        (quiz.results as OralResult[]).map((r) => [
          r.rollNumber, r.studentName, r.marksObtained, r.totalMarks, `${r.scorePercent}%`, r.remarks ?? "",
        ])
      );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">

      {/* Navbar */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-sm">🎓</span>
          </div>
          <span className="text-white font-bold tracking-tight">ClassNet</span>
          <span className="text-zinc-600 text-sm">/</span>
          <span className="text-zinc-400 text-sm">Reports</span>
        </div>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm px-4 py-2 rounded-lg transition-all"
        >
          ← Back to Class
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Sessions Sidebar */}
        <aside className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0 overflow-hidden">
          <div className="px-4 py-4 border-b border-zinc-800">
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
              Sessions
            </p>
            <p className="text-zinc-600 text-xs mt-1">{sessions.length} recorded</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <span className="text-3xl">📭</span>
                <p className="text-zinc-600 text-sm text-center">No sessions recorded yet</p>
              </div>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadReport(s)}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-all border ${
                    selectedSession?.id === s.id
                      ? "bg-emerald-600/15 border-emerald-600/40 shadow-sm"
                      : "bg-zinc-800/50 hover:bg-zinc-800 border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`font-bold tracking-widest text-sm ${
                      selectedSession?.id === s.id ? "text-emerald-400" : "text-white"
                    }`}>
                      {s.code}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      s.status === "active"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-zinc-700 text-zinc-500"
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-xs">{formatDate(s.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">

          {/* Empty state */}
          {!selectedSession && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <span className="text-5xl">📊</span>
              <p className="text-zinc-400 font-medium">Select a session to view report</p>
              <p className="text-zinc-600 text-sm">Click any session from the sidebar</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-zinc-500 text-sm">Loading report...</p>
              </div>
            </div>
          )}

          {/* Report */}
          {summary && !loading && (
            <div className="p-6 flex flex-col gap-5">

              {/* Session header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white text-lg font-bold">
                    Session{" "}
                    <span className="text-emerald-400 tracking-widest">{summary.sessionCode}</span>
                  </h2>
                  <p className="text-zinc-500 text-sm mt-0.5">
                    {summary.startedAt ? formatDate(summary.startedAt) : "—"}
                    {summary.endedAt && ` → ${formatDate(summary.endedAt)}`}
                  </p>
                </div>
                <span className={`text-xs px-3 py-1.5 rounded-full font-medium border ${
                  summary.status === "active"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}>
                  {summary.status}
                </span>
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Class Duration", value: summary.classDurationFormatted, icon: "⏱️", color: "text-white" },
                  { label: "Total Students", value: summary.totalStudents, icon: "👥", color: "text-white" },
                  { label: "Present", value: summary.present, icon: "✅", color: "text-emerald-400" },
                  { label: "Late", value: summary.late, icon: "⚠️", color: "text-yellow-400" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{stat.icon}</span>
                      <p className="text-zinc-500 text-xs">{stat.label}</p>
                    </div>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">

                {/* Tab bar */}
                <div className="flex border-b border-zinc-800 bg-zinc-900">
                  {(["attendance", "quiz", "logs"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab); setSelectedQuiz(null); }}
                      className={`flex-1 py-3.5 text-sm font-medium transition-all ${
                        activeTab === tab
                          ? "text-white border-b-2 border-emerald-500 bg-zinc-800/30"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20"
                      }`}
                    >
                      {tab === "quiz"
                        ? `Quiz${summary.quizzes.length > 0 ? ` (${summary.quizzes.length})` : ""}`
                        : tab === "logs" ? "Activity Log"
                        : "Attendance"
                      }
                    </button>
                  ))}
                </div>

                <div className="p-5">

                  {/* ── Attendance Tab ── */}
                  {activeTab === "attendance" && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <p className="text-zinc-500 text-sm">
                          {summary.students.length} student{summary.students.length !== 1 ? "s" : ""}
                        </p>
                        {summary.students.length > 0 && (
                          <button
                            onClick={exportAttendance}
                            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg transition-colors"
                          >
                            <span>↓</span> Export CSV
                          </button>
                        )}
                      </div>

                      {summary.students.length === 0 ? (
                        <div className="text-center py-10 text-zinc-600 text-sm">No attendance records</div>
                      ) : (
                        <div className="flex flex-col divide-y divide-zinc-800 rounded-xl overflow-hidden border border-zinc-800">
                          {summary.students.map((s, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-3.5 bg-zinc-800/30 hover:bg-zinc-800/60 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-zinc-700 rounded-lg flex items-center justify-center text-xs font-bold text-zinc-300">
                                  {i + 1}
                                </div>
                                <div>
                                  <p className="text-white text-sm font-medium">{s.student_name}</p>
                                  <p className="text-zinc-500 text-xs">
                                    {s.roll_number}
                                    {s.total_online_seconds > 0 && (
                                      <span className="ml-2 text-zinc-600">
                                        · {formatSeconds(Number(s.total_online_seconds))} online
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                s.status === "present"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-yellow-500/10 text-yellow-400"
                              }`}>
                                {s.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Quiz Tab ── */}
                  {activeTab === "quiz" && (
                    <div className="flex flex-col gap-4">
                      {summary.quizzes.length === 0 ? (
                        <div className="text-center py-10">
                          <span className="text-3xl">📝</span>
                          <p className="text-zinc-600 text-sm mt-3">No quizzes in this session</p>
                        </div>
                      ) : !selectedQuiz ? (
                        <div className="flex flex-col gap-2">
                          <p className="text-zinc-500 text-sm">{summary.quizzes.length} quiz{summary.quizzes.length > 1 ? "zes" : ""}</p>
                          {summary.quizzes.map((q) => (
                            <button
                              key={q.quizId}
                              onClick={() => setSelectedQuiz(q)}
                              className="flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-700 rounded-xl px-4 py-4 transition-all text-left group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-zinc-700 rounded-xl flex items-center justify-center text-lg">
                                  {q.mode === "csv" ? "📋" : "🎤"}
                                </div>
                                <div>
                                  <p className="text-white text-sm font-medium">{q.title}</p>
                                  <p className="text-zinc-500 text-xs mt-0.5">
                                    {q.mode === "csv" ? "MCQ Quiz" : "Oral Quiz"} · {q.results.length} student{q.results.length !== 1 ? "s" : ""}
                                  </p>
                                </div>
                              </div>
                              <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors text-lg">→</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {/* Quiz detail header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setSelectedQuiz(null)}
                                className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-all text-sm"
                              >
                                ←
                              </button>
                              <div>
                                <h3 className="text-white font-semibold">{selectedQuiz.title}</h3>
                                <p className="text-zinc-500 text-xs">
                                  {selectedQuiz.mode === "csv" ? "MCQ Quiz" : "Oral Quiz"} · {selectedQuiz.results.length} students
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => exportQuiz(selectedQuiz)}
                              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg transition-colors"
                            >
                              <span>↓</span> Export CSV
                            </button>
                          </div>

                          {selectedQuiz.results.length === 0 ? (
                            <p className="text-zinc-600 text-sm text-center py-8">No results recorded</p>
                          ) : (
                            <div className="flex flex-col divide-y divide-zinc-800 rounded-xl overflow-hidden border border-zinc-800">
                              {selectedQuiz.results.map((r: any, i) => {
                                const percent = r.scorePercent;
                                const name = r.studentName ?? r.student_name;
                                const roll = r.rollNumber ?? r.roll_number;
                                const scoreLabel = selectedQuiz.mode === "csv"
                                  ? `${r.totalCorrect}/${r.totalQuestions}`
                                  : `${r.marksObtained}/${r.totalMarks}`;

                                return (
                                  <div key={i} className="px-4 py-3.5 bg-zinc-800/30 hover:bg-zinc-800/60 transition-colors">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                                          i === 0 ? "bg-yellow-500/20 text-yellow-400" :
                                          i === 1 ? "bg-zinc-500/20 text-zinc-400" :
                                          i === 2 ? "bg-orange-500/20 text-orange-400" :
                                          "bg-zinc-700 text-zinc-500"
                                        }`}>
                                          {i + 1}
                                        </div>
                                        <div>
                                          <p className="text-white text-sm font-medium">{name}</p>
                                          <p className="text-zinc-500 text-xs">{roll}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className={`text-sm font-bold ${
                                          percent >= 70 ? "text-emerald-400" :
                                          percent >= 40 ? "text-yellow-400" : "text-red-400"
                                        }`}>
                                          {scoreLabel}
                                        </p>
                                        {r.remarks && (
                                          <p className="text-zinc-600 text-xs mt-0.5">{r.remarks}</p>
                                        )}
                                      </div>
                                    </div>
                                    <ScoreBar percent={percent} />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Logs Tab ── */}
                  {activeTab === "logs" && (
                    <div className="flex flex-col gap-1">
                      {logs.length === 0 ? (
                        <div className="text-center py-10">
                          <span className="text-3xl">📋</span>
                          <p className="text-zinc-600 text-sm mt-3">No activity logs</p>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          {logs.map((log, i) => (
                            <div key={i} className="flex items-start gap-3 py-3 border-b border-zinc-800/60 last:border-0">
                              <span className="text-base mt-0.5 shrink-0">{eventIcon(log.event_type)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm">
                                  {log.student_name ?? "System"}
                                  {log.roll_number && (
                                    <span className="text-zinc-500 text-xs ml-2">{log.roll_number}</span>
                                  )}
                                </p>
                                <p className="text-zinc-500 text-xs capitalize mt-0.5">
                                  {log.event_type.replace(/_/g, " ")}
                                </p>
                              </div>
                              <p className="text-zinc-600 text-xs shrink-0 mt-0.5">
                                {formatDate(log.timestamp)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}