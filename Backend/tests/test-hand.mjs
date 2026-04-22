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
  console.log(`✅ Student joined: ${joined.name}`);

  // Test 1: Raise hand
  const handPromise = waitFor(teacher, "hand:new", 3000);
  student.emit("hand:raise", {
    sessionId: joined.sessionId,
    studentId: joined.studentId,
    studentName: joined.name,
  });
  await waitFor(student, "hand:raised");
  console.log(`✅ Student hand raised`);
  await handPromise;
  console.log(`✅ Teacher received hand:new`);

  // Test 2: Raise again — should block
  student.emit("hand:raise", {
    sessionId: joined.sessionId,
    studentId: joined.studentId,
    studentName: joined.name,
  });
  await waitFor(student, "hand:already-raised");
  console.log(`✅ Duplicate raise blocked`);

  // Test 3: Teacher dismisses
  const dismissPromise = waitFor(student, "hand:dismissed-by-teacher", 3000);
  teacher.emit("hand:dismiss", {
    sessionId,
    studentId: joined.studentId,
  });
  await waitFor(teacher, "hand:dismissed");
  await dismissPromise;
  console.log(`✅ Teacher dismissed hand`);

  // Test 4: Student raises again after dismiss
  student.emit("hand:raise", {
    sessionId: joined.sessionId,
    studentId: joined.studentId,
    studentName: joined.name,
  });
  await waitFor(student, "hand:raised");
  console.log(`✅ Student raised again after dismiss`);

  // Test 5: Student lowers own hand
  student.emit("hand:lower", {
    sessionId: joined.sessionId,
    studentId: joined.studentId,
  });
  await waitFor(student, "hand:lowered");
  console.log(`✅ Student lowered own hand`);

  teacher.disconnect();
  student.disconnect();
  process.exit(0);
}

run().catch(console.error);