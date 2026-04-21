const { verifyToken } = require("../utils/jwt");

// Middleware xác thực token
const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer token

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token không được cung cấp",
      });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ hoặc hết hạn",
      });
    }

    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Lỗi xác thực",
      error: error.message,
    });
  }
};

// Middleware kiểm tra quyền admin
const checkAdmin = (req, res, next) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Chỉ admin mới có quyền truy cập",
    });
  }
  next();
};

// Middleware kiểm tra quyền theo danh sách role
const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.userRole || !allowedRoles.includes(req.userRole)) {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền truy cập chức năng này",
    });
  }

  next();
};

module.exports = {
  authenticate,
  checkAdmin,
  authorizeRoles,
};
