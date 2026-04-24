
import { useEffect, useRef, useState } from "react";
import { Device } from "mediasoup-client";
import { getSocket } from "../lib/socket";

export function useSfuConsume(sessionId: string | undefined) {
  const socket = getSocket();
  const [isTeacherStreaming, setIsTeacherStreaming] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const transportRef = useRef<any>(null);
  const consumerRef = useRef<any>(null);

  const waitFor = (event: string, timeout = 10000): Promise<any> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout: ${event}`)), timeout);
      socket.once(event, (data) => { clearTimeout(timer); resolve(data); });
    });
  };

  const consumeStream = async (sid: string) => {
    try {
      // Step 1 — Get capabilities
      socket.emit("sfu:student-get-capabilities", { sessionId: sid });
      const capResult = await waitFor("sfu:capabilities");

      if (!capResult) return;

      // Step 2 — Load device
      const device = new Device();
      await device.load({ routerRtpCapabilities: capResult.rtpCapabilities });
      deviceRef.current = device;

      // Step 3 — Create consumer transport
      socket.emit("sfu:create-consumer-transport", { sessionId: sid });
      const transportParams = await waitFor("sfu:consumer-transport-created");

      const transport = device.createRecvTransport(transportParams);
      transportRef.current = transport;

      // Step 4 — Connect transport
      transport.on("connect", async ({ dtlsParameters }: any, callback: any, errback: any) => {
        try {
          socket.emit("sfu:connect-consumer-transport", { dtlsParameters });
          await waitFor("sfu:consumer-transport-connected");
          callback();
        } catch (err) {
          errback(err);
        }
      });

      // Step 5 — Consume
      socket.emit("sfu:consume", {
        sessionId: sid,
        rtpCapabilities: device.rtpCapabilities,
      });

      const consumerParams = await waitFor("sfu:consumed");
      const consumer = await transport.consume(consumerParams);
      consumerRef.current = consumer;

      // Step 6 — Attach to video element
      const stream = new MediaStream([consumer.track]);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setIsTeacherStreaming(true);
      console.log("[SFU] Consuming stream");

    } catch (err) {
      console.error("[SFU] Consume error:", err);
    }
  };

  const stopConsuming = () => {
    consumerRef.current?.close();
    transportRef.current?.close();
    consumerRef.current = null;
    transportRef.current = null;
    deviceRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTeacherStreaming(false);
  };

  useEffect(() => {
    if (!sessionId) return;

    // Teacher started streaming
    socket.on("sfu:stream-available", () => {
      setIsTeacherStreaming(true);
      consumeStream(sessionId);
    });

    // Teacher stopped
    socket.on("sfu:stream-stopped", () => {
      stopConsuming();
    });

    // No stream available
    socket.on("sfu:no-stream", () => {
      setIsTeacherStreaming(false);
    });

    // Check if stream already active (late join)
    socket.emit("sfu:student-get-capabilities", { sessionId });
    socket.once("sfu:capabilities", () => {
      consumeStream(sessionId);
    });
    socket.once("sfu:no-stream", () => {
      setIsTeacherStreaming(false);
    });

    return () => {
      socket.off("sfu:stream-available");
      socket.off("sfu:stream-stopped");
      socket.off("sfu:no-stream");
      stopConsuming();
    };
  }, [sessionId]);

  return { isTeacherStreaming, videoRef };
}