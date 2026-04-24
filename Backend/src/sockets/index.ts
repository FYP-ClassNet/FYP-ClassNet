import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { registerSessionSocketEvents } from "../modules/session/session.socket.js";
import { registerStudentSocketEvents } from "../modules/student/student.socket.js";
import { registerAttendanceSocketEvents } from "../modules/attendance/attendance.socket.js";
import { registerFilesSocketEvents } from "../modules/files/files.socket.js";
import { registerHandSocketEvents } from "../modules/hand/hand.socket.js";
import { registerQuizSocketEvents } from "../modules/quiz/quiz.socket.js";
import { registerStreamSocketEvents } from "../modules/stream/stream.socket.js";
import { registerSfuSocketEvents } from "../modules/sfu/sfu.socket.js";

let io: SocketServer;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    registerSessionSocketEvents(io, socket);
    registerStudentSocketEvents(io, socket);
     registerAttendanceSocketEvents(io, socket);
     registerFilesSocketEvents(io, socket);
         registerHandSocketEvents(io, socket);
             registerQuizSocketEvents(io, socket);
           registerStreamSocketEvents(io, socket);  
           registerSfuSocketEvents(io, socket);

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}