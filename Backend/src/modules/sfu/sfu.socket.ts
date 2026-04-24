import { Server as SocketServer, Socket } from "socket.io";
import {
  getOrCreateRouter,
  createProducerTransport,
  connectProducerTransport,
  createProducer,
  createConsumerTransport,
  connectConsumerTransport,
  createConsumer,
  getRouterRtpCapabilities,
  hasProducer,
  cleanupSession,
  cleanupConsumer,
} from "./sfu.manager.js";
import * as mediasoup from "mediasoup";

export function registerSfuSocketEvents(io: SocketServer, socket: Socket): void {

  // ── Teacher ──

  // Step 1: Teacher gets router RTP capabilities
  socket.on("sfu:get-capabilities", async ({ sessionId }: { sessionId: string }) => {
    try {
      await getOrCreateRouter(sessionId);
      const rtpCapabilities = getRouterRtpCapabilities(sessionId);
      socket.emit("sfu:capabilities", { rtpCapabilities });
    } catch (err: any) {
      socket.emit("sfu:error", { message: err.message });
    }
  });

  // Step 2: Teacher creates producer transport
  socket.on("sfu:create-producer-transport", async ({ sessionId }: { sessionId: string }) => {
    try {
      const params = await createProducerTransport(sessionId);
      socket.emit("sfu:producer-transport-created", params);
    } catch (err: any) {
      socket.emit("sfu:error", { message: err.message });
    }
  });

  // Step 3: Teacher connects producer transport
  socket.on("sfu:connect-producer-transport", async ({
    sessionId,
    dtlsParameters,
  }: {
    sessionId: string;
    dtlsParameters: mediasoup.types.DtlsParameters;
  }) => {
    try {
      await connectProducerTransport(sessionId, dtlsParameters);
      socket.emit("sfu:producer-transport-connected");
    } catch (err: any) {
      socket.emit("sfu:error", { message: err.message });
    }
  });

  // Step 4: Teacher produces (starts streaming)
  socket.on("sfu:produce", async ({
    sessionId,
    kind,
    rtpParameters,
  }: {
    sessionId: string;
    kind: mediasoup.types.MediaKind;
    rtpParameters: mediasoup.types.RtpParameters;
  }) => {
    try {
      const { id } = await createProducer(sessionId, kind, rtpParameters);

      socket.emit("sfu:produced", { id });

      // Notify all students that stream is available
      socket.to(sessionId).emit("sfu:stream-available");
      console.log(`[SFU] Teacher started streaming in session ${sessionId}`);
    } catch (err: any) {
      socket.emit("sfu:error", { message: err.message });
    }
  });

  // Teacher stops streaming
  socket.on("sfu:stop-producing", ({ sessionId }: { sessionId: string }) => {
    cleanupSession(sessionId);
    socket.to(sessionId).emit("sfu:stream-stopped");
    console.log(`[SFU] Teacher stopped streaming in session ${sessionId}`);
  });

  // ── Student ──

  // Step 1: Student gets router capabilities
  socket.on("sfu:student-get-capabilities", async ({ sessionId }: { sessionId: string }) => {
    try {
      if (!hasProducer(sessionId)) {
        socket.emit("sfu:no-stream");
        return;
      }
      const rtpCapabilities = getRouterRtpCapabilities(sessionId);
      socket.emit("sfu:capabilities", { rtpCapabilities });
    } catch (err: any) {
      socket.emit("sfu:error", { message: err.message });
    }
  });

  // Step 2: Student creates consumer transport
  socket.on("sfu:create-consumer-transport", async ({ sessionId }: { sessionId: string }) => {
    try {
      const params = await createConsumerTransport(socket.id, sessionId);
      socket.emit("sfu:consumer-transport-created", params);
    } catch (err: any) {
      socket.emit("sfu:error", { message: err.message });
    }
  });

  // Step 3: Student connects consumer transport
  socket.on("sfu:connect-consumer-transport", async ({
    dtlsParameters,
  }: {
    dtlsParameters: mediasoup.types.DtlsParameters;
  }) => {
    try {
      await connectConsumerTransport(socket.id, dtlsParameters);
      socket.emit("sfu:consumer-transport-connected");
    } catch (err: any) {
      socket.emit("sfu:error", { message: err.message });
    }
  });

  // Step 4: Student consumes stream
  socket.on("sfu:consume", async ({
    sessionId,
    rtpCapabilities,
  }: {
    sessionId: string;
    rtpCapabilities: mediasoup.types.RtpCapabilities;
  }) => {
    try {
      const params = await createConsumer(socket.id, sessionId, rtpCapabilities);
      socket.emit("sfu:consumed", params);
    } catch (err: any) {
      socket.emit("sfu:error", { message: err.message });
    }
  });

  // Cleanup on disconnect
  socket.on("disconnect", () => {
    cleanupConsumer(socket.id);
  });
}