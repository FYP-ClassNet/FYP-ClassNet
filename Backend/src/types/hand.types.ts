export interface RaiseHandEvent {
  studentId: string;
  studentName: string;
  sessionId: string;
  raisedAt: Date;
}

export interface HandDismissedEvent {
  studentId: string;
  sessionId: string;
}