const router = require('express').Router();
const { userAuth } = require('../middleware/auth');
const db = require('../config/db');

const DEFAULT_SLOT_LIMIT = 5;

async function getServiceLimit(serviceName) {
  if (!serviceName) return DEFAULT_SLOT_LIMIT;
  const [rows] = await db.query(
    `SELECT slots_per_hour FROM services WHERE name = ? AND deleted_at IS NULL LIMIT 1`,
    [serviceName]
  );
  return rows.length > 0 && rows[0].slots_per_hour > 0 ? rows[0].slots_per_hour : DEFAULT_SLOT_LIMIT;
}

// GET /api/user/appointments/slots?date=YYYY-MM-DD&service=ServiceName
router.get('/slots', userAuth, async (req, res) => {
  try {
    const { date, service } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required.' });
    const limit = await getServiceLimit(service);
    const [rows] = await db.query(
      `SELECT time, COUNT(*) as booked FROM appointments
       WHERE date = ? AND service = ? AND deleted_at IS NULL AND status NOT IN ('cancelled','rejected')
       GROUP BY time`,
      [date, service || '']
    );
    const slotMap = {};
    rows.forEach((r) => { slotMap[r.time] = r.booked; });
    res.json({ limit, slots: slotMap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/appointments  — list current user's appointments
router.get('/', userAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, service, date, time, notes, status, handled_by, created_at, updated_at FROM appointments WHERE user_id = ? AND deleted_at IS NULL ORDER BY date DESC, time ASC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/appointments  — book a new appointment
router.post('/', userAuth, async (req, res) => {
  try {
    const { service, date, time, notes } = req.body;
    if (!service || !date || !time)
      return res.status(400).json({ error: 'Service, date, and time are required.' });

    // Check slot capacity (per-service limit)
    const slotLimit = await getServiceLimit(service);
    const [[slot]] = await db.query(
      `SELECT COUNT(*) as booked FROM appointments
       WHERE date = ? AND time = ? AND service = ? AND deleted_at IS NULL AND status NOT IN ('cancelled','rejected')`,
      [date, time, service]
    );
    if (slot.booked >= slotLimit)
      return res.status(409).json({ error: `This time slot is full (max ${slotLimit} per slot for this service). Please choose another time.` });

    // Fetch user full_name from users table
    const [users] = await db.query('SELECT full_name FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found.' });

    const [result] = await db.query(
      'INSERT INTO appointments (user_id, name, service, date, time, notes, status) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, users[0].full_name, service, date, time, notes || '', 'pending']
    );

    // Create admin notification for the new appointment
    const fullName = users[0].full_name;
    const formattedDate = new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila',
    });
    await db.query(
      `INSERT INTO notifications (type, priority, title, message, recipient, is_read)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'Appointment',
        'normal',
        'New appointment booked',
        `${fullName} booked ${service} on ${formattedDate} at ${time}.${notes ? ` Notes: ${notes}` : ''}`,
        'All Staff',
        0,
      ]
    );

    const appointment = {
      id: result.insertId,
      user_id: req.user.id,
      name: fullName,
      service,
      date,
      time,
      notes: notes || '',
      status: 'pending',
    };

    if (global.io) {
      global.io.emit('appointment-created', appointment);
    }

    res.status(201).json({ ok: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/user/appointments/:id  — cancel own appointment
router.delete('/:id', userAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM appointments WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Appointment not found.' });
    if (rows[0].status !== 'pending')
      return res.status(400).json({ error: 'Only pending appointments can be cancelled.' });

    await db.query('DELETE FROM appointments WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/appointments/notifications — appointment status updates as user notifications
router.get('/notifications', userAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, service, date, time, status, updated_at
       FROM appointments
       WHERE user_id = ? AND deleted_at IS NULL AND status != 'pending'
       ORDER BY updated_at DESC LIMIT 20`,
      [req.user.id]
    );
    const statusLabel = { confirmed: 'Confirmed', rejected: 'Rejected', completed: 'Completed', cancelled: 'Cancelled' };
    const statusColor = { confirmed: '#16a34a', rejected: '#dc2626', completed: '#1d4ed8', cancelled: '#6b7280' };
    const notifications = rows.map((r) => ({
      id:         r.id,
      type:       'appointment',
      status:     r.status,
      title:      `Appointment ${statusLabel[r.status] || r.status}`,
      message:    `${r.service} on ${r.date} at ${r.time}`,
      color:      statusColor[r.status] || '#374151',
      updated_at: r.updated_at,
    }));
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
