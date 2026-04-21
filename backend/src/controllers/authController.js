const pool = require("../config/database");
const { hashPassword, comparePassword } = require("../utils/password");
const { generateToken } = require("../utils/jwt");

// Đăng ký tài khoản
exports.register = async (req, res) => {
  try {
    const { username, email, password, full_name } = req.body;

    // Validation
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ thông tin",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      });
    }

    const connection = await pool.getConnection();

    try {
      // Kiểm tra username đã tồn tại
      const [existingUsername] = await connection.query(
        "SELECT id FROM users WHERE username = ?",
        [username]
      );

      if (existingUsername.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Tên đăng nhập đã được sử dụng",
        });
      }

      // Kiểm tra email đã tồn tại
      const [existingEmail] = await connection.query(
        "SELECT id FROM users WHERE email = ?",
        [email]
      );

      if (existingEmail.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Email đã được đăng ký",
        });
      }

      // Hash mật khẩu
      const hashedPassword = await hashPassword(password);

      // Thêm user vào database
      const [result] = await connection.query(
        "INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, 'student')",
        [username, email, hashedPassword, full_name]
      );

      return res.status(201).json({
        success: true,
        message: "Đăng ký thành công",
        user: {
          id: result.insertId,
          username,
          email,
          full_name,
          role: "student",
        },
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// Đăng nhập
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập username và password",
      });
    }

    const connection = await pool.getConnection();

    try {
      // Tìm user theo username
      const [users] = await connection.query(
        "SELECT id, username, email, password, full_name, role FROM users WHERE username = ?",
        [username]
      );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Tên đăng nhập hoặc mật khẩu không đúng",
        });
      }

      const user = users[0];

      // So sánh mật khẩu
      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Tên đăng nhập hoặc mật khẩu không đúng",
        });
      }

      // Tạo JWT token
      const token = generateToken(user.id, user.role);

      return res.status(200).json({
        success: true,
        message: "Đăng nhập thành công",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// Lấy thông tin user (cần token)
exports.getProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const connection = await pool.getConnection();

    try {
      const [users] = await connection.query(
        "SELECT id, username, email, full_name, role FROM users WHERE id = ?",
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Người dùng không tồn tại",
        });
      }

      return res.status(200).json({
        success: true,
        user: users[0],
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Lỗi lấy profile:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};
