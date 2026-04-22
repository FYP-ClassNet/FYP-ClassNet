import { io } from "socket.io-client";

const URL = "http://localhost:3000";
const STUDENT_COUNT = 5;

let teacherSocket;
let sessionId = "";
let sessionCode = "";
let students = [];

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
  magenta: "\x1b[35m",
};

function log(tag, msg, color = colors.white) {
  const time = new Date().toLocaleTimeString();
  console.log(`${colors.gray}[${time}]${colors.reset} ${color}${tag}${colors.reset} ${msg}`);
}

function pass(msg) { log("✅ PASS", msg, colors.green); }
function fail(msg) { log("❌ FAIL", msg, colors.red); }
function info(msg) { log("ℹ️  INFO", msg, colors.cyan); }
function section(msg) {
  console.log(`\n${colors.magenta}${"─".repeat(50)}${colors.reset}`);
  console.log(`${colors.magenta}  ${msg}${colors.reset}`);
  console.log(`${colors.magenta}${"─".repeat(50)}${colors.reset}\n`);
}

// ─── Helpers ────────────────────────────────────────
function waitFor(socket, event, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for "${event}"`));
    }, timeoutMs);

    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Phase 1: Teacher Setup ──────────────────────────
async function testTeacherSession() {
  section("Phase 1 — Teacher Session");

  teacherSocket = io(URL);

  await waitFor(teacherSocket, "connect");
  pass("Teacher connected");

  teacherSocket.emit("session:create");
  const sessionData = await waitFor(teacherSocket, "session:created");

  if (sessionData.sessionId && sessionData.sessionCode && sessionData.lanUrl) {
    pass(`Session created — Code: ${sessionData.sessionCode}`);
    info(`LAN URL: ${sessionData.lanUrl}`);
    sessionId = sessionData.sessionId;
    sessionCode = sessionData.sessionCode;
  } else {
    fail("Session data incomplete");
    process.exit(1);
  }
}

// ─── Phase 2: Students Join ──────────────────────────
async function testStudentJoin() {
  section("Phase 2 — Students Join");

  const studentDefs = Array.from({ length: STUDENT_COUNT }, (_, i) => ({
    name: `Student_${i + 1}`,
    rollNumber: `F22BINFT${String(i + 1).padStart(3, "0")}`,
  }));

  for (const def of studentDefs) {
    const socket = io(URL);
    await waitFor(socket, "connect");

    socket.emit("student:join", {
      sessionCode,
      name: def.name,
      rollNumber: def.rollNumber,
    });

    try {
      const data = await waitFor(socket, "student:joined");
      pass(`${def.name} (${def.rollNumber}) joined — studentId: ${data.studentId.slice(0, 8)}...`);
      students.push({ socket, ...data });
    } catch {
      fail(`${def.name} failed to join`);
    }

    await delay(150);
  }
}

// ─── Phase 3: Duplicate Checks ──────────────────────
async function testDuplicateChecks() {
  section("Phase 3 — Duplicate Validation");

  // Duplicate name
  const dupNameSocket = io(URL);
  await waitFor(dupNameSocket, "connect");
  dupNameSocket.emit("student:join", {
    sessionCode,
    name: "Student_1",
    rollNumber: "F22BINFT999",
  });

  try {
    const err = await waitFor(dupNameSocket, "student:join-error");
    pass(`Duplicate name blocked — "${err.message}"`);
  } catch {
    fail("Duplicate name was NOT blocked");
  }
  dupNameSocket.disconnect();

  await delay(300);

  // Duplicate roll number
  const dupRollSocket = io(URL);
  await waitFor(dupRollSocket, "connect");
  dupRollSocket.emit("student:join", {
    sessionCode,
    name: "Unique_Name",
    rollNumber: "F22BINFT001",
  });

  try {
    const err = await waitFor(dupRollSocket, "student:join-error");
    pass(`Duplicate roll number blocked — "${err.message}"`);
  } catch {
    fail("Duplicate roll number was NOT blocked");
  }
  dupRollSocket.disconnect();

  await delay(300);

  // Invalid session code
  const badCodeSocket = io(URL);
  await waitFor(badCodeSocket, "connect");
  badCodeSocket.emit("student:join", {
    sessionCode: "XXXXXX",
    name: "Ghost",
    rollNumber: "F22GHOST001",
  });

  try {
    const err = await waitFor(badCodeSocket, "student:join-error");
    pass(`Invalid session code blocked — "${err.message}"`);
  } catch {
    fail("Invalid session code was NOT blocked");
  }
  badCodeSocket.disconnect();
}

// ─── Phase 4: Attendance ────────────────────────────
async function testAttendance() {
  section("Phase 4 — Attendance");

  for (const student of students) {
    student.socket.emit("attendance:mark", {
      sessionId: student.sessionId,
      studentId: student.studentId,
      studentName: student.name,
      rollNumber: student.rollNumber,
    });

    try {
      const data = await waitFor(student.socket, "attendance:confirmed");
      pass(`${student.name} attendance confirmed — status: ${data.status}`);
    } catch {
      fail(`${student.name} attendance confirmation timeout`);
    }

    await delay(100);
  }

  // Verify via REST
  await delay(300);
  try {
    const res = await fetch(`${URL}/api/attendance/${sessionId}`);
    const data = await res.json();
    if (data.total === STUDENT_COUNT) {
      pass(`Attendance REST — total: ${data.total}, present: ${data.present}, late: ${data.late}`);
    } else {
      fail(`Attendance count mismatch — expected ${STUDENT_COUNT}, got ${data.total}`);
    }
  } catch {
    fail("Attendance REST endpoint failed");
  }
}

// ─── Phase 5: Raise Hand ────────────────────────────
async function testRaiseHand() {
  section("Phase 5 — Raise Hand");

  const student = students[0];

  // Teacher listens for hand
  const handPromise = waitFor(teacherSocket, "hand:new", 3000);

  student.socket.emit("hand:raise", {
    sessionId: student.sessionId,
    studentId: student.studentId,
    studentName: student.name,
  });

  try {
    const raised = await waitFor(student.socket, "hand:raised");
    pass(`${student.name} hand raised — at: ${new Date(raised.raisedAt).toLocaleTimeString()}`);
  } catch {
    fail(`${student.name} hand:raised event not received`);
  }

  try {
    const handEvent = await handPromise;
    pass(`Teacher received hand:new from ${handEvent.studentName}`);
  } catch {
    fail("Teacher did not receive hand:new");
  }

  // Raise again — should be blocked
  student.socket.emit("hand:raise", {
    sessionId: student.sessionId,
    studentId: student.studentId,
    studentName: student.name,
  });

  try {
    await waitFor(student.socket, "hand:already-raised", 2000);
    pass("Duplicate raise blocked — hand:already-raised received");
  } catch {
    fail("Duplicate raise was NOT blocked");
  }

  // Teacher dismisses
  const dismissPromise = waitFor(student.socket, "hand:dismissed-by-teacher", 3000);

  teacherSocket.emit("hand:dismiss", {
    sessionId,
    studentId: student.studentId,
  });

  try {
    await dismissPromise;
    pass(`Teacher dismissed ${student.name}'s hand`);
  } catch {
    fail("Student did not receive hand:dismissed-by-teacher");
  }

  // Student raises again after dismiss
  student.socket.emit("hand:raise", {
    sessionId: student.sessionId,
    studentId: student.studentId,
    studentName: student.name,
  });

  try {
    await waitFor(student.socket, "hand:raised", 2000);
    pass(`${student.name} can raise hand again after dismiss`);
  } catch {
    fail(`${student.name} could not raise hand again`);
  }

  // Student lowers own hand
  student.socket.emit("hand:lower", {
    sessionId: student.sessionId,
    studentId: student.studentId,
  });

  try {
    await waitFor(student.socket, "hand:lowered", 2000);
    pass(`${student.name} lowered own hand`);
  } catch {
    fail(`${student.name} did not receive hand:lowered`);
  }
}

