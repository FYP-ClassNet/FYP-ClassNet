import { io } from "socket.io-client";
import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";

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

  // Test 1: Upload file
  const fileSharedPromise = waitFor(student, "file:shared", 5000);

  const form = new FormData();
  form.append("title", "Test Notes");
  form.append("file", Buffer.from("Hello ClassNet - Test PDF content"), {
    filename: "test-notes.txt",
    contentType: "text/plain",
  });

  const uploadRes = await fetch(`${URL}/api/files/${sessionId}/upload`, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });
  const uploaded = await uploadRes.json();
  console.log(`✅ File uploaded: ${uploaded.originalName} — ${uploaded.fileUrl}`);

  // Test 2: Student receives file:shared event
  const fileEvent = await fileSharedPromise;
  console.log(`✅ Student received file:shared: ${fileEvent.originalName}`);

  // Test 3: Get files list
  const listRes = await fetch(`${URL}/api/files/${sessionId}`);
  const listData = await listRes.json();
  console.log(`✅ Files list: ${listData.files.length} file(s)`);

  // Test 4: Student requests files via socket
  student.emit("files:get-all", { sessionId: joined.sessionId });
  const filesList = await waitFor(student, "files:list", 3000);
  console.log(`✅ Socket files:list: ${filesList.files.length} file(s)`);

  // Test 5: Delete file
  const fileDeletedPromise = waitFor(student, "file:deleted", 3000);
  const deleteRes = await fetch(`${URL}/api/files/${sessionId}/${uploaded.fileId}`, {
    method: "DELETE",
  });
  const deleteData = await deleteRes.json();
  console.log(`✅ File deleted: ${deleteData.success}`);

  // Test 6: Student receives file:deleted event
  const deletedEvent = await fileDeletedPromise;
  console.log(`✅ Student received file:deleted: ${deletedEvent.fileId}`);

  // Test 7: List again — should be empty
  const listRes2 = await fetch(`${URL}/api/files/${sessionId}`);
  const listData2 = await listRes2.json();
  console.log(`✅ Files after delete: ${listData2.files.length} file(s)`);

  teacher.disconnect();
  student.disconnect();
  process.exit(0);
}

run().catch(console.error);