const mysql = require("mysql2");

let db;

// ✅ LOCAL + MCP → PUBLIC URL use karega
if (process.env.MYSQL_PUBLIC_URL) {
  db = mysql.createPool(process.env.MYSQL_PUBLIC_URL);
} 
// ✅ RAILWAY SERVER → internal use karega
else {
  db = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

// ✅ TEST CONNECTION
db.getConnection((err, conn) => {
  if (err) {
    console.error("❌ DB CONNECTION FAILED:", err.message);
  } else {
    console.log("✅ DB CONNECTED SUCCESSFULLY");
    conn.release();
  }
});

module.exports = db;