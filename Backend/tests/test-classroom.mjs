import { io } from "socket.io-client";

const URL = "http://localhost:3000";

// --- Teacher ---
const teacher = io(URL);
let sessionId = "";
let sessionCode = "";

teacher.on("connect", () => {
  console.log("👩‍🏫 Teacher connected:", teacher.id);
  teacher.emit("session:create");
});

teacher.on("session:created", (data) => {
  sessionId = data.sessionId;
  sessionCode = data.sessionCode;
  console.log(`✅ Session: ${sessionCode} | URL: ${data.lanUrl}`);

  // Student joins after teacher creates session
  setTimeout(() => joinAsStudent("Ahmed"), 500);
  setTimeout(() => joinAsStudent("Sara"), 800);
});

teacher.on("session:student-list-updated", (data) => {
  console.log(`👥 Student ${data.event}:`, data.student.name, `| Total: ${data.studentList.length}`);
});

teacher.on("hand:new", (data) => {
  console.log(`✋ ${data.studentName} raised hand`);

  // Teacher dismisses after 1s
  setTimeout(() => {
    teacher.emit("hand:dismiss", { sessionId, studentId: data.studentId });
  }, 1000);
});

// --- Student factory ---
function joinAsStudent(name) {
  const student = io(URL);

  student.on("connect", () => {
    console.log(`👨‍🎓 ${name} connected`);
    student.emit("student:join", { sessionCode, name });
  });

  student.on("student:joined", (data) => {
    console.log(`✅ ${name} joined | studentId: ${data.studentId}`);

    student.emit("attendance:mark", {
      sessionId: data.sessionId,
      studentId: data.studentId,
      studentName: name,
    });

    // Raise hand after 2s
    setTimeout(() => {
      student.emit("hand:raise", {
        sessionId: data.sessionId,
        studentId: data.studentId,
        studentName: name,
      });
    }, 2000);
  });

  student.on("attendance:confirmed", (data) => {
    console.log(`✅ ${name} attendance: ${data.status}`);
  });

  student.on("hand:raised", () => console.log(`✋ ${name} hand raised`));
  student.on("hand:dismissed-by-teacher", () => console.log(`👩‍🏫 ${name} hand dismissed by teacher`));
  student.on("session:ended", () => {
    console.log(`🔴 ${name} session ended`);
    student.disconnect();
  });
}

// End session after 6s
setTimeout(() => {
  console.log("🔴 Ending session...");
  teacher.emit("session:end", { sessionId });
  setTimeout(() => process.exit(0), 1000);
}, 6000);