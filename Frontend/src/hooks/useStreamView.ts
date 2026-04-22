import { useEffect, useRef, useState } from "react";
import { getSocket } from "../lib/socket";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export function useStreamView(sessionId: string | undefined) {
  const socket = getSocket();
  const [isTeacherStreaming, setIsTeacherStreaming] = useState(false);
  const [streamMode, setStreamMode] = useState<"screen" | "whiteboard">("screen");
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isStreamingRef = useRef(false);

  const startPolling = (sid: string) => {
    if (pollRef.current) return;

    pollRef.current = setInterval(async () => {
      if (!isStreamingRef.current) return;
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/stream/${sid}/frame?t=${Date.now()}`
        );
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          setFrameSrc((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
        // Silently ignore 404 — no frame yet
      } catch {
        // ignore network errors
      }
    }, 150);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    isStreamingRef.current = false;
    setFrameSrc(null);
  };

  useEffect(() => {
    if (!sessionId) return;

    socket.on("stream:started", ({ mode }: { mode: "screen" | "whiteboard" }) => {
      setIsTeacherStreaming(true);
      setStreamMode(mode);
      isStreamingRef.current = true;
      startPolling(sessionId);
    });

    socket.on("stream:stopped", () => {
      setIsTeacherStreaming(false);
      stopPolling();
    });

    socket.on("stream:mode-changed", ({ mode }: { mode: "screen" | "whiteboard" }) => {
      setStreamMode(mode);
    });

    return () => {
      socket.off("stream:started");
      socket.off("stream:stopped");
      socket.off("stream:mode-changed");
      stopPolling();
    };
  }, [sessionId]);

  return { isTeacherStreaming, streamMode, frameSrc };
}