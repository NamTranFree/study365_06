require("dotenv").config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

async function main() {
  const username = process.argv[2] || "admin";
  const password = process.argv[3] || "admin123";
  const fullName = process.argv[4] || "Quản trị viên";
  const email = process.argv[5] || "admin@local.dev";

  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "othi_thi_thu",
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [existing] = await pool.query("SELECT id FROM users WHERE username = ?", [username]);

    if (existing.length > 0) {
      await pool.query(
        "UPDATE users SET email = ?, full_name = ?, password = ?, role = ?, is_active = ? WHERE username = ?",
        [email, fullName, hashedPassword, "admin", 1, username]
      );
      console.log(`Da cap nhat admin: ${username}`);
    } else {
      await pool.query(
        "INSERT INTO users (username, email, password, full_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)",
        [username, email, hashedPassword, fullName, "admin", 1]
      );
      console.log(`Da tao admin: ${username}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Loi tao admin:", error.message);
  process.exit(1);
});
