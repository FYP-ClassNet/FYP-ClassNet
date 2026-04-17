export interface JoinSessionPayload {
  sessionCode: string;
  name: string;
}

export interface StudentJoinedResponse {
  studentId: string;
  name: string;
  sessionId: string;
  sessionCode: string;
}

export interface StudentListItem {
  id: string;
  name: string;
  joinedAt: Date;
  isOnline: boolean;
}