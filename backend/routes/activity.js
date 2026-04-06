const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/stats', (req, res) => {

  // ✅ OPTIONAL FILTERS
  const { status, category } = req.query;

  // ==========================
  // ✅ COUNT QUERY
  // ==========================
  const countQuery = `
    SELECT 
      (SELECT COUNT(*) FROM users WHERE role != 'superadmin') AS staffCount,
      (SELECT COUNT(*) FROM tasks) AS taskCount,
      (SELECT COUNT(*) FROM tasks WHERE status='Completed') AS completedCount,
      (SELECT COUNT(*) FROM tasks WHERE status='In Progress') AS inProgressCount
  `;

  // ==========================
  // ✅ BASE ACTIVITY QUERY (FIXED 🔥)
  // ==========================
  let activityQuery = `
 SELECT 
  t.id, 
  t.title, 
  t.description, 
  t.status, 
  t.priority,
  t.created_at, 
  t.category,
  t.file_url,
 IFNULL(t.rejection_reason, '') AS rejection_reason, -- ✅ ADD THIS LINE
  u.name AS staff_name,
  u.profile_pic,
  ta.user_id
  FROM tasks t
  LEFT JOIN task_assignments ta ON t.id = ta.task_id
  LEFT JOIN users u ON ta.user_id = u.id
`;

  // ==========================
  // ✅ FILTER CONDITIONS
  // ==========================
  let conditions = [];

  if (status && status !== "All") {
    conditions.push(`t.status = '${status.replace(/'/g, "")}'`);
  }

  if (category && category !== "All") {
    conditions.push(`t.category = '${category}'`);
  }

  if (conditions.length > 0) {
    activityQuery += " WHERE " + conditions.join(" AND ");
  }

  // ==========================
  // ✅ ORDER FIX
  // ==========================
  activityQuery += `
    ORDER BY 
      t.created_at DESC,
      t.id DESC
  `;

  // ==========================
  // ✅ EXECUTE QUERIES
  // ==========================
  db.query(countQuery, (err, countRes) => {
    if (err) {
      console.error("❌ Count Error:", err);
      return res.status(500).json(err);
    }

    db.query(activityQuery, (err2, activityRes) => {
      if (err2) {
       console.error("❌ Activity FULL ERROR:", err2.sqlMessage, err2.sql);
        return res.status(500).json(err2);
      }

      // ==========================
      // ✅ MEDIA PARSE (FINAL FIX 🔥)
      // ==========================
      const updatedActivities = (activityRes || []).map(r => {
        try {
          if (r.file_url?.startsWith('[')) {
            // ✅ MULTIPLE FILES
            r.media = JSON.parse(r.file_url);
          } 
          else if (r.file_url) {
            // ✅ SINGLE FILE
            r.media = [{ path: r.file_url }];
          } 
          else {
            r.media = [];
          }
        } catch (e) {
          console.log("❌ Media parse error:", e.message);
          r.media = [];
        }
        return r;
      });

      console.log("✅ DATA SENT TO FRONTEND");

      // ==========================
      // ✅ FINAL RESPONSE
      // ==========================
      res.json({
        staffCount: countRes[0]?.staffCount || 0,
        taskCount: countRes[0]?.taskCount || 0,
        completedCount: countRes[0]?.completedCount || 0,
        inProgressCount: countRes[0]?.inProgressCount || 0,

        totalActivities: updatedActivities.length,
        activities: updatedActivities
      });

    });
  });

});
// ✅ PUBLIC DASHBOARD DATA (NO AUTH)
router.get('/public-dashboard', (req, res) => {

  const today = new Date().toISOString().slice(0, 10);

  const activitiesQuery = `
  SELECT 
    t.*, 
    ta.user_id, 
    u.name as staff_name,
    u.profile_pic   -- 🔥 ADD THIS
  FROM tasks t
  LEFT JOIN task_assignments ta ON t.id = ta.task_id
  LEFT JOIN users u ON ta.user_id = u.id
  ORDER BY t.created_at DESC
`;

  db.query(activitiesQuery, (err, data) => {
    if (err) return res.status(500).json(err);

    // 🔥 FILTER LOGIC
    const todayData = data.filter(d => d.created_at?.startsWith(today));
   const pending = data.filter(d => d.status !== 'Completed');

    res.json({
      today,
      todayComplaints: todayData,
      pendingComplaints: pending,
      all: data
    });
  });
});

module.exports = router;