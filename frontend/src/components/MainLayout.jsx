import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "../styles/MainLayout.css";

function MainLayout({ viewRole }) {
  return (
    <div className="app-container">
      <Header />
      <div className="app-body">
        <Sidebar viewRole={viewRole} />
        <Outlet />
      </div>
    </div>
  );
}

export default MainLayout;
