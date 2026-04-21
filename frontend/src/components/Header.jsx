import { useNavigate } from "react-router-dom";
import "../styles/Header.css";

function Header() {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "Người dùng";

  const handleLogout = () => {
    // Xóa dữ liệu từ localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    
    // Chuyển hướng đến trang login
    navigate("/login");
  };

  return (
    <header className="header">
      <div className="header-left">
        <h2 className="logo">Logo</h2>
      </div>
      
      <div className="header-right">
        <span className="user-info">
          Tài khoản: <strong>{userName}</strong>
        </span>
        <button className="logout-btn" onClick={handleLogout}>Đăng xuất</button>
      </div>
    </header>
  );
}

export default Header;
