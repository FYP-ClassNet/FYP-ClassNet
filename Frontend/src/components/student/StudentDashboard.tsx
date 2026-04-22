interface StudentData {
  studentId: string;
  name: string;
  sessionId: string;
  sessionCode: string;
  rollNumber: string;
}

interface SharedFile {
  fileId: string;
  originalName: string;
  fileUrl: string;
  category: string;
  sizeBytes: number;
}

interface Props {
  studentData: StudentData;
  attendanceStatus: string | null;
  handRaised: boolean;
  files: SharedFile[];
  sessionEnded: boolean;
  onRaiseHand: () => void;
  onLowerHand: () => void;
}

export function StudentDashboard({
  studentData,
  attendanceStatus,
  handRaised,
  files,
  sessionEnded,
  onRaiseHand,
  onLowerHand,
}: Props) {
  if (sessionEnded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
          <p className="text-white font-semibold text-lg">Class Ended</p>
          <p className="text-zinc-500 text-sm mt-2">The teacher has ended the session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-5">

        {/* Header */}
// Replace the header section inside StudentDashboard
<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
  <div>
    <p className="text-white font-semibold">{studentData.name}</p>
    <p className="text-zinc-500 text-xs mt-0.5">
      {studentData.rollNumber} · Session: {studentData.sessionCode}
    </p>
  </div>
  {attendanceStatus && (
    <span
      className={`text-xs px-3 py-1 rounded-full font-medium ${
        attendanceStatus === "present"
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-yellow-500/10 text-yellow-400"
      }`}
    >
      {attendanceStatus === "present" ? "Present" : "Late"}
    </span>
  )}
</div>

        {/* Raise Hand */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col items-center gap-4">
          <p className="text-zinc-400 text-sm">Have a question?</p>
          <button
            onClick={handRaised ? onLowerHand : onRaiseHand}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              handRaised
                ? "bg-yellow-500/20 border border-yellow-500/40 text-yellow-400"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {handRaised ? "✋ Hand Raised — Click to Lower" : "Raise Hand"}
          </button>
        </div>

        {/* Files */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">
            Shared Files
            {files.length > 0 && (
              <span className="ml-2 text-zinc-500 text-sm font-normal">({files.length})</span>
            )}
          </h2>

          {files.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-6">
              No files shared yet
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {files.map((file) => (
                <a
                  key={file.fileId}
                  href={file.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between bg-zinc-800 hover:bg-zinc-700 rounded-lg px-4 py-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded">
                      {file.category.toUpperCase()}
                    </span>
                    <span className="text-white text-sm">{file.originalName}</span>
                  </div>
                  <span className="text-zinc-500 text-xs">
                    {(file.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}