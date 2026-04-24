import { useSfuConsume } from "../../hooks/useSfuConsume";

interface Props {
  sessionId: string;
}

export function SfuViewer({ sessionId }: Props) {
  const { isTeacherStreaming, videoRef } = useSfuConsume(sessionId);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-white font-semibold text-sm">Lecture Screen</h2>
        {isTeacherStreaming && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-xs font-medium">Live</span>
          </div>
        )}
      </div>

      {!isTeacherStreaming ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <span className="text-4xl">🖥️</span>
          <p className="text-zinc-500 text-sm">Teacher is not sharing</p>
          <p className="text-zinc-600 text-xs">Screen will appear here when class starts</p>
        </div>
      ) : (
        <div className="bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full object-contain max-h-[70vh]"
          />
        </div>
      )}
    </div>
  );
}