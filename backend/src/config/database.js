const mysql = require("mysql2/promise");
require("dotenv").config();

// Tạo connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "othi_thi_thu",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Kiểm tra kết nối
pool.getConnection()
  .then((connection) => {
    console.log("✅ Kết nối Database thành công!");
    connection.release();
  })
  .catch((error) => {
    console.error("❌ Lỗi kết nối Database:", error.message);
  });

module.exports = pool;
