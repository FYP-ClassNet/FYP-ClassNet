import { useEffect, useRef, useState } from "react";
import { getSocket } from "../lib/socket";

export function useScreenReceive(sessionId: string | undefined) {
  const socket = getSocket();
  const [isTeacherSharing, setIsTeacherSharing] = useState(false);
  const [teacherSocketId, setTeacherSocketId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    // Teacher started sharing
    socket.on("screen:teacher-sharing", ({ teacherSocketId }: { teacherSocketId: string }) => {
      setIsTeacherSharing(true);
      setTeacherSocketId(teacherSocketId);
    });

    // Teacher stopped
    socket.on("screen:teacher-stopped", () => {
      setIsTeacherSharing(false);
      setTeacherSocketId(null);
      peerRef.current?.close();
      peerRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    });

    // Teacher sent offer
    socket.on("screen:offer", async ({ fromSocketId, offer }: { fromSocketId: string; offer: RTCSessionDescriptionInit }) => {
      const peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      peerRef.current = peer;

      // Receive video track — attach to video element
      peer.ontrack = (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      // Send ICE candidates to teacher
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("screen:ice-candidate", {
            targetSocketId: fromSocketId,
            candidate: event.candidate,
          });
        }
      };

      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("screen:answer", {
        targetSocketId: fromSocketId,
        answer,
      });
    });

    // ICE candidate from teacher
    socket.on("screen:ice-candidate", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (peerRef.current) {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    return () => {
      socket.off("screen:teacher-sharing");
      socket.off("screen:teacher-stopped");
      socket.off("screen:offer");
      socket.off("screen:ice-candidate");
    };
  }, []);

  // Request stream when teacher is already sharing and student joins
  const requestStream = () => {
    if (!sessionId || !teacherSocketId) return;
    socket.emit("screen:request", { sessionId, teacherSocketId });
  };

  return { isTeacherSharing, teacherSocketId, videoRef, requestStream };
}