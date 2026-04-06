const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ ensure uploads folder exists (Railway fix)
const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const cleanName = file.originalname.replace(/\s+/g, "_");
    cb(null, Date.now() + "-" + cleanName);
  }
});
const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

module.exports = upload;