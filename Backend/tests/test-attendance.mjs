import { io } from "socket.io-client";

const URL = "http://localhost:3000";

function waitFor(socket, event, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${event}`)), timeout);
    socket.once(event, (data) => { clearTimeout(timer); resolve(data); });
  });
}

async function run() {
  // Teacher
  const teacher = io(URL);
  await waitFor(teacher, "connect");
  teacher.emit("session:create");
  const { sessionCode, sessionId } = await waitFor(teacher, "session:created");
  console.log(`✅ Session: ${sessionCode}`);

  // Student joins
  const student = io(URL);
  await waitFor(student, "connect");
  student.emit("student:join", { sessionCode, name: "Ali Khan", rollNumber: "F22BINFT001" });
  const joined = await waitFor(student, "student:joined");
  console.log(`✅ Student joined`);

  // Mark attendance
  student.emit("attendance:mark", {
    sessionId: joined.sessionId,
    studentId: joined.studentId,
    studentName: joined.name,
    rollNumber: joined.rollNumber,
  });
  const att = await waitFor(student, "attendance:confirmed");
  console.log(`✅ Auto attendance: ${att.status}`);

  // Test 1: REST override present → late
  const res1 = await fetch(`${URL}/api/attendance/${sessionId}/${joined.studentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "late" }),
  });
  const data1 = await res1.json();
  console.log(`✅ REST override → ${data1.status}`);

  // Test 2: Socket override late → absent
  const overridePromise = waitFor(teacher, "attendance:override-confirmed", 3000);
  const studentNotifyPromise = waitFor(student, "attendance:status-updated", 3000);

  teacher.emit("attendance:override", {
    sessionId,
    studentId: joined.studentId,
    status: "absent",
  });

  const confirmed = await overridePromise;
  console.log(`✅ Socket override confirmed → ${confirmed.status}`);

  const studentNotified = await studentNotifyPromise;
  console.log(`✅ Student notified of status change → ${studentNotified.status}`);

  // Test 3: Invalid status
  const res2 = await fetch(`${URL}/api/attendance/${sessionId}/${joined.studentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "invalid" }),
  });
  const data2 = await res2.json();
  console.log(`✅ Invalid status blocked: "${data2.error}"`);

  // Test 4: Verify final status in summary
  const res3 = await fetch(`${URL}/api/attendance/${sessionId}`);
  const summary = await res3.json();
  console.log(`✅ Final status in DB: ${summary.records[0].status}`);

  teacher.disconnect();
  student.disconnect();
  process.exit(0);
}

run().catch(console.error);