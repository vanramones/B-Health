const router = require('express').Router();
const { userAuth } = require('../middleware/auth');
const db = require('../config/db');

// GET /api/user/notifications
// Returns combined: recent published announcements + user appointment status updates
router.get('/notifications', userAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Recent published announcements (last 30 days)
    const [announcements] = await db.query(
      `SELECT id, title, category, body, author, publish_date, created_at
       FROM announcements
       WHERE status = 'published' AND deleted_at IS NULL
       ORDER BY created_at DESC`
    );

    const announcementNotifs = announcements.map((a) => ({
      id:         `ann_${a.id}`,
      sourceId:   a.id,
      type:       'announcement',
      category:   a.category,
      title:      a.title,
      message:    a.body ? a.body.replace(/<[^>]+>/g, '').slice(0, 100) : '',
      author:     a.author || 'Admin',
      timestamp:  a.created_at,
      navigateTo: '/user/announcements',
    }));

    // 2. User's appointment status updates (non-pending)
    const [appointments] = await db.query(
      `SELECT id, service, date, time, status, updated_at
       FROM appointments
       WHERE user_id = ? AND deleted_at IS NULL AND status != 'pending'
       ORDER BY updated_at DESC`,
      [userId]
    );

    const statusLabel = { approved: 'Approved', rejected: 'Rejected', completed: 'Completed', cancelled: 'Cancelled' };
    const appointmentNotifs = appointments.map((a) => ({
      id:         `apt_${a.id}`,
      sourceId:   a.id,
      type:       'appointment',
      status:     a.status,
      title:      `Appointment ${statusLabel[a.status] || a.status}`,
      message:    `${a.service} on ${a.date} at ${a.time}`,
      timestamp:  a.updated_at,
      navigateTo: '/user/appointments',
    }));

    // 3. Vaccine due-date reminders (due within 14 days, overdue, or missed)
    const [vaccines] = await db.query(
      `SELECT id, vaccine, dose, next_due, status, updated_at
       FROM vaccinations
       WHERE (user_id = ? OR (user_id IS NULL AND patient = ?))
         AND deleted_at IS NULL
         AND (
           status = 'missed'
           OR (status = 'scheduled' AND next_due IS NOT NULL AND next_due <= DATE_ADD(CURDATE(), INTERVAL 14 DAY))
         )
       ORDER BY next_due ASC`,
      [userId, req.user.full_name]
    );

    const vaccineNotifs = vaccines.map((v) => {
      const today    = new Date();
      const due      = v.next_due ? new Date(v.next_due) : null;
      const overdue  = due && due < today;
      const isMissed = v.status === 'missed';
      const daysAway = due ? Math.ceil((due - today) / 86400000) : null;

      let title, message, urgency;
      if (isMissed) {
        title   = `Missed Vaccine: ${v.vaccine}`;
        message = `You missed your ${v.dose} dose. Please schedule a new appointment.`;
        urgency = 'missed';
      } else if (overdue) {
        title   = `Overdue Vaccine: ${v.vaccine}`;
        message = `Your ${v.dose} dose was due on ${new Date(v.next_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. Please schedule immediately.`;
        urgency = 'overdue';
      } else {
        title   = `Upcoming Vaccine: ${v.vaccine}`;
        message = `Your ${v.dose} dose is due ${daysAway === 0 ? 'today' : `in ${daysAway} day${daysAway !== 1 ? 's' : ''}`} on ${new Date(v.next_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`;
        urgency = daysAway <= 3 ? 'soon' : 'upcoming';
      }

      return {
        id:         `vax_${v.id}`,
        sourceId:   v.id,
        type:       'vaccine',
        urgency,
        title,
        message,
        timestamp:  due || v.updated_at,
        navigateTo: '/user/vaccinations',
      };
    });

    // Merge and sort by timestamp descending
    const all = [...announcementNotifs, ...appointmentNotifs, ...vaccineNotifs].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    res.json(all);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/announcements — published announcements visible to users
router.get('/announcements', userAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, title, category, body, author, audience, publish_date, event_date, pinned, created_at
       FROM announcements
       WHERE status = 'published' AND deleted_at IS NULL
       ORDER BY pinned DESC, created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/health-records — records belonging to the logged-in user
router.get('/health-records', userAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM health_records
       WHERE patient = ? AND deleted_at IS NULL
       ORDER BY date DESC`,
      [req.user.full_name]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/vaccinations — vaccinations belonging to the logged-in user
router.get('/vaccinations', userAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM vaccinations
       WHERE (user_id = ? OR (user_id IS NULL AND patient = ?))
         AND deleted_at IS NULL
       ORDER BY date DESC`,
      [req.user.id, req.user.full_name]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/notifications — notifications for the logged-in user
router.get('/notifications', userAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, type, title, message, priority, is_read, created_at as timestamp
       FROM notifications
       WHERE recipient = ? OR recipient = 'All Users'
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.full_name]
    );
    
    // Map notifications with proper structure for frontend
    const notifications = rows.map((n) => ({
      id: n.id,
      type: n.type || 'health_record',
      title: n.title,
      message: n.message,
      timestamp: n.timestamp,
      status: 'completed',
      urgency: 'upcoming',
      navigateTo: n.type === 'health_record' ? '/user/health-records' : '/user/notifications',
    }));
    
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Keep old endpoint for backward compatibility
router.get('/notifications-list', userAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, type, title, message, priority, is_read, created_at
       FROM notifications
       WHERE recipient = ? OR recipient = 'All Users'
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.full_name]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/search — search users by name or email (admin only)
router.get('/search', userAuth, async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query.trim()) {
      return res.json([]);
    }

    const searchTerm = `%${query}%`;
    const [rows] = await db.query(
      `SELECT id, full_name, email, phone, barangay
       FROM users
       WHERE (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)
         AND deleted_at IS NULL
       LIMIT 10`,
      [searchTerm, searchTerm, searchTerm]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
