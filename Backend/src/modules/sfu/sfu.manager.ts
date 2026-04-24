import * as mediasoup from "mediasoup";
import os from "os";
const config = {
  worker: {
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
    logLevel: "warn" as mediasoup.types.WorkerLogLevel,
    logTags: ["info", "ice", "dtls", "rtp"] as mediasoup.types.WorkerLogTag[],
  },
  router: {
    mediaCodecs: [
      {
        kind: "video" as mediasoup.types.MediaKind,
        mimeType: "video/VP8",
        clockRate: 90000,
        preferredPayloadType: 100,
        parameters: {},
      },
      {
        kind: "audio" as mediasoup.types.MediaKind,
        mimeType: "audio/opus",
        clockRate: 48000,
        preferredPayloadType: 101,
        channels: 2,
      },
    ] as mediasoup.types.RtpCodecCapability[],
  },
  webRtcTransport: {
    listenIps: [
      {
        ip: "0.0.0.0",
        announcedIp: getLocalIp(),
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    maxIncomingBitrate: 10000000,
  },
};

function getLocalIp(): string {
 
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

// One worker per CPU core (use 1 for simplicity)
let worker: mediasoup.types.Worker;

// sessionId → Router
const routers = new Map<string, mediasoup.types.Router>();

// sessionId → teacher ProducerTransport
const producerTransports = new Map<string, mediasoup.types.WebRtcTransport>();

// sessionId → teacher Producer
const producers = new Map<string, mediasoup.types.Producer>();

// socketId → ConsumerTransport
const consumerTransports = new Map<string, mediasoup.types.WebRtcTransport>();

// socketId → Consumer
const consumers = new Map<string, mediasoup.types.Consumer>();

export async function initMediasoup(): Promise<void> {
  worker = await mediasoup.createWorker(config.worker);
  worker.on("died", () => {
    console.error("[SFU] Worker died — restarting");
    process.exit(1);
  });
  console.log("[SFU] Worker created");
}

export async function getOrCreateRouter(sessionId: string): Promise<mediasoup.types.Router> {
  if (routers.has(sessionId)) return routers.get(sessionId)!;

  const router = await worker.createRouter({ mediaCodecs: config.router.mediaCodecs });
  routers.set(sessionId, router);
  console.log(`[SFU] Router created for session ${sessionId}`);
  return router;
}

export async function createProducerTransport(sessionId: string) {
  const router = await getOrCreateRouter(sessionId);
  const transport = await router.createWebRtcTransport(config.webRtcTransport);

  producerTransports.set(sessionId, transport);

  return {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
  };
}

export async function connectProducerTransport(sessionId: string, dtlsParameters: mediasoup.types.DtlsParameters) {
  const transport = producerTransports.get(sessionId);
  if (!transport) throw new Error("Producer transport not found");
  await transport.connect({ dtlsParameters });
}

export async function createProducer(sessionId: string, kind: mediasoup.types.MediaKind, rtpParameters: mediasoup.types.RtpParameters) {
  const transport = producerTransports.get(sessionId);
  if (!transport) throw new Error("Producer transport not found");

  const producer = await transport.produce({ kind, rtpParameters });
  producers.set(sessionId, producer);

  console.log(`[SFU] Producer created for session ${sessionId}`);
  return { id: producer.id };
}

export async function createConsumerTransport(socketId: string, sessionId: string) {
  const router = await getOrCreateRouter(sessionId);
  const transport = await router.createWebRtcTransport(config.webRtcTransport);

  consumerTransports.set(socketId, transport);

  return {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
  };
}

export async function connectConsumerTransport(socketId: string, dtlsParameters: mediasoup.types.DtlsParameters) {
  const transport = consumerTransports.get(socketId);
  if (!transport) throw new Error("Consumer transport not found");
  await transport.connect({ dtlsParameters });
}

export async function createConsumer(socketId: string, sessionId: string, rtpCapabilities: mediasoup.types.RtpCapabilities) {
  const router = routers.get(sessionId);
  const producer = producers.get(sessionId);
  const transport = consumerTransports.get(socketId);

  if (!router || !producer || !transport) {
    throw new Error("Router, producer or transport not found");
  }
  if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
    throw new Error("Cannot consume — incompatible RTP capabilities");
  }

  const consumer = await transport.consume({
    producerId: producer.id,
    rtpCapabilities,
    paused: false,
  });

  consumers.set(socketId, consumer);

  return {
    id: consumer.id,
    producerId: producer.id,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
  };
}

export function getRouterRtpCapabilities(sessionId: string) {
  const router = routers.get(sessionId);
  if (!router) throw new Error("Router not found");
  return router.rtpCapabilities;
}

export function hasProducer(sessionId: string): boolean {
  return producers.has(sessionId);
}

export function cleanupSession(sessionId: string) {
  producers.get(sessionId)?.close();
  producerTransports.get(sessionId)?.close();
  routers.get(sessionId)?.close();
  producers.delete(sessionId);
  producerTransports.delete(sessionId);
  routers.delete(sessionId);
  console.log(`[SFU] Cleaned up session ${sessionId}`);
}

export function cleanupConsumer(socketId: string) {
  consumers.get(socketId)?.close();
  consumerTransports.get(socketId)?.close();
  consumers.delete(socketId);
  consumerTransports.delete(socketId);
}