const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const db = require("../config/db");
const upload = require("../middleware/upload");
const admin = require("../firebaseAdmin");

const promiseDb = db.promiseDb ? db.promiseDb : db.promise();
const UPLOAD_DIR = path.resolve(__dirname, "..", "uploads");

function normalizeStringArray(...values) {
  return [...new Set(values.flatMap((value) => {
    if (value === undefined || value === null) {
      return [];
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => String(item).trim())
        .filter(Boolean);
    }

    if (typeof value === "string") {
      const trimmed = value.trim();

      if (!trimmed) {
        return [];
      }

      try {
        const parsed = JSON.parse(trimmed);

        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => String(item).trim())
            .filter(Boolean);
        }

        if (parsed !== null && parsed !== undefined) {
          return [String(parsed).trim()].filter(Boolean);
        }
      } catch (error) {
        if (trimmed.includes(",")) {
          return trimmed
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        }

        return [trimmed];
      }

      return [];
    }

    return [String(value).trim()].filter(Boolean);
  }))];
}

function normalizeUserIds(body) {
  return normalizeStringArray(
    body.user_ids,
    body["user_ids[]"],
    body.user_id
  );
}

function splitJoinedValues(value, separator = ",") {
  if (!value || typeof value !== "string") {
    return [];
  }

  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toStoredFiles(files) {
  return (files || []).map((file) => ({
    path: `uploads/${file.filename}`,
    type: file.mimetype,
  }));
}

function normalizeStoredFileList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item) {
        return null;
      }

      if (typeof item === "string") {
        return { path: item };
      }

      if (typeof item === "object" && item.path) {
        return {
          path: item.path,
          type: item.type || null,
        };
      }

      return null;
    })
    .filter(Boolean);
}

function parseStoredFiles(fileUrl) {
  if (!fileUrl) {
    return [];
  }

  if (Array.isArray(fileUrl)) {
    return normalizeStoredFileList(fileUrl);
  }

  if (typeof fileUrl !== "string") {
    return [];
  }

  const trimmed = fileUrl.trim();

  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[")) {
    try {
      return normalizeStoredFileList(JSON.parse(trimmed));
    } catch (error) {
      return [];
    }
  }

  return [{ path: trimmed }];
}

function isPathInside(parentPath, childPath) {
  const relative = path.relative(parentPath, childPath);

  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function resolveStoredFilePath(storedPath) {
  if (!storedPath || typeof storedPath !== "string") {
    return null;
  }

  const normalized = storedPath.replace(/\\/g, "/").replace(/^\/+/, "");
  let resolvedPath;

  if (path.isAbsolute(storedPath)) {
    resolvedPath = path.resolve(storedPath);
  } else if (normalized.startsWith("uploads/")) {
    resolvedPath = path.resolve(UPLOAD_DIR, normalized.slice("uploads/".length));
  } else if (normalized.startsWith("backend/uploads/")) {
    resolvedPath = path.resolve(__dirname, "..", "..", normalized);
  } else {
    resolvedPath = path.resolve(__dirname, "..", normalized);
  }

  return isPathInside(UPLOAD_DIR, resolvedPath) ? resolvedPath : null;
}

async function deleteStoredFiles(storedPaths) {
  for (const storedPath of normalizeStringArray(storedPaths)) {
    const filePath = resolveStoredFilePath(storedPath);

    if (!filePath || !fs.existsSync(filePath)) {
      continue;
    }

    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      console.log("File delete skipped:", error.message);
    }
  }
}

