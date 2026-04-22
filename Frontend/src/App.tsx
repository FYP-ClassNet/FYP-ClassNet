import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TeacherPage } from "./pages/TeacherPage";
import { JoinPage } from "./pages/JoinPage";
import { ReportsPage } from "./pages/ReportsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TeacherPage />} />
        <Route path="/join/:code" element={<JoinPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Routes>
    </BrowserRouter>
  );
}