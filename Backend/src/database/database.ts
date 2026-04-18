import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "classnet.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = createClient({
  url: `file:${DB_PATH}`,
});

export async function initDatabase(): Promise<void> {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      teacher_socket_id TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      roll_number TEXT NOT NULL,
      socket_id TEXT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_online INTEGER DEFAULT 1,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      roll_number TEXT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      left_at DATETIME,
      status TEXT DEFAULT 'present',
      reconnect_count INTEGER DEFAULT 0,
      total_online_seconds INTEGER DEFAULT 0,
      UNIQUE(session_id, student_id),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_url TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      category TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS raised_hands (
      student_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      raised_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (student_id, session_id),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      student_id TEXT,
      roll_number TEXT,
      student_name TEXT,
      event_type TEXT NOT NULL,
      event_data TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  mode TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  question_text TEXT,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_option TEXT,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  selected_option TEXT NOT NULL,
  is_correct INTEGER,
  answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(quiz_id, question_id, student_id),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
);
  `);

  console.log("[DB] Database initialized at", DB_PATH);
}

export default db;