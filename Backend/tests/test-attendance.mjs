import { io } from "socket.io-client";

const URL = "http://localhost:3000";

function waitFor(socket, event, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${event}`)), timeout);
    socket.once(event, (data) => { clearTimeout(timer); resolve(data); });
  });
}

async function run() {
  // Teacher creates session
  const teacher = io(URL);
  await waitFor(teacher, "connect");
  teacher.emit("session:create");
  const { sessionCode, sessionId } = await waitFor(teacher, "session:created");
  console.log(`✅ Session: ${sessionCode}`);

  // Student joins
  const student = io(URL);
  await waitFor(student, "connect");
  student.emit("student:join", {
    sessionCode,
    name: "Ali Khan",
    rollNumber: "F22BINFT001",
  });
  const joined = await waitFor(student, "student:joined");
  console.log(`✅ Student joined: ${joined.name}`);

  // Mark attendance
  student.emit("attendance:mark", {
    sessionId: joined.sessionId,
    studentId: joined.studentId,
    studentName: joined.name,
    rollNumber: joined.rollNumber,
  });
  const att = await waitFor(student, "attendance:confirmed");
  console.log(`✅ Attendance confirmed — status: ${att.status}`);

  // REST — get summary
  const res = await fetch(`${URL}/api/attendance/${sessionId}`);
  const data = await res.json();
  console.log(`✅ Attendance summary:`, JSON.stringify(data, null, 2));

  teacher.disconnect();
  student.disconnect();
  process.exit(0);
}

run().catch(console.error);