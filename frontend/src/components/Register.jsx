import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import "../styles/Register.css";

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Kiểm tra mật khẩu
    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu không khớp!");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự!");
      setLoading(false);
      return;
    }

    try {
      const response = await API.post("/auth/register", {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
      });

      setSuccess("Đăng ký thành công! Chuyển hướng đến đăng nhập...");
      
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-banner">
        <div className="banner-content">
          <h2>Tạo tài khoản</h2>
          <p>Bắt đầu ôn thi và thi thử ngay hôm nay</p>
          <ul>
            <li>✓ Truy cập ngân hàng câu hỏi</li>
            <li>✓ Làm bài thi thử miễn phí</li>
            <li>✓ Lưu lịch sử học tập</li>
            <li>✓ So sánh với bạn bè</li>
          </ul>
        </div>
      </div>

      <div className="register-card">
        <div className="register-header">
          <h1>Logo</h1>
          <h2>Đăng ký tài khoản</h2>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="full_name">Họ và tên</label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              placeholder="Nhập họ và tên"
              value={formData.full_name}
              onChange={handleChange}
              required
            />
          </div>

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
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Nhập email"
              value={formData.email}
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
              placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Nhập lại mật khẩu"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button type="submit" className="register-btn" disabled={loading}>
            {loading ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>

        <div className="register-footer">
          <p>
            Đã có tài khoản?{" "}
            <Link to="/login" className="login-link">
              Đăng nhập tại đây
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
