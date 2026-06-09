const router = require('express').Router();
const { auth } = require('../middleware/auth');
const db   = require('../config/db');
const crud = require('../controllers/crudHelper')('vaccinations', {
  columns:    ['resident_id', 'user_id', 'patient', 'age', 'vaccine', 'dose', 'date', 'next_due', 'administered_by', 'site', 'status', 'notes'],
  required:   ['patient', 'vaccine', 'dose', 'date'],
  searchCols: ['patient', 'vaccine', 'administered_by'],
});

// GET /api/vaccinations/due-soon — overdue / due within 7 days (for admin reminders)
router.get('/due-soon', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, patient, age, vaccine, dose, next_due, status
       FROM vaccinations
       WHERE deleted_at IS NULL
         AND (
           status = 'missed'
           OR (status = 'scheduled' AND next_due IS NOT NULL AND next_due <= DATE_ADD(CURDATE(), INTERVAL 7 DAY))
         )
       ORDER BY next_due ASC
       LIMIT 30`
    );
    const today = new Date();
    const result = rows.map((v) => {
      const due      = v.next_due ? new Date(v.next_due) : null;
      const overdue  = due && due < today;
      const daysAway = due ? Math.ceil((due - today) / 86400000) : null;
      return { ...v, overdue, daysAway };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vaccinations/users-list — registered users for admin dropdown
router.get('/users-list', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, username, phone, purok FROM users WHERE is_active = 1 ORDER BY full_name ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/vaccinations/:id/status — quick status update
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['scheduled', 'completed', 'missed'].includes(status))
      return res.status(400).json({ error: 'Invalid status.' });
    await db.query('UPDATE vaccinations SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/',                    auth, crud.getAll);
router.get('/count',               auth, crud.count);
router.get('/trash',               auth, crud.trash);
router.patch('/trash/:id/restore', auth, crud.restore);
router.delete('/trash/:id/purge',  auth, crud.purge);
router.get('/:id',                 auth, crud.getById);
router.post('/',                   auth, crud.create);
router.put('/:id',                 auth, crud.update);
router.delete('/:id',              auth, crud.remove);

module.exports = router;
