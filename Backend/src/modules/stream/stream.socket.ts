import { Server as SocketServer, Socket } from "socket.io";

// Track active streams: sessionId -> mode
const activeStreams = new Map<string, "screen" | "whiteboard">();

export function registerStreamSocketEvents(io: SocketServer, socket: Socket): void {

  // Teacher started streaming
  socket.on("stream:start", ({ sessionId, mode }: { sessionId: string; mode: "screen" | "whiteboard" }) => {
    activeStreams.set(sessionId, mode);
    socket.to(sessionId).emit("stream:started", { mode });
    console.log(`[Stream] Started ${mode} in session ${sessionId}`);
  });

  // Teacher stopped streaming
  socket.on("stream:stop", ({ sessionId }: { sessionId: string }) => {
    activeStreams.delete(sessionId);
    socket.to(sessionId).emit("stream:stopped");
    console.log(`[Stream] Stopped in session ${sessionId}`);
  });

  // Teacher switched mode
  socket.on("stream:mode-change", ({ sessionId, mode }: { sessionId: string; mode: "screen" | "whiteboard" }) => {
    activeStreams.set(sessionId, mode);
    socket.to(sessionId).emit("stream:mode-changed", { mode });
  });

  // Student checks if stream is active when joining
  socket.on("stream:check", ({ sessionId }: { sessionId: string }) => {
    const mode = activeStreams.get(sessionId);
    if (mode) {
      socket.emit("stream:started", { mode });
      console.log(`[Stream] Late student checked — stream active: ${mode}`);
    } else {
      socket.emit("stream:none");
    }
  });

  // Clean up on teacher disconnect
  socket.on("disconnect", () => {
    for (const [sessionId] of activeStreams) {
      activeStreams.delete(sessionId);
    }
  });
}