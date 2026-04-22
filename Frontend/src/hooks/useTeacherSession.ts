import { useEffect, useState } from "react";
import { getSocket } from "../lib/socket";

interface SessionData {
  sessionId: string;
  sessionCode: string;
  lanUrl: string;
}

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  joinedAt: string;
  isOnline: boolean;
}

interface RaisedHand {
  studentId: string;
  studentName: string;
  raisedAt: string;
}

const SESSION_KEY = "classnet_teacher_session";

export function useTeacherSession() {
  const socket = getSocket();
  const [session, setSession] = useState<SessionData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRejoining, setIsRejoining] = useState(false);

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      setIsConnected(true);

      // Try to rejoin saved session on reconnect
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        try {
          const savedSession = JSON.parse(saved);
          setIsRejoining(true);
          socket.emit("session:rejoin", { sessionId: savedSession.sessionId });
        } catch {
          sessionStorage.removeItem(SESSION_KEY);
        }
      }
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("session:created", (data: SessionData) => {
      setSession(data);
      setIsLoading(false);
      // Save to sessionStorage
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    });

    // Successfully rejoined after reload
    socket.on("session:rejoined", (data: SessionData) => {
      setSession(data);
      setIsRejoining(false);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
      console.log("[Teacher] Rejoined session:", data.sessionCode);
    });

    // Rejoin failed — session ended while teacher was away
    socket.on("session:rejoin-failed", () => {
      setIsRejoining(false);
      sessionStorage.removeItem(SESSION_KEY);
      setSession(null);
    });

    socket.on("session:ended", () => {
      setSession(null);
      setStudents([]);
      setRaisedHands([]);
      sessionStorage.removeItem(SESSION_KEY);
    });

    socket.on("session:student-list-updated", (data: { studentList: any[] }) => {
      setStudents(
        data.studentList.map((s) => ({
          id: s.id,
          name: s.name,
          rollNumber: s.roll_number,
          joinedAt: s.joined_at,
          isOnline: s.is_online === 1 || s.is_online === true,
        }))
      );
    });

    socket.on("hand:new", (data: RaisedHand) => {
      setRaisedHands((prev) => {
        const exists = prev.find((h) => h.studentId === data.studentId);
        if (exists) return prev;
        return [...prev, data];
      });
    });

    socket.on("hand:dismissed", ({ studentId }: { studentId: string }) => {
      setRaisedHands((prev) => prev.filter((h) => h.studentId !== studentId));
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("session:created");
      socket.off("session:rejoined");
      socket.off("session:rejoin-failed");
      socket.off("session:ended");
      socket.off("session:student-list-updated");
      socket.off("hand:new");
      socket.off("hand:dismissed");
    };
  }, []);

  const createSession = () => {
    setIsLoading(true);
    socket.emit("session:create");
  };

  const endSession = () => {
    if (!session) return;
    socket.emit("session:end", { sessionId: session.sessionId });
    setSession(null);
    setStudents([]);
    setRaisedHands([]);
    sessionStorage.removeItem(SESSION_KEY);
  };

  const dismissHand = (studentId: string) => {
    if (!session) return;
    socket.emit("hand:dismiss", { sessionId: session.sessionId, studentId });
  };

  return {
    session,
    students,
    raisedHands,
    isConnected,
    isLoading,
    isRejoining,
    createSession,
    endSession,
    dismissHand,
  };
}