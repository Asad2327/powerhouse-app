require('dotenv').config();
const mysql = require('mysql2');

// 🔥 FINAL WORKING CONFIG (Railway FIX)
const db = mysql.createPool({
  uri: process.env.MYSQL_URL,

  ssl: {
    rejectUnauthorized: false
  },

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000
});

// ✅ TEST CONNECTION
db.getConnection((err, conn) => {
  if (err) {
    console.error("❌ DB CONNECTION ERROR:", err.message);
  } else {
    console.log("✅ DB CONNECTED SUCCESSFULLY");
    conn.release();
  }
});

module.exports = db;