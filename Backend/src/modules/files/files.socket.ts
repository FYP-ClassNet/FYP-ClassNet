import { Server as SocketServer, Socket } from "socket.io";
import { filesService } from "./files.service.js";

export function registerFilesSocketEvents(_io: SocketServer, socket: Socket): void {
  socket.on("files:get-all", async ({ sessionId }: { sessionId: string }) => {
    const files = await filesService.getSessionFiles(sessionId);
    socket.emit("files:list", { files: files.map(filesService.toEvent) });
  });
}