import { useStreamView } from "../../hooks/useStreamView";

interface Props {
  sessionId: string;
}

export function StreamViewer({ sessionId }: Props) {
  const { isTeacherStreaming, streamMode, frameSrc } = useStreamView(sessionId);

  if (!isTeacherStreaming) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold text-sm">Lecture Screen</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <span className="text-4xl">🖥️</span>
          <p className="text-zinc-500 text-sm">Teacher is not sharing</p>
          <p className="text-zinc-600 text-xs">Screen or whiteboard will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-white font-semibold text-sm">
            {streamMode === "whiteboard" ? "Whiteboard" : "Screen Share"}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 text-xs font-medium">Live</span>
        </div>
      </div>

      <div className="bg-zinc-950">
        {frameSrc ? (
          <img
            src={frameSrc}
            alt="Live stream"
            className="w-full object-contain"
          />
        ) : (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}