const router = require('express').Router();
const { userAuth } = require('../middleware/auth');
const db = require('../config/db');

const DEFAULT_SLOT_LIMIT = 5;

async function getServiceLimit(serviceName) {
  if (!serviceName) return DEFAULT_SLOT_LIMIT;
  const { data: rows } = await db
    .from('services')
    .select('slots_per_hour')
    .eq('name', serviceName)
    .is('deleted_at', null)
    .limit(1);
  return rows && rows.length > 0 && rows[0].slots_per_hour > 0
    ? rows[0].slots_per_hour
    : DEFAULT_SLOT_LIMIT;
}

// GET /api/user/appointments/slots?date=YYYY-MM-DD&service=ServiceName
router.get('/slots', userAuth, async (req, res) => {
  try {
    const { date, service } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required.' });

    const limit = await getServiceLimit(service);

    const { data: rows, error } = await db
      .from('appointments')
      .select('time')
      .eq('date', date)
      .eq('service', service || '')
      .is('deleted_at', null)
      .not('status', 'in', '("cancelled","rejected")');
    if (error) throw error;

    const slotMap = {};
    rows.forEach((r) => {
      slotMap[r.time] = (slotMap[r.time] || 0) + 1;
    });

    res.json({ limit, slots: slotMap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/appointments
router.get('/', userAuth, async (req, res) => {
  try {
    const { data: rows, error } = await db
      .from('appointments')
      .select('id,name,service,date,time,notes,status,handled_by,created_at,updated_at')
      .eq('user_id', req.user.id)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .order('time', { ascending: true });
    if (error) throw error;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/appointments — book a new appointment
router.post('/', userAuth, async (req, res) => {
  try {
    const { service, date, time, notes } = req.body;
    if (!service || !date || !time)
      return res.status(400).json({ error: 'Service, date, and time are required.' });

    // Check slot capacity
    const slotLimit = await getServiceLimit(service);
    const { data: slotRows, error: slotError } = await db
      .from('appointments')
      .select('id')
      .eq('date', date)
      .eq('time', time)
      .eq('service', service)
      .is('deleted_at', null)
      .not('status', 'in', '("cancelled","rejected")');
    if (slotError) throw slotError;

    if (slotRows.length >= slotLimit)
      return res.status(409).json({ error: `This time slot is full (max ${slotLimit} per slot for this service). Please choose another time.` });

    // Fetch user full_name
    const { data: users, error: userError } = await db
      .from('users')
      .select('full_name')
      .eq('id', req.user.id)
      .limit(1);
    if (userError) throw userError;
    if (!users || users.length === 0) return res.status(404).json({ error: 'User not found.' });

    const fullName = users[0].full_name;

    // Insert appointment
    const { data: appt, error: apptError } = await db
      .from('appointments')
      .insert({
        user_id: req.user.id,
        name:    fullName,
        service,
        date,
        time,
        notes:   notes || '',
        status:  'pending',
      })
      .select('id')
      .single();
    if (apptError) throw apptError;

    // Create admin notification
    const formattedDate = new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila',
    });
    await db.from('notifications').insert({
      type:      'Appointment',
      priority:  'normal',
      title:     'New appointment booked',
      message:   `${fullName} booked ${service} on ${formattedDate} at ${time}.${notes ? ` Notes: ${notes}` : ''}`,
      recipient: 'All Staff',
      is_read:   false,
    });

    const appointment = {
      id:      appt.id,
      user_id: req.user.id,
      name:    fullName,
      service,
      date,
      time,
      notes:   notes || '',
      status:  'pending',
    };

    if (global.io) {
      global.io.emit('appointment-created', appointment);
    }

    res.status(201).json({ ok: true, id: appt.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/user/appointments/:id — cancel own appointment
router.delete('/:id', userAuth, async (req, res) => {
  try {
    const { data: rows, error: fetchError } = await db
      .from('appointments')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .limit(1);
    if (fetchError) throw fetchError;
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Appointment not found.' });
    if (rows[0].status !== 'pending')
      return res.status(400).json({ error: 'Only pending appointments can be cancelled.' });

    const { error } = await db.from('appointments').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/user/appointments/:id/accept-reschedule — user accepts rescheduled appointment
router.patch('/:id/accept-reschedule', userAuth, async (req, res) => {
  try {
    const { data: rows, error: fetchError } = await db
      .from('appointments')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .limit(1);
    if (fetchError) throw fetchError;
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Appointment not found.' });

    const apt = rows[0];

    // Update status to approved (user accepted the reschedule)
    const { error: updateError } = await db
      .from('appointments')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (updateError) throw updateError;

    // Fetch user name
    const { data: users } = await db.from('users').select('full_name').eq('id', req.user.id).limit(1);
    const userName = users?.[0]?.full_name || 'User';

    // Create admin notification
    const formattedDate = new Date(apt.date).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila',
    });
    await db.from('notifications').insert({
      type:      'Appointment',
      priority:  'normal',
      title:     'Reschedule accepted',
      message:   `${userName} accepted the rescheduled appointment for ${apt.service} on ${formattedDate} at ${apt.time}.`,
      recipient: 'All Staff',
      is_read:   false,
    });

    // Emit socket event
    if (global.io) {
      global.io.emit('reschedule-accepted', {
        appointmentId: req.params.id,
        userId: req.user.id,
        patientName: userName,
        service: apt.service,
        date: apt.date,
        time: apt.time,
      });
    }

    res.json({ ok: true, message: 'Reschedule accepted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/appointments/:id/send-note — user sends a note to admin about an appointment
router.post('/:id/send-note', userAuth, async (req, res) => {
  try {
    const { note } = req.body;
    if (!note || !note.trim()) return res.status(400).json({ error: 'Note is required.' });

    const { data: rows, error: fetchError } = await db
      .from('appointments')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .limit(1);
    if (fetchError) throw fetchError;
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Appointment not found.' });

    const apt = rows[0];

    // Fetch user name
    const { data: users } = await db.from('users').select('full_name').eq('id', req.user.id).limit(1);
    const userName = users?.[0]?.full_name || 'User';

    // Append note to appointment notes
    const userNote = `[NOTE from ${userName}] ${note.trim()}`;
    const combinedNotes = apt.notes ? `${apt.notes}\n\n${userNote}` : userNote;
    const { error: updateError } = await db
      .from('appointments')
      .update({ notes: combinedNotes, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (updateError) throw updateError;

    // Create admin notification
    const formattedDate = new Date(apt.date).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila',
    });
    await db.from('notifications').insert({
      type:      'Appointment',
      priority:  'normal',
      title:     'User sent a note',
      message:   `${userName} sent a note about ${apt.service} (${formattedDate} at ${apt.time}): "${note.trim()}"`,
      recipient: 'All Staff',
      is_read:   false,
    });

    // Emit socket event
    if (global.io) {
      global.io.emit('user-note-sent', {
        appointmentId: req.params.id,
        userId: req.user.id,
        patientName: userName,
        service: apt.service,
        date: apt.date,
        time: apt.time,
        note: note.trim(),
      });
    }

    res.json({ ok: true, message: 'Note sent to admin.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/appointments/notifications
router.get('/notifications', userAuth, async (req, res) => {
  try {
    const { data: rows, error } = await db
      .from('appointments')
      .select('id,service,date,time,status,updated_at')
      .eq('user_id', req.user.id)
      .is('deleted_at', null)
      .neq('status', 'pending')
      .order('updated_at', { ascending: false })
      .limit(20);
    if (error) throw error;

    const statusLabel = { confirmed: 'Confirmed', rejected: 'Rejected', completed: 'Completed', cancelled: 'Cancelled' };
    const statusColor = { confirmed: '#16a34a', rejected: '#dc2626', completed: '#1d4ed8',  cancelled: '#6b7280' };

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