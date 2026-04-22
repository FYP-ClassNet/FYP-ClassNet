import { useEffect, useRef, useState } from "react";
import { getSocket } from "../lib/socket";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
const FRAME_INTERVAL_MS = 150; // ~6fps

export function useStream(sessionId: string | undefined) {
  const socket = getSocket();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamMode, setStreamMode] = useState<"screen" | "whiteboard">("screen");
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stopCapture = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setIsStreaming(false);

    if (sessionId) {
      socket.emit("stream:stop", { sessionId });
      fetch(`${BACKEND_URL}/api/stream/${sessionId}/frame`, { method: "DELETE" });
    }
  };

  const startScreenShare = async () => {
    if (!sessionId) return;
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 10, width: 1280, height: 720 },
        audio: false,
      });

      screenStreamRef.current = stream;

      // Create hidden video element to capture stream
      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();
      videoRef.current = video;

      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      canvasRef.current = canvas;

      setIsStreaming(true);
      setStreamMode("screen");
      socket.emit("stream:start", { sessionId, mode: "screen" });

      // Capture + post frames
      intervalRef.current = setInterval(async () => {
        if (!video.videoWidth) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0);

        canvas.toBlob(async (blob) => {
          if (!blob || !sessionId) return;
          await fetch(`${BACKEND_URL}/api/stream/${sessionId}/frame`, {
            method: "POST",
            headers: { "Content-Type": "image/jpeg" },
            body: blob,
          });
        }, "image/jpeg", 0.6);
      }, FRAME_INTERVAL_MS);

      // Stop when user closes screen share dialog
      stream.getVideoTracks()[0].onended = stopCapture;

    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        setError("Failed to start screen share");
      }
    }
  };

  const startWhiteboard = () => {
    if (!sessionId) return;
    setIsStreaming(true);
    setStreamMode("whiteboard");
    socket.emit("stream:start", { sessionId, mode: "whiteboard" });
  };

  const postWhiteboardFrame = async (canvas: HTMLCanvasElement) => {
    if (!sessionId || !isStreaming) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      await fetch(`${BACKEND_URL}/api/stream/${sessionId}/frame`, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
    }, "image/jpeg", 0.8);
  };

  const switchMode = (mode: "screen" | "whiteboard") => {
    if (!sessionId) return;
    setStreamMode(mode);
    socket.emit("stream:mode-change", { sessionId, mode });

    if (mode === "screen") {
      startScreenShare();
    } else {
      // Stop screen capture but keep streaming
      if (intervalRef.current) clearInterval(intervalRef.current);
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      startWhiteboard();
    }
  };

  useEffect(() => {
    return () => stopCapture();
  }, []);

  return {
    isStreaming,
    streamMode,
    error,
    startScreenShare,
    startWhiteboard,
    stopCapture,
    switchMode,
    postWhiteboardFrame,
  };
}