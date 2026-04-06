require('dotenv').config();
const mysql = require('mysql2');

// 🔥 FINAL DB CONNECTION FIX
const db = mysql.createPool(process.env.MYSQL_URL);

// ✅ PROMISE SUPPORT
const promiseDb = db.promise();

// ✅ TEST CONNECTION
db.getConnection((err, conn) => {
  if (err) {
    console.error("❌ DB CONNECTION FAILED:", err.message);
  } else {
    console.log("✅ DB Connected Successfully");
    conn.release();
  }
});

module.exports = db;
module.exports.promiseDb = promiseDb;