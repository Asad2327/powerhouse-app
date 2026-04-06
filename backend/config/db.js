const mysql = require("mysql2");

// 🔥 Railway MYSQL URL
const db = mysql.createPool({
  uri: process.env.MYSQL_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false
  }
});

// ✅ IMPORTANT: test connection on start
db.getConnection((err, conn) => {
  if (err) {
    console.error("❌ DB CONNECTION FAILED:", err.message);
  } else {
    console.log("✅ DB CONNECTED SUCCESSFULLY");
    conn.release();
  }
});

module.exports = db;