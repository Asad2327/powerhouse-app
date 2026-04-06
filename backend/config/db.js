require('dotenv').config();
const mysql = require('mysql2');

// ==========================
// 🚀 DATABASE CONNECTION (Railway)
// ==========================
const db = mysql.createPool({
  uri: process.env.MYSQL_URL,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// ==========================
// 🔥 PROMISE SUPPORT (IMPORTANT)
// ==========================
const promiseDb = db.promise();

// ==========================
// ✅ TEST CONNECTION (SAFE)
// ==========================
db.getConnection((err, conn) => {
  if (err) {
    console.log("❌ DB ERROR:", {
      message: err.message,
      code: err.code
    });
  } else {
    console.log("✅ DB Connected to Railway");
    conn.release();
  }
});

// ==========================
// 🔄 AUTO RECONNECT HANDLING
// ==========================
db.on('error', (err) => {
  console.error("🔥 DB Runtime Error:", err);

  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log("⚠️ DB connection lost. Trying to reconnect...");
  } else {
    throw err;
  }
});

// ==========================
// 📦 EXPORT BOTH (SAFE)
// ==========================
module.exports = db;
module.exports.promiseDb = promiseDb;