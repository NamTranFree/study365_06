import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import "../styles/Login.css";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const redirectMessage = sessionStorage.getItem("authRedirectMessage");
    if (redirectMessage) {
      setError(redirectMessage);
      sessionStorage.removeItem("authRedirectMessage");
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await API.post("/auth/login", formData);
      
      // Lưu token vào localStorage
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("userName", response.data.user.full_name);
      localStorage.setItem("userId", response.data.user.id);
      localStorage.setItem("userRole", response.data.user.role);
      
      // Chuyển hướng đến dashboard
      navigate(response.data.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Đăng nhập thất bại. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Logo</h1>
          <h2>Đăng nhập</h2>
          <p>Hệ thống ôn thi và thi thử</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Tên đăng nhập</label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Nhập tên đăng nhập"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Nhập mật khẩu"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Chưa có tài khoản?{" "}
            <Link to="/register" className="register-link">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>

      <div className="login-banner">
        <div className="banner-content">
          <h2>Chào mừng</h2>
          <p>Tham gia hệ thống ôn thi và thi thử online</p>
          <ul>
            <li>✓ Luyện tập từng câu hỏi</li>
            <li>✓ Thi thử đạt chuẩn</li>
            <li>✓ Xem kết quả chi tiết</li>
            <li>✓ So sánh xếp hạng</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Login;
