const router = require('express').Router();
const { userAuth } = require('../middleware/auth');
const db = require('../config/db');

// GET /api/user/notifications
// Returns combined: recent published announcements + user appointment status updates
router.get('/notifications', userAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Recent published announcements (last 30 days)
    const { data: announcements = [], error: annErr } = await db
      .from('announcements')
      .select('id, title, category, body, author, publish_date, created_at')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (annErr) throw annErr;

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
    const { data: appointments = [], error: aptErr } = await db
      .from('appointments')
      .select('id, service, date, time, status, updated_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .neq('status', 'pending')
      .order('updated_at', { ascending: false });
    if (aptErr) throw aptErr;

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
    const vaxCutoff = new Date();
    vaxCutoff.setDate(vaxCutoff.getDate() + 14);
    const vaxCutoffStr = vaxCutoff.toISOString().slice(0, 10);
    const fullName = req.user.full_name || '';

    const { data: vaccines = [], error: vaxErr } = await db
      .from('vaccinations')
      .select('id, vaccine, dose, next_due, status, updated_at')
      .is('deleted_at', null)
      .or(`user_id.eq.${userId},and(user_id.is.null,patient.eq."${fullName}")`)
      .or(`status.eq.missed,and(status.eq.scheduled,next_due.lte.${vaxCutoffStr})`)
      .order('next_due', { ascending: true });
    if (vaxErr) throw vaxErr;

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
    const { data: rows, error } = await db
      .from('announcements')
      .select('id, title, category, body, author, audience, publish_date, event_date, pinned, created_at')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/health-records — records belonging to the logged-in user
router.get('/health-records', userAuth, async (req, res) => {
  try {
    const { data: rows, error } = await db
      .from('health_records')
      .select('*')
      .eq('patient', req.user.full_name || '')
      .is('deleted_at', null)
      .order('date', { ascending: false });
    if (error) throw error;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/vaccinations — vaccinations belonging to the logged-in user
router.get('/vaccinations', userAuth, async (req, res) => {
  try {
    const { data: rows, error } = await db
      .from('vaccinations')
      .select('*')
      .is('deleted_at', null)
      .or(`user_id.eq.${req.user.id},and(user_id.is.null,patient.eq."${req.user.full_name || ''}")`)
      .order('date', { ascending: false });
    if (error) throw error;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/notifications — notifications for the logged-in user
router.get('/notifications', userAuth, async (req, res) => {
  try {
    const { data: rows, error } = await db
      .from('notifications')
      .select('id, type, title, message, priority, is_read, timestamp:created_at')
      .or(`recipient.eq."${req.user.full_name || ''}",recipient.eq."All Users"`)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    
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

// POST /api/user/notifications — create a notification for the logged-in user
router.post('/notifications', userAuth, async (req, res) => {
  try {
    const { type, title, message, priority, data } = req.body;
    
    const { data: notification, error } = await db
      .from('notifications')
      .insert({
        type: type || 'vaccination_reminder',
        title: title || 'Vaccination Reminder',
        message: message || '',
        recipient: req.user.full_name || req.user.username,
        priority: priority || 'normal',
        is_read: false,
        data: data || null,
      })
      .select()
      .single();
    
    if (error) throw error;
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Keep old endpoint for backward compatibility
router.get('/notifications-list', userAuth, async (req, res) => {
  try {
    const { data: rows, error } = await db
      .from('notifications')
      .select('id, type, title, message, priority, is_read, created_at')
      .or(`recipient.eq."${req.user.full_name || ''}",recipient.eq."All Users"`)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
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

    const like = `%${query}%`;
    const { data: rows, error } = await db
      .from('users')
      .select('id, full_name, username, phone, purok')
      .or(`full_name.ilike.${like},username.ilike.${like},phone.ilike.${like}`)
      .limit(10);
    if (error) throw error;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
