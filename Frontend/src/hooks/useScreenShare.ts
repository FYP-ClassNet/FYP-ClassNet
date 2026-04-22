import { useEffect, useRef, useState } from "react";
import { getSocket } from "../lib/socket";

export function useScreenShare(sessionId: string | undefined) {
  const socket = getSocket();
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});

  const createPeer = (viewerSocketId: string): RTCPeerConnection => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Add screen stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        peer.addTrack(track, streamRef.current!);
      });
    }

    // Send ICE candidates to viewer
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("screen:ice-candidate", {
          targetSocketId: viewerSocketId,
          candidate: event.candidate,
        });
      }
    };

    peersRef.current[viewerSocketId] = peer;
    return peer;
  };

  useEffect(() => {
    // New student wants to watch
    socket.on("screen:new-viewer", async ({ viewerSocketId }: { viewerSocketId: string }) => {
      if (!streamRef.current) return;

      const peer = createPeer(viewerSocketId);

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      socket.emit("screen:offer", {
        targetSocketId: viewerSocketId,
        offer,
      });
    });

    // Student sent answer
    socket.on("screen:answer", async ({ fromSocketId, answer }: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => {
      const peer = peersRef.current[fromSocketId];
      if (!peer) return;
      await peer.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // ICE candidate from student
    socket.on("screen:ice-candidate", async ({ fromSocketId, candidate }: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
      const peer = peersRef.current[fromSocketId];
      if (!peer) return;
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    });

    // Student left — close peer
    socket.on("screen:viewer-left", ({ viewerSocketId }: { viewerSocketId: string }) => {
      const peer = peersRef.current[viewerSocketId];
      if (peer) {
        peer.close();
        delete peersRef.current[viewerSocketId];
      }
    });

    return () => {
      socket.off("screen:new-viewer");
      socket.off("screen:answer");
      socket.off("screen:ice-candidate");
      socket.off("screen:viewer-left");
    };
  }, []);

  const startSharing = async () => {
    if (!sessionId) return;
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });

      streamRef.current = stream;
      setIsSharing(true);

      // Notify all students
      socket.emit("screen:start", { sessionId });

      // Stop sharing when user closes browser's screen share dialog
      stream.getVideoTracks()[0].onended = () => {
        stopSharing();
      };
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        setError("Failed to start screen share");
      }
    }
  };

  const stopSharing = () => {
    if (!sessionId) return;

    // Stop all tracks
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Close all peer connections
    Object.values(peersRef.current).forEach((p) => p.close());
    peersRef.current = {};

    setIsSharing(false);
    socket.emit("screen:stop", { sessionId });
  };

  return { isSharing, error, startSharing, stopSharing };
}