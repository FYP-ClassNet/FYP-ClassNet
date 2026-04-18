import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);

  // Step 1: Teacher creates session
  socket.emit("session:create");
});

socket.on("session:created", (data) => {
  console.log("✅ Session Created:", data);
  // { sessionId, sessionCode, lanUrl }

  // Step 2: Mark attendance after join
  socket.emit("attendance:mark", {
    sessionId: data.sessionId,
    studentId: "test-student-001",
    studentName: "Ali Khan",
  });

  // Step 3: Raise hand
  setTimeout(() => {
    socket.emit("hand:raise", {
      sessionId: data.sessionId,
      studentId: "test-student-001",
      studentName: "Ali Khan",
    });
  }, 1000);

  // Step 4: End session after 3s
  setTimeout(() => {
    socket.emit("session:end", { sessionId: data.sessionId });
  }, 3000);
});

socket.on("attendance:confirmed", (data) => {
  console.log("✅ Attendance Confirmed:", data);
});

socket.on("hand:raised", (data) => {
  console.log("✅ Hand Raised:", data);
});

socket.on("hand:new", (data) => {
  console.log("✅ Teacher sees hand:", data);
});

socket.on("session:ended", (data) => {
  console.log("✅ Session Ended:", data);
  process.exit(0);
});

socket.on("error", (err) => {
  console.error("❌ Error:", err);
});