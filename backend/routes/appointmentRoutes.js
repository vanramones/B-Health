const router = require('express').Router();
const { auth } = require('../middleware/auth');
const db   = require('../config/db');
const crud = require('../controllers/crudHelper')('appointments', {
  columns:    ['resident_id', 'name', 'service', 'date', 'time', 'notes', 'status', 'handled_by'],
  required:   ['name', 'service', 'date', 'time'],
  searchCols: ['name', 'service'],
});

router.get('/',                    auth, crud.getAll);
router.get('/count',               auth, crud.count);
router.get('/trash',               auth, crud.trash);

// GET /appointments/search — search appointments by patient name or service (must be before /:id)
router.get('/search', auth, async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query.trim()) {
      return res.json([]);
    }

    const searchTerm = `%${query}%`;
    const [rows] = await db.query(
      `SELECT id, name as patient_name, service, date as appointment_date, time, status
       FROM appointments
       WHERE (name LIKE ? OR service LIKE ?)
         AND deleted_at IS NULL
       LIMIT 10`,
      [searchTerm, searchTerm]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/trash/:id/restore', auth, crud.restore);
router.delete('/trash/:id/purge',  auth, crud.purge);
router.get('/:id',                 auth, crud.getById);
router.post('/',                   auth, crud.create);

// PATCH /:id/status — update status and record which admin handled it
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required.' });
    const adminName = req.user?.username || req.user?.name || 'Admin';
    
    const [appointment] = await db.query('SELECT user_id, name, service FROM appointments WHERE id = ?', [req.params.id]);
    
    await db.query(
      'UPDATE appointments SET status = ?, handled_by = ? WHERE id = ?',
      [status, adminName, req.params.id]
    );

    if (global.io && appointment.length > 0) {
      const apt = appointment[0];
      const statusMessages = {
        confirmed: 'Appointment Confirmed',
        approved: 'Appointment Approved',
        rejected: 'Appointment Rejected',
        completed: 'Appointment Completed',
      };
      
      global.io.emit(`appointment-${status}`, {
        appointmentId: req.params.id,
        userId: apt.user_id,
        patientName: apt.name,
        service: apt.service,
        message: statusMessages[status] || `Appointment ${status}`,
        status,
      });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id',                 auth, crud.update);
router.delete('/:id',              auth, crud.remove);

module.exports = router;
