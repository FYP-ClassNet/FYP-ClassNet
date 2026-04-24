import { useSfuPublish } from "../../hooks/useSfuPublish";

interface Props {
  sessionId: string;
}

export function SfuScreenShare({ sessionId }: Props) {
  const { isStreaming, error, startScreenShare, stopSharing } = useSfuPublish(sessionId);

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-red-400 text-xs">{error}</span>}

      {!isStreaming ? (
        <button
          onClick={startScreenShare}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-1.5 rounded-lg transition-all font-medium shadow-lg shadow-blue-900/30"
        >
          <span>🖥️</span> Share Screen
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-xs font-medium">Live — SFU</span>
          </div>
          <button
            onClick={stopSharing}
            className="flex items-center gap-2 bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white text-sm px-4 py-1.5 rounded-lg transition-all"
          >
            Stop Sharing
          </button>
        </div>
      )}
    </div>
  );
}