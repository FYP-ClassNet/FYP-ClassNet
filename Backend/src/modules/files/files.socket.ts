import { Server as SocketServer, Socket } from "socket.io";
import { filesService } from "./files.service.js";

export function registerFilesSocketEvents(_io: SocketServer, socket: Socket): void {
  // Student requests all files shared in session (on join)
  socket.on("files:get-all", ({ sessionId }: { sessionId: string }) => {
    const files = filesService.getSessionFiles(sessionId);
    socket.emit("files:list", { files: files.map(filesService.toEvent) });
  });
}