function formatDuration(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  const diffMs = end - start;

  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return null;
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

function mapTaskRecord(record) {
  const assignedUserIds = record.assigned_user_ids
    ? splitJoinedValues(record.assigned_user_ids, ",")
    : normalizeStringArray(record.user_id);

  const assignedStaffNames = record.assigned_staff_names
    ? splitJoinedValues(record.assigned_staff_names, "||")
    : normalizeStringArray(record.staff_name);

  const primaryUserId = assignedUserIds[0] || (record.user_id ?? null);
  const primaryStaffName = assignedStaffNames[0] || record.staff_name || null;

  const task = {
    ...record,
    user_id: primaryUserId,
    staff_name: primaryStaffName,
    profile_pic: record.profile_pic || null,
    assigned_user_ids: assignedUserIds,
    assigned_staff_names: assignedStaffNames,
    assigned_users: assignedUserIds.map((userId, index) => ({
      user_id: userId,
      name: assignedStaffNames[index] || null,
    })),
    user_ids_label: assignedUserIds.join(", "),
    staff_names_label: assignedStaffNames.join(", "),
    media: parseStoredFiles(record.file_url),
  };

  if (record.accepted_at && record.completed_at) {
    task.duration = formatDuration(record.accepted_at, record.completed_at);
  }

  return task;
}

async function insertAssignments(connection, taskId, userIds) {
  if (!userIds.length) {
    return;
  }

  const placeholders = userIds.map(() => "(?, ?)").join(", ");
  const values = userIds.flatMap((userId) => [taskId, userId]);

  await connection.query(
    `INSERT INTO task_assignments (task_id, user_id) VALUES ${placeholders}`,
    values
  );
}

async function replaceAssignments(connection, taskId, userIds) {
  await connection.query(
    "DELETE FROM task_assignments WHERE task_id = ?",
    [taskId]
  );

  await insertAssignments(connection, taskId, userIds);
}

async function fetchTaskRecipients(taskId) {
  const [rows] = await promiseDb.query(
    `
      SELECT DISTINCT t.id AS taskId, t.title, t.status, ta.user_id
      FROM tasks t
      LEFT JOIN task_assignments ta ON t.id = ta.task_id
      WHERE t.id = ?
    `,
    [taskId]
  );

  return (rows || []).filter((row) => row.user_id !== null && row.user_id !== undefined);
}

function emitTaskEvent(io, recipients, eventName, extraPayload = {}) {
  const time = new Date();

  recipients.forEach((recipient) => {
    io.to(`user_${recipient.user_id}`).emit(eventName, {
      taskId: recipient.taskId,
      title: recipient.title,
      status: recipient.status,
      time,
      ...extraPayload,
    });
  });
}
router.post("/assign", upload.array("files", 20), async (req, res) => {
  const { title, description, category, priority } = req.body;
  const userIds = normalizeUserIds(req.body);
  const uploadedFiles = req.files || (req.file ? [req.file] : []);
  const storedFiles = toStoredFiles(uploadedFiles);
  const fileUrl = storedFiles.length ? JSON.stringify(storedFiles) : null;

  if (!title || userIds.length === 0) {
    return res.status(400).json({ msg: "Missing required fields" });
  }

  let connection;

  try {
    connection = await promiseDb.getConnection();
    await connection.beginTransaction();

    // 1. Task Insert Karo
    const [result] = await connection.query(
      `INSERT INTO tasks (title, description, category, priority, status, file_url)
       VALUES (?, ?, ?, ?, 'Pending', ?)`,
      [title, description, category, priority, fileUrl]
    );

    const taskId = result.insertId;

    // 2. Task Assignments Insert Karo
    await insertAssignments(connection, taskId, userIds);
    await connection.commit();

    // 3. Socket.io Update
    const io = req.app.get("io");
    if (io) {
      io.emit("updateData");
      const recipients = await fetchTaskRecipients(taskId);
      emitTaskEvent(io, recipients, "taskAssigned", { msg: "New Task Assigned" });
    }

    // 4. 🔥 FIREBASE PUSH NOTIFICATION LOGIC 🔥
    try {
      // Un users ke fcm_tokens nikalo jinhe task assign hua hai
      const [users] = await promiseDb.query(
        "SELECT fcm_token FROM users WHERE id IN (?) AND fcm_token IS NOT NULL",
        [userIds]
      );

      const tokens = users.map(u => u.fcm_token).filter(Boolean);

      if (tokens.length > 0) {
       await admin.messaging().sendEachForMulticast({
  tokens,
  notification: {
    title: "📢 New Task Assigned",
    body: `You have a new task: ${title}`,
  },
  data: {
    taskId: String(taskId),
    click_action: "FLUTTER_NOTIFICATION_CLICK" // ⚠️ important fallback
  }
});
        console.log(`✅ Push sent to ${tokens.length} devices`);
      }
    } catch (pushErr) {
      console.error("❌ Push Notification Error:", pushErr.message);
      // Push error se main request fail nahi honi chahiye, isliye sirf log kiya hai
    }

    return res.status(201).json({
      success: true,
      taskId,
      msg: "Task assigned successfully",
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Task insert error:", error);
    return res.status(500).json({ success: false, msg: "Failed to assign task" });
  } finally {
    if (connection) connection.release();
  }
});

router.get("/my-tasks/:userId", async (req, res) => {
  try {
    const [rows] = await promiseDb.query(
      `
        SELECT t.*, ta.user_id
        FROM tasks t
        INNER JOIN task_assignments ta ON t.id = ta.task_id
        WHERE ta.user_id = ?
        ORDER BY t.id DESC
      `,
      [req.params.userId]
    );

    return res.json((rows || []).map(mapTaskRecord));
  } catch (error) {
    console.error("Fetch error:", error);
    return res.status(500).json({
      success: false,
      msg: "Failed to fetch tasks",
    });
  }
});

router.get("/activity/stats", async (req, res) => {
  const statsQuery = `
    SELECT
      COUNT(*) AS taskCount,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS runningCount,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS closedCount,
      SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejectedCount
    FROM tasks
  `;

  const staffQuery = `
    SELECT COUNT(*) AS staffCount
    FROM users
    WHERE role != 'superadmin'
  `;

  const activitiesQuery = `
    SELECT
      t.*,
      assignment_summary.primary_user_id AS user_id,
      assignment_summary.primary_staff_name AS staff_name,
      assignment_summary.primary_profile_pic AS profile_pic,
      assignment_summary.assigned_user_ids,
      assignment_summary.assigned_staff_names
    FROM tasks t
    LEFT JOIN (
      SELECT
        assignment_rows.task_id,
        SUBSTRING_INDEX(
          GROUP_CONCAT(assignment_rows.user_id ORDER BY assignment_rows.user_id SEPARATOR ','),
          ',',
          1
        ) AS primary_user_id,
        SUBSTRING_INDEX(
          GROUP_CONCAT(u.name ORDER BY u.id SEPARATOR '||'),
          '||',
          1
        ) AS primary_staff_name,
        SUBSTRING_INDEX(
          GROUP_CONCAT(NULLIF(u.profile_pic, '') ORDER BY u.id SEPARATOR '||'),
          '||',
          1
        ) AS primary_profile_pic,
        GROUP_CONCAT(assignment_rows.user_id ORDER BY assignment_rows.user_id SEPARATOR ',') AS assigned_user_ids,
        GROUP_CONCAT(u.name ORDER BY u.id SEPARATOR '||') AS assigned_staff_names
      FROM (
        SELECT DISTINCT task_id, user_id
        FROM task_assignments
      ) AS assignment_rows
      LEFT JOIN users u ON assignment_rows.user_id = u.id
      GROUP BY assignment_rows.task_id
    ) AS assignment_summary ON t.id = assignment_summary.task_id
    ORDER BY t.created_at DESC, t.id DESC
  `;

  try {
    const [statsRows] = await promiseDb.query(statsQuery);
    const [staffRows] = await promiseDb.query(staffQuery);
    const [activities] = await promiseDb.query(activitiesQuery);

    return res.json({
      staffCount: staffRows[0]?.staffCount || 0,
      taskCount: statsRows[0]?.taskCount || 0,
      runningCount: statsRows[0]?.runningCount || 0,
      closedCount: statsRows[0]?.closedCount || 0,
      rejectedCount: statsRows[0]?.rejectedCount || 0,
      activities: (activities || []).map(mapTaskRecord),
    });
  } catch (error) {
    console.error("Activity stats error:", error);
    return res.status(500).json({
      success: false,
      msg: "Failed to load activity stats",
    });
  }
});

router.put("/update-status/:id", async (req, res) => {
  const { status, rejection_reason } = req.body;
  const taskId = req.params.id;

  if (!status) {
    return res.status(400).json({ msg: "Status is required" });
  }

  const updateParts = [
    "status = ?",
    "updated_at = NOW()",
  ];
  const values = [status];

  if (status === "In Progress") {
    updateParts.push("accepted_at = COALESCE(accepted_at, NOW())");
  }

  if (status === "Completed") {
    updateParts.push("completed_at = COALESCE(completed_at, NOW())");
  }

  if (status === "Rejected") {
    if (!rejection_reason) {
      return res.status(400).json({ msg: "Rejection reason required" });
    }

    updateParts.push("rejected_at = COALESCE(rejected_at, NOW())");
    updateParts.push("rejection_reason = ?");
    values.push(rejection_reason);
  }

  values.push(taskId);

  try {
    const [result] = await promiseDb.query(
      `UPDATE tasks SET ${updateParts.join(", ")} WHERE id = ?`,
      values
    );

    if (!result.affectedRows) {
      return res.status(404).json({ msg: "Task not found" });
    }

    const io = req.app.get("io");

    if (io) {
      io.emit("updateData");

      const recipients = await fetchTaskRecipients(taskId);
      emitTaskEvent(io, recipients, "taskUpdate", {
        msg: `Task ${status}`,
        status,
        rejection_reason: status === "Rejected" ? rejection_reason : null,
      });
    }

    return res.json({
      success: true,
      msg: "Task status updated successfully",
    });
  } catch (error) {
    console.error("Status update error:", error);
    return res.status(500).json({
      success: false,
      msg: "Failed to update task status",
    });
  }
});

router.put("/:id", upload.array("files", 20), async (req, res) => {
  const taskId = req.params.id;
  const {
    title,
    description,
    status,
    category,
    priority,
  } = req.body;

  const hasAssignmentUpdate =
    Object.prototype.hasOwnProperty.call(req.body, "user_id") ||
    Object.prototype.hasOwnProperty.call(req.body, "user_ids") ||
    Object.prototype.hasOwnProperty.call(req.body, "user_ids[]");

  const userIds = hasAssignmentUpdate ? normalizeUserIds(req.body) : [];
  const removedFiles = normalizeStringArray(req.body.removedFiles);
  const uploadedFiles = req.files || (req.file ? [req.file] : []);
  const newFiles = toStoredFiles(uploadedFiles);

  let connection;

  try {
    connection = await promiseDb.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      "SELECT file_url FROM tasks WHERE id = ?",
      [taskId]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ msg: "Task not found" });
    }

    const oldFiles = parseStoredFiles(rows[0].file_url);
    const keptOldFiles = oldFiles.filter(
      (file) => !removedFiles.includes(file.path)
    );
    const finalFiles = [...keptOldFiles, ...newFiles];

    const fields = [];
    const values = [];

    if (title !== undefined) {
      fields.push("title = ?");
      values.push(title);
    }

    if (description !== undefined) {
      fields.push("description = ?");
      values.push(description);
    }

    if (status !== undefined) {
      fields.push("status = ?");
      values.push(status);
    }

    if (category !== undefined) {
      fields.push("category = ?");
      values.push(category);
    }

    if (priority !== undefined) {
      fields.push("priority = ?");
      values.push(priority);
    }

    if (newFiles.length > 0 || removedFiles.length > 0) {
      fields.push("file_url = ?");
      values.push(finalFiles.length ? JSON.stringify(finalFiles) : null);
    }

    if (fields.length === 0 && !hasAssignmentUpdate) {
      await connection.rollback();
      return res.json({ msg: "Nothing to update" });
    }

    if (fields.length > 0) {
      values.push(taskId);

      await connection.query(
        `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`,
        values
      );
    }

    if (hasAssignmentUpdate) {
      await replaceAssignments(connection, taskId, userIds);
    }

    await connection.commit();

    if (removedFiles.length) {
      await deleteStoredFiles(removedFiles);
    }

    const io = req.app.get("io");

    if (io) {
      io.emit("updateData");

      const recipients = await fetchTaskRecipients(taskId);

      if (hasAssignmentUpdate) {
        emitTaskEvent(io, recipients, "taskAssigned", {
          msg: "Task Reassigned",
        });
      } else {
        emitTaskEvent(io, recipients, "taskUpdate", {
          msg: "Task Updated",
        });
      }
    }

    return res.json({
      success: true,
      msg: "Task updated successfully",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Task update error:", error);
    return res.status(500).json({
      success: false,
      msg: "Failed to update task",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.delete("/:id", async (req, res) => {
  const taskId = req.params.id;
  let connection;
  let storedFiles = [];

  try {
    connection = await promiseDb.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      "SELECT file_url FROM tasks WHERE id = ?",
      [taskId]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ msg: "Task not found" });
    }

    storedFiles = parseStoredFiles(rows[0].file_url).map((file) => file.path);

    await connection.query(
      "DELETE FROM task_assignments WHERE task_id = ?",
      [taskId]
    );

    await connection.query("DELETE FROM tasks WHERE id = ?", [taskId]);
    await connection.commit();

    await deleteStoredFiles(storedFiles);

    const io = req.app.get("io");

    if (io) {
      io.emit("updateData");
    }

    return res.json({ msg: "Task deleted successfully" });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Task delete error:", error);
    return res.status(500).json({
      success: false,
      msg: "Failed to delete task",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
