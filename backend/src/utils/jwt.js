const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key_change_in_production";

// Tạo JWT token
const generateToken = (userId, userRole) => {
  return jwt.sign(
    { userId, role: userRole },
    SECRET_KEY,
    { expiresIn: "7d" } // Token hết hạn sau 7 ngày
  );
};

// Xác thực JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  SECRET_KEY,
};
