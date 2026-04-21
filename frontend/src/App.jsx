import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import MainLayout from "./components/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./components/Dashboard";
import PracticeTopicPage from "./components/PracticeTopicPage";
import ExamSessionPage from "./components/ExamSessionPage";
import AdminDashboard from "./components/AdminDashboard";
import "./App.css";

function RootRedirect() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("userRole");

  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/thi-thu/lam-bai"
          element={
            <ProtectedRoute allowedRoles={["student", "admin"]}>
              <ExamSessionPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["student", "admin"]}>
              <MainLayout viewRole="student" />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="on-tap" replace />} />
          <Route path="on-tap" element={<Dashboard section="practice" />} />
          <Route path="on-tap/:subjectId" element={<Dashboard section="practice" />} />
          <Route path="on-tap/:subjectId/:topicSlug" element={<PracticeTopicPage />} />
          <Route path="thi-thu" element={<Dashboard section="exam" />} />
          <Route path="ket-qua" element={<Navigate to="/dashboard/bieu-do" replace />} />
          <Route path="bieu-do" element={<Dashboard section="summary" />} />
          <Route path="lich-su" element={<Dashboard section="history" />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <MainLayout viewRole="admin" />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="tong-quan" replace />} />
          <Route path="tong-quan" element={<AdminDashboard section="overview" />} />
          <Route path="nguoi-dung" element={<AdminDashboard section="users" />} />
          <Route path="phan-quyen" element={<Navigate to="/admin/nguoi-dung" replace />} />
          <Route path="ngan-hang-cau-hoi" element={<AdminDashboard section="questions" />} />
          <Route path="de-thi" element={<AdminDashboard section="exams" />} />
        </Route>

        {/* Redirect to dashboard by default */}
        <Route path="/" element={<RootRedirect />} />
      </Routes>
    </Router>
  );
}

export default App;