require("dotenv").config();
const mysql = require("mysql2/promise");

async function run() {
  const username = process.argv[2];

  if (!username) {
    console.error("Usage: node scripts/promoteAdmin.js <username>");
    process.exit(1);
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    const [result] = await pool.query(
      "UPDATE users SET role = 'admin' WHERE username = ?",
      [username]
    );

    if (result.affectedRows === 0) {
      console.error("Không tìm thấy username:", username);
      process.exit(1);
    }

    console.log("Đã nâng quyền admin cho:", username);
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error("Lỗi:", error.message);
  process.exit(1);
});