// ─── Phase 6: Disconnect & Reconnect ────────────────
async function testDisconnect() {
  section("Phase 6 — Disconnect & Reconnect");

  const student = students[1];

  // Teacher listens for student list update
  const leavePromise = waitFor(teacherSocket, "session:student-list-updated", 3000);
  student.socket.disconnect();

  try {
    const update = await leavePromise;
    if (update.event === "left") {
      pass(`Teacher notified — ${update.student.name} left`);
    } else {
      fail("Wrong event type on disconnect");
    }
  } catch {
    fail("Teacher not notified of student disconnect");
  }

  await delay(500);

  // Reconnect same student
  const newSocket = io(URL);
  await waitFor(newSocket, "connect");

  newSocket.emit("student:join", {
    sessionCode,
    name: student.name,
    rollNumber: student.rollNumber,
  });

  try {
    const rejoined = await waitFor(newSocket, "student:joined");
    pass(`${student.name} reconnected — studentId: ${rejoined.studentId.slice(0, 8)}...`);
    students[1].socket = newSocket;

    // Mark attendance again (reconnect)
    newSocket.emit("attendance:mark", {
      sessionId: rejoined.sessionId,
      studentId: rejoined.studentId,
      studentName: rejoined.name,
      rollNumber: rejoined.rollNumber,
    });

    const att = await waitFor(newSocket, "attendance:confirmed");
    pass(`Reconnect attendance — status: ${att.status}, reconnectCount: ${att.reconnectCount}`);
  } catch {
    fail(`${student.name} failed to reconnect`);
  }
}

