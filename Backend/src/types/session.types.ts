export interface Student {
  id: string;
  name: string;
  socketId: string;
  joinedAt: Date;
  isOnline: boolean;
}

export interface Session {
  id: string;
  code: string;
  teacherSocketId: string;
  students: Map<string, Student>; // studentId -> Student
  createdAt: Date;
  status: "active" | "ended";
}

export interface CreateSessionPayload {
  teacherSocketId: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  sessionCode: string;
  lanUrl: string;
}
