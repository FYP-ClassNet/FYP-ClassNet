import { Server as SocketServer, Socket } from "socket.io";

type WebRTCSessionDescription = {
  type: string;
  sdp?: string | null;
};

type WebRTCIceCandidate = {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
};

export function registerScreenSocketEvents(io: SocketServer, socket: Socket): void {

  // Teacher starts sharing — notify all students in session
  socket.on("screen:start", ({ sessionId }: { sessionId: string }) => {
    socket.to(sessionId).emit("screen:teacher-sharing", {
      teacherSocketId: socket.id,
    });
    console.log(`[Screen] Teacher ${socket.id} started sharing in session ${sessionId}`);
  });

  // Teacher stopped sharing
  socket.on("screen:stop", ({ sessionId }: { sessionId: string }) => {
    socket.to(sessionId).emit("screen:teacher-stopped");
    console.log(`[Screen] Teacher ${socket.id} stopped sharing`);
  });

  // Student wants to watch — tell teacher to create offer for this student
  socket.on("screen:request", ({ teacherSocketId }: { teacherSocketId: string }) => {
    io.to(teacherSocketId).emit("screen:new-viewer", {
      viewerSocketId: socket.id,
    });
    console.log(`[Screen] Student ${socket.id} requested stream from ${teacherSocketId}`);
  });

  // WebRTC signaling — teacher sends offer to specific student
  socket.on("screen:offer", ({ targetSocketId, offer }: { targetSocketId: string; offer: WebRTCSessionDescription }) => {
    io.to(targetSocketId).emit("screen:offer", {
      fromSocketId: socket.id,
      offer,
    });
  });

  // Student sends answer back to teacher
  socket.on("screen:answer", ({ targetSocketId, answer }: { targetSocketId: string; answer: WebRTCSessionDescription }) => {
    io.to(targetSocketId).emit("screen:answer", {
      fromSocketId: socket.id,
      answer,
    });
  });

  // ICE candidates exchange
  socket.on("screen:ice-candidate", ({ targetSocketId, candidate }: { targetSocketId: string; candidate: WebRTCIceCandidate }) => {
    io.to(targetSocketId).emit("screen:ice-candidate", {
      fromSocketId: socket.id,
      candidate,
    });
  });

  // Student disconnects — clean up peer connection on teacher side
  socket.on("disconnect", () => {
    socket.broadcast.emit("screen:viewer-left", {
      viewerSocketId: socket.id,
    });
  });
}