// ─── Phase 7: Logs & Summary ─────────────────────────
async function testLogs() {
  section("Phase 7 — Logs & Summary");

  try {
    const res = await fetch(`${URL}/api/logs/${sessionId}`);
    const data = await res.json();
    if (data.logs.length > 0) {
      pass(`Activity logs found — total events: ${data.logs.length}`);
      data.logs.forEach((log) => {
        info(`  [${log.timestamp}] ${log.event_type} — ${log.student_name ?? "system"}`);
      });
    } else {
      fail("No activity logs found");
    }
  } catch {
    fail("Logs REST endpoint failed");
  }

  await delay(300);

  try {
    const res = await fetch(`${URL}/api/logs/${sessionId}/summary`);
    const data = await res.json();
    pass(`Summary — Students: ${data.totalStudents}, Present: ${data.present}, Late: ${data.late}`);
    info(`  Class duration: ${data.classDurationFormatted}`);
    info(`  Avg attendance time: ${data.averageAttendanceFormatted}`);
    data.students.forEach((s) => {
      info(`  ${s.name} (${s.rollNumber}) — ${s.status} — online: ${s.totalOnlineFormatted}`);
    });
  } catch {
    fail("Summary REST endpoint failed");
  }
}

// ─── Phase 8: End Session ────────────────────────────
async function testEndSession() {
  section("Phase 8 — End Session");

  const endPromises = students
    .filter((s) => s.socket.connected)
    .map((s) => waitFor(s.socket, "session:ended", 3000).catch(() => null));

  teacherSocket.emit("session:end", { sessionId });

  try {
    await waitFor(teacherSocket, "session:ended", 3000).catch(() => null);
    const results = await Promise.all(endPromises);
    const notified = results.filter(Boolean).length;
    pass(`Session ended — ${notified} students notified`);
  } catch {
    fail("Session end failed");
  }

  await delay(300);

  // Verify session status via REST
  try {
    const res = await fetch(`${URL}/api/sessions/${sessionCode}`);
    if (res.status === 410) {
      pass("Session correctly returns 410 Gone after ending");
    } else {
      fail(`Unexpected status: ${res.status}`);
    }
  } catch {
    fail("Session status check failed");
  }
}

// ─── Phase 9: Join ended session ────────────────────
async function testJoinEndedSession() {
  section("Phase 9 — Join Ended Session");

  const lateSocket = io(URL);
  await waitFor(lateSocket, "connect");

  lateSocket.emit("student:join", {
    sessionCode,
    name: "LateStudent",
    rollNumber: "F22LATE001",
  });

  try {
    const err = await waitFor(lateSocket, "student:join-error", 2000);
    pass(`Joining ended session blocked — "${err.message}"`);
  } catch {
    fail("Was able to join an ended session — should be blocked");
  }

  lateSocket.disconnect();
}

// ─── Run All ─────────────────────────────────────────
async function runAll() {
  console.log(`\n${colors.cyan}${"═".repeat(50)}${colors.reset}`);
  console.log(`${colors.cyan}   🎓 ClassNet Backend Test Suite${colors.reset}`);
  console.log(`${colors.cyan}${"═".repeat(50)}${colors.reset}`);

  try {
    await testTeacherSession();
    await testStudentJoin();
    await testDuplicateChecks();
    await testAttendance();
    await testRaiseHand();
    await testDisconnect();
    await testLogs();
    await testEndSession();
    await testJoinEndedSession();

    console.log(`\n${colors.green}${"═".repeat(50)}${colors.reset}`);
    console.log(`${colors.green}   ✅ All tests completed${colors.reset}`);
    console.log(`${colors.green}${"═".repeat(50)}${colors.reset}\n`);
  } catch (err) {
    console.log(`\n${colors.red}   ❌ Test suite crashed: ${err.message}${colors.reset}\n`);
  } finally {
    students.forEach((s) => s.socket?.disconnect());
    teacherSocket?.disconnect();
    setTimeout(() => process.exit(0), 500);
  }
}

runAll();