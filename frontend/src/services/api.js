import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

const clearAuthStorage = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  localStorage.removeItem("userId");
  localStorage.removeItem("userRole");
};

// Thêm token vào header nếu tồn tại
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xử lý khi token hết hạn
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401 || status === 403) {
      clearAuthStorage();

      const reason =
        status === 401
          ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          : "Bạn không có quyền truy cập. Vui lòng đăng nhập đúng tài khoản.";

      sessionStorage.setItem("authRedirectMessage", reason);

      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default API;
