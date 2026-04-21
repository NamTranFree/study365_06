import { useEffect, useState } from "react";
import API from "../services/api";
import QuestionManager from "./QuestionManager";
import ExamManager from "./ExamManager";
import "../styles/Dashboard.css";

function AdminDashboard({ section = "overview" }) {
  const [overview, setOverview] = useState({
    usersTotal: 0,
    adminsTotal: 0,
    studentsTotal: 0,
    activeUsersTotal: 0,
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [overviewRes, usersRes] = await Promise.all([
        API.get("/admin/overview"),
        API.get("/admin/users"),
      ]);

      setOverview(overviewRes.data.data);
      setUsers(usersRes.data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được dữ liệu admin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateRole = async (userId, nextRole) => {
    try {
      await API.patch(`/admin/users/${userId}/role`, { role: nextRole });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Cập nhật quyền thất bại");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm("Bạn chắc chắn muốn xóa tài khoản này?")) {
      return;
    }

    try {
      await API.delete(`/admin/users/${userId}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Xóa tài khoản thất bại");
    }
  };

  const pageTitleMap = {
    overview: "Tổng quan",
    users: "Quản lý người dùng",
    questions: "Ngân hàng câu hỏi",
    exams: "Quản lý đề thi",
  };

  const showOverview = section === "overview";
  const showUsers = section === "users";
  const showQuestions = section === "questions";
  const showExams = section === "exams";

  const renderUsersTable = () => (
    <div style={{ overflowX: "auto", marginTop: "12px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
        <thead>
          <tr>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Username</th>
            <th style={thStyle}>Họ tên</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Role</th>
            <th style={thStyle}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td style={tdStyle}>{user.id}</td>
              <td style={tdStyle}>{user.username}</td>
              <td style={tdStyle}>{user.full_name}</td>
              <td style={tdStyle}>{user.email}</td>
              <td style={tdStyle}>{user.role}</td>
              <td style={tdStyle}>
                <button
                  onClick={() =>
                    handleUpdateRole(user.id, user.role === "admin" ? "student" : "admin")
                  }
                  style={buttonStyle}
                >
                  Đổi quyền
                </button>
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  style={{ ...buttonStyle, marginLeft: "8px", background: "#cc3333" }}
                >
                  Xóa tài khoản
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <main className="dashboard">
        <div className="dashboard-container">Đang tải dữ liệu admin...</div>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <div className="dashboard-container">
        <h1>{pageTitleMap[section] || "Bảng điều khiển Admin"}</h1>

        {error && <div className="error-message">{error}</div>}

        {showOverview ? (
          <div className="features-grid">
            <div className="feature-card">
              <h3>Tổng người dùng</h3>
              <p>{overview.usersTotal}</p>
            </div>
            <div className="feature-card">
              <h3>Admin</h3>
              <p>{overview.adminsTotal}</p>
            </div>
            <div className="feature-card">
              <h3>Student</h3>
              <p>{overview.studentsTotal}</p>
            </div>
            <div className="feature-card">
              <h3>Đang hoạt động</h3>
              <p>{overview.activeUsersTotal}</p>
            </div>
          </div>
        ) : null}

        {showUsers ? (
          <div style={{ marginTop: "8px" }}>
            <h3>Quản lý người dùng</h3>
            {renderUsersTable()}
          </div>
        ) : null}

        {showQuestions ? <QuestionManager /> : null}
        {showExams ? <ExamManager /> : null}
      </div>
    </main>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #d5e3f1",
  background: "#f6f6f6",
  color: "#284764",
  fontWeight: 700,
};

const tdStyle = {
  padding: "10px",
  borderBottom: "1px solid #e3edf7",
  color: "#2b4763",
  fontWeight: 500,
};

const buttonStyle = {
  border: "none",
  background: "#0066cc",
  color: "#fff",
  padding: "6px 10px",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: 600,
};

export default AdminDashboard;
