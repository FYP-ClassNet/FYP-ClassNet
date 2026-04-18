import { io } from "socket.io-client";

const URL = "http://localhost:3000";

function waitFor(socket, event, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${event}`)), timeout);
    socket.once(event, (data) => { clearTimeout(timer); resolve(data); });
  });
}

async function run() {
  // ── Step 1: Teacher creates session
  const teacher = io(URL);
  await waitFor(teacher, "connect");
  teacher.emit("session:create");
  const { sessionCode, sessionId } = await waitFor(teacher, "session:created");
  console.log(`✅ Session created: ${sessionCode}`);

  // ── Test 1: Valid join
  const s1 = io(URL);
  await waitFor(s1, "connect");
  s1.emit("student:join", { sessionCode, name: "Ali Khan", rollNumber: "F22BINFT001" });
  const joined = await waitFor(s1, "student:joined");
  console.log(`✅ Valid join: ${joined.name} (${joined.rollNumber})`);

  // ── Test 2: Duplicate name
  const s2 = io(URL);
  await waitFor(s2, "connect");
  s2.emit("student:join", { sessionCode, name: "Ali Khan", rollNumber: "F22BINFT999" });
  const dupName = await waitFor(s2, "student:join-error");
  console.log(`✅ Duplicate name blocked: "${dupName.message}"`);
  s2.disconnect();

  // ── Test 3: Duplicate roll number
  const s3 = io(URL);
  await waitFor(s3, "connect");
  s3.emit("student:join", { sessionCode, name: "Sara Ahmed", rollNumber: "F22BINFT001" });
  const dupRoll = await waitFor(s3, "student:join-error");
  console.log(`✅ Duplicate roll blocked: "${dupRoll.message}"`);
  s3.disconnect();

  // ── Test 4: Wrong session code
  const s4 = io(URL);
  await waitFor(s4, "connect");
  s4.emit("student:join", { sessionCode: "XXXXXX", name: "Ghost", rollNumber: "F22000" });
  const badCode = await waitFor(s4, "student:join-error");
  console.log(`✅ Wrong code blocked: "${badCode.message}"`);
  s4.disconnect();

  // ── Test 5: REST — get students
  const res = await fetch(`${URL}/api/sessions/${sessionId}/students`);
  const data = await res.json();
  console.log(`✅ REST students: ${JSON.stringify(data.students, null, 2)}`);

  // Cleanup
  teacher.disconnect();
  s1.disconnect();
  process.exit(0);
}

run().catch(console.error);