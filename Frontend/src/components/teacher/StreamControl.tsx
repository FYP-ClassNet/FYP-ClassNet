import { useStream } from "../../hooks/useStream";

interface Props {
  sessionId: string;
  onModeChange?: (mode: "screen" | "whiteboard" | null) => void;
}

export function StreamControl({ sessionId, onModeChange }: Props) {
  const { isStreaming, streamMode, error, startScreenShare, stopCapture } = useStream(sessionId);

  const handleScreenShare = () => {
    startScreenShare();
    onModeChange?.("screen");
  };

  const handleStop = () => {
    stopCapture();
    onModeChange?.(null);
  };

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-red-400 text-xs">{error}</span>}

      {!isStreaming ? (
        <button
          onClick={handleScreenShare}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-1.5 rounded-lg transition-all font-medium shadow-lg shadow-blue-900/30"
        >
          <span>🖥️</span> Share Screen
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-xs font-medium">
              {streamMode === "screen" ? "Screen Live" : "Whiteboard Live"}
            </span>
          </div>
          <button
            onClick={handleStop}
            className="flex items-center gap-2 bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white text-sm px-4 py-1.5 rounded-lg transition-all"
          >
            Stop
          </button>
        </div>
      )}
    </div>
  );
}