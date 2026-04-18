import { io } from "socket.io-client";
import FormData from "form-data";
import fetch from "node-fetch";

const URL = "http://localhost:3000";

function waitFor(socket, event, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${event}`)), timeout);
    socket.once(event, (data) => { clearTimeout(timer); resolve(data); });
  });
}

async function run() {
  // Teacher + Student setup
  const teacher = io(URL);
  await waitFor(teacher, "connect");
  teacher.emit("session:create");
  const { sessionCode, sessionId } = await waitFor(teacher, "session:created");
  console.log(`✅ Session: ${sessionCode}`);

  const student = io(URL);
  await waitFor(student, "connect");
  student.emit("student:join", { sessionCode, name: "Ali Khan", rollNumber: "F22BINFT001" });
  const joined = await waitFor(student, "student:joined");
  console.log(`✅ Student joined`);

  // ── Test 1: Create oral quiz
  const oralRes = await fetch(`${URL}/api/quiz/${sessionId}/oral`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Oral Quiz 1", totalQuestions: 3 }),
  });
  const oral = await oralRes.json();
  console.log(`✅ Oral quiz created: ${oral.quiz.title} (${oral.questions.length} questions)`);

  // ── Test 2: Create CSV quiz
  const csvContent = `question,option_a,option_b,option_c,option_d,correct
What is 2+2?,1,2,4,8,C
Capital of Pakistan?,Lahore,Karachi,Islamabad,Peshawar,C
What is HTML?,Language,Framework,Markup,Database,C`;

  const form = new FormData();
  form.append("title", "CS Quiz 1");
  form.append("file", Buffer.from(csvContent), {
    filename: "quiz.csv",
    contentType: "text/csv",
  });

  const csvRes = await fetch(`${URL}/api/quiz/${sessionId}/csv`, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });
  const csv = await csvRes.json();
  console.log(`✅ CSV quiz created: ${csv.quiz.title} (${csv.questions.length} questions)`);

  const quizId = csv.quiz.id;

  // ── Test 3: Teacher launches quiz — student receives it
  const quizStartedPromise = waitFor(student, "quiz:started", 5000);
  teacher.emit("quiz:launch", { sessionId, quizId });
  const quizStarted = await quizStartedPromise;
  console.log(`✅ Student received quiz: ${quizStarted.quiz.title} (${quizStarted.questions.length} questions)`);
  console.log(`   First question: ${quizStarted.questions[0].question_text}`);
  console.log(`   Correct option hidden: ${quizStarted.questions[0].correct_option === undefined ? "✅" : "❌"}`);

  // ── Test 4: Student submits answers
  const questions = quizStarted.questions;

  for (const q of questions) {
    const progressPromise = waitFor(teacher, "quiz:progress", 3000).catch(() => null);

    student.emit("quiz:submit-answer", {
      quizId,
      questionId: q.id,
      studentId: joined.studentId,
      studentName: joined.name,
      rollNumber: joined.rollNumber,
      selectedOption: "C",
    });

    await waitFor(student, "quiz:answer-confirmed", 3000);
    console.log(`✅ Answer confirmed for Q${q.question_number}`);
    await progressPromise;
  }

  // ── Test 5: Teacher gets results via socket
  const resultsPromise = waitFor(teacher, "quiz:results", 5000);
  teacher.emit("quiz:end", { sessionId, quizId });

  await waitFor(student, "quiz:ended", 3000);
  console.log(`✅ Student notified quiz ended`);

  const { results } = await resultsPromise;
  console.log(`✅ Results received — ${results.length} student(s)`);
  console.log(`   ${results[0].studentName}: ${results[0].totalCorrect}/${results[0].totalAnswered} correct (${results[0].scorePercent}%)`);

  // ── Test 6: REST results
  const restRes = await fetch(`${URL}/api/quiz/${quizId}/results`);
  const restData = await restRes.json();
  console.log(`✅ REST results: ${restData.results.length} student(s)`);

  // ── Test 7: Student requests active quiz on join (reconnect scenario)
  const student2 = io(URL);
  await waitFor(student2, "connect");
  student2.emit("student:join", { sessionCode, name: "Sara Ahmed", rollNumber: "F22BINFT002" });
  await waitFor(student2, "student:joined");

  student2.emit("quiz:get-active", { sessionId });
  const noneEvent = await waitFor(student2, "quiz:none", 3000);
  console.log(`✅ No active quiz after end — quiz:none received`);

  teacher.disconnect();
  student.disconnect();
  student2.disconnect();
  process.exit(0);
}

run().catch(console.error);