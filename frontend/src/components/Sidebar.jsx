import { NavLink } from "react-router-dom";
import "../styles/Sidebar.css";

function Sidebar({ viewRole }) {
  const adminMenuItems = [
    { id: 1, label: "Tổng quan", path: "/admin/tong-quan" },
    { id: 2, label: "Quản lý người dùng", path: "/admin/nguoi-dung" },
    { id: 3, label: "Ngân hàng câu hỏi", path: "/admin/ngan-hang-cau-hoi" },
    { id: 4, label: "Quản lý đề thi", path: "/admin/de-thi" },
  ];

  const studentMenuItems = [
    { id: 1, label: "Ôn tập", path: "/dashboard/on-tap" },
    { id: 2, label: "Thi Thử", path: "/dashboard/thi-thu" },
    { id: 3, label: "Biểu đồ theo môn", path: "/dashboard/bieu-do" },
    { id: 4, label: "Lịch sử", path: "/dashboard/lich-su" },
  ];

  const menuItems = viewRole === "admin" ? adminMenuItems : studentMenuItems;

  return (
    <aside className="sidebar">
      <h3>Chức năng</h3>
      <ul className="menu">
        {menuItems.map((item) => (
          <li key={item.id}>
            <NavLink to={item.path} className={({ isActive }) => (isActive ? "active" : "") }>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default Sidebar;
