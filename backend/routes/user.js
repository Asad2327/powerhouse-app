const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// 🔥 AUTO EMPLOYEE ID GENERATOR
const generateEmployeeID = () => {
  return "PH-" + Math.floor(1000 + Math.random() * 9000);
};

// 🚀 GET ALL STAFF (SECURE 🔐)
router.get('/all', (req, res) => {

  // ✅ FIX: safe columns (no crash if missing)
  const sql = `
    SELECT 
      id, 
      name, 
      email, 
      role,
      phone,
      COALESCE(category, '') AS category,
      COALESCE(status, 'active') AS status,
      COALESCE(employeeID, '') AS employeeID
    FROM users
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.log("❌ DB ERROR:", err);

      return res.status(500).json({
        error: "Database error",
        message: err.sqlMessage || err.message
      });
    }

    res.json(results);
  });
});

// ✅ CREATE USER (FIXED)
router.post('/', async (req, res) => {
  try {
    const {
      name, password, role,
      phone, maritalStatus, address, backgroundInfo
    } = req.body;

    if (!req.body.email) {
      return res.status(400).json({ error: "Email required" });
    }

    const email = req.body.email.toLowerCase();

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
      if (err) {
        console.error("❌ DB ERROR:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (result.length > 0) {
        return res.status(400).json({ error: "Email already exists" });
      }

      if (!password) {
        return res.status(400).json({ error: "Password required" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const employeeID = generateEmployeeID();

      const sql = `
        INSERT INTO users 
        (name, email, password, role, phone, employeeID, maritalStatus, address, backgroundInfo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(sql, [
        name || null,
        email,
        hashedPassword,
        role || null,
        phone || null,
        employeeID,
        maritalStatus || null,
        address || null,
        backgroundInfo || null
      ], (err) => {
        if (err) {
          console.error("❌ INSERT ERROR:", err);
          return res.status(500).json({
            error: "Insert failed",
            message: err.sqlMessage || err.message
          });
        }
        res.json({ msg: "✅ Staff Created" });
      });

    });

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 🔥 UPDATE USER
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.put('/:id', upload.single('profile_pic'), (req, res) => {
  const id = req.params.id;

  const { name, email, role, phone, maritalStatus, address, backgroundInfo, status } = req.body;

  const lowerEmail = email ? email.toLowerCase() : null;

  const profile_pic = req.file
    ? `data:image/png;base64,${req.file.buffer.toString('base64')}`
    : null;

  const sql = `
    UPDATE users SET 
    name=?, email=?, role=?, phone=?, maritalStatus=?, address=?, backgroundInfo=?, 
    status=?,
    profile_pic = COALESCE(?, profile_pic)
    WHERE id=?
  `;

  db.query(sql, [
    name || null,
    lowerEmail,
    role || null,
    phone || null,
    maritalStatus || null,
    address || null,
    backgroundInfo || null,
    status || "active",
    profile_pic,
    id
  ], (err) => {
    if (err) {
      console.error("❌ UPDATE ERROR:", err);

      return res.status(500).json({
        error: "Update failed",
        message: err.sqlMessage || err.message
      });
    }
    res.json({ msg: "Updated ✅" });
  });
});

// DELETE
router.delete('/:id', (req, res) => {
  db.query("DELETE FROM users WHERE id=?", [req.params.id], (err) => {
    if (err) {
      console.error("❌ DELETE ERROR:", err);

      return res.status(500).json({
        error: "Delete failed",
        message: err.sqlMessage || err.message
      });
    }
    res.json({ msg: "Deleted ✅" });
  });
});

// 🔥 GET FULL USER DATA
router.get('/full/:id', (req, res) => {
  const userId = req.params.id;

  // ✅ SAFE SELECT
  const userQuery = `
    SELECT 
      id, 
      name, 
      email, 
      role, 
      phone, 
      COALESCE(status, 'active') AS status, 
      COALESCE(employeeID, '') AS employeeID
    FROM users WHERE id=?
  `;

  const tasksQuery = `
    SELECT t.* 
    FROM tasks t
    JOIN task_assignments ta ON t.id = ta.task_id
    WHERE ta.user_id=?
    ORDER BY t.id DESC
  `;

  const toolsQuery = `
    SELECT * FROM tools 
    WHERE user_id=? 
    ORDER BY id DESC
  `;

  db.query(userQuery, [userId], (err1, user) => {
    if (err1) {
      console.error("❌ USER FETCH ERROR:", err1);
      return res.status(500).json(err1);
    }

    db.query(tasksQuery, [userId], (err2, tasks) => {
      if (err2) {
        console.error("❌ TASK FETCH ERROR:", err2);
        return res.status(500).json(err2);
      }

      db.query(toolsQuery, [userId], (err3, tools) => {
        if (err3) {
          console.error("❌ TOOLS FETCH ERROR:", err3);
          return res.status(500).json(err3);
        }

        res.json({
          user: user[0] || null,
          tasks,
          tools
        });
      });
    });
  });
});
router.post("/save-token", (req, res) => {
  const { token, user_id } = req.body;

  if (!token || !user_id) {
    return res.status(400).json({ error: "Missing token or user" });
  }

  db.query(
    "UPDATE users SET fcm_token=? WHERE id=?",
    [token, user_id],
    (err) => {
      if (err) {
        console.error("❌ TOKEN SAVE ERROR:", err);
        return res.status(500).json({ error: "DB error" });
      }

      res.json({ msg: "Token saved" });
    }
  );
});

module.exports = router;