const router = require('express').Router();
const { auth } = require('../middleware/auth');
const db = require('../config/db');
const crud = require('../controllers/crudHelper')('health_records', {
  columns:    ['resident_id', 'patient', 'type', 'diagnosis', 'doctor', 'date', 'notes', 'prescription', 'status'],
  required:   ['patient', 'type', 'diagnosis', 'doctor', 'date'],
  searchCols: ['patient', 'diagnosis', 'doctor', 'notes'],
});

router.get('/',                    auth, crud.getAll);
router.get('/count',               auth, crud.count);
router.get('/trash',               auth, crud.trash);

// GET /health-records/search — search health records by patient or diagnosis (must be before /:id)
router.get('/search', auth, async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query.trim()) {
      return res.json([]);
    }

    const like = `%${query}%`;
    const { data: rows, error } = await db
      .from('health_records')
      .select('id, patient_name:patient, record_type:type, diagnosis, date, doctor')
      .is('deleted_at', null)
      .or(`patient.ilike.${like},diagnosis.ilike.${like},doctor.ilike.${like}`)
      .limit(10);
    if (error) throw error;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/trash/:id/restore', auth, crud.restore);
router.delete('/trash/:id/purge',  auth, crud.purge);
router.get('/:id',                 auth, crud.getById);

// Custom POST to create health record and notification
router.post('/', auth, async (req, res) => {
  try {
    // Validate required fields
    const required = ['patient', 'type', 'diagnosis', 'doctor', 'date'];
    for (const field of required) {
      if (!req.body[field]) return res.status(400).json({ error: `${field} is required.` });
    }

    // Create health record
    const columns = ['resident_id', 'patient', 'type', 'diagnosis', 'doctor', 'date', 'notes', 'prescription', 'status'];
    const data = {};
    columns.forEach((col) => { if (req.body[col] !== undefined) data[col] = req.body[col]; });

    const { data: result, error: insertError } = await db
      .from('health_records')
      .insert(data)
      .select('id')
      .single();
    if (insertError) throw insertError;

    // Create notification for the user
    const patient = req.body.patient;
    const { data: users } = await db
      .from('users')
      .select('id')
      .eq('full_name', patient)
      .limit(1);
    
    if (users && users.length > 0) {
      const title = `New Health Record: ${req.body.type}`;
      const message = `A new ${req.body.type.toLowerCase()} record has been added for you. Diagnosis: ${req.body.diagnosis}`;
      
      await db.from('notifications').insert({
        type: 'health_record',
        title,
        message,
        recipient: patient,
        priority: 'normal',
      });
    }

    if (global.io) {
      global.io.emit('dashboard-update', {
        type: 'health-record',
        action: 'created',
        data: {
          id: result.id,
          patient: req.body.patient,
          type: req.body.type,
          diagnosis: req.body.diagnosis,
          doctor: req.body.doctor,
          date: req.body.date,
        },
      });
    }

    res.status(201).json({ ok: true, id: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id',                 auth, crud.update);
router.delete('/:id',              auth, crud.remove);

module.exports = router;
