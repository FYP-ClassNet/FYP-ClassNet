import { useRef, useState } from "react";
import { Device } from "mediasoup-client";
import { getSocket } from "../lib/socket";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export function useSfuPublish(sessionId: string | undefined) {
  const socket = getSocket();
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const producerRef = useRef<any>(null);
  const transportRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const waitFor = (event: string): Promise<any> => {
    return new Promise((resolve) => socket.once(event, resolve));
  };

  const startScreenShare = async () => {
    if (!sessionId) return;
    setError(null);

    try {
      // Step 1 — Get screen stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });
      streamRef.current = stream;

      // Step 2 — Get router RTP capabilities
      socket.emit("sfu:get-capabilities", { sessionId });
      const { rtpCapabilities } = await waitFor("sfu:capabilities");

      // Step 3 — Load device
      const device = new Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;

      // Step 4 — Create producer transport
      socket.emit("sfu:create-producer-transport", { sessionId });
      const transportParams = await waitFor("sfu:producer-transport-created");

      const transport = device.createSendTransport(transportParams);
      transportRef.current = transport;

      // Step 5 — Connect transport
      transport.on("connect", async ({ dtlsParameters }: any, callback: any, errback: any) => {
        try {
          socket.emit("sfu:connect-producer-transport", { sessionId, dtlsParameters });
          await waitFor("sfu:producer-transport-connected");
          callback();
        } catch (err) {
          errback(err);
        }
      });

      // Step 6 — Produce
      transport.on("produce", async ({ kind, rtpParameters }: any, callback: any, errback: any) => {
        try {
          socket.emit("sfu:produce", { sessionId, kind, rtpParameters });
          const { id } = await waitFor("sfu:produced");
          callback({ id });
        } catch (err) {
          errback(err);
        }
      });

      const videoTrack = stream.getVideoTracks()[0];
      const producer = await transport.produce({ track: videoTrack });
      producerRef.current = producer;

      setIsStreaming(true);
      console.log("[SFU] Publishing screen share");

      // Stop when user closes screen share dialog
      videoTrack.onended = () => stopSharing();

    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        setError("Failed to start screen share");
        console.error("[SFU] Publish error:", err);
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    }
  };

  const stopSharing = () => {
    if (!sessionId) return;

    producerRef.current?.close();
    transportRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());

    producerRef.current = null;
    transportRef.current = null;
    streamRef.current = null;
    deviceRef.current = null;

    setIsStreaming(false);
    socket.emit("sfu:stop-producing", { sessionId });
    console.log("[SFU] Stopped publishing");
  };

  return { isStreaming, error, startScreenShare, stopSharing };
}