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

// GET /appointments/search
router.get('/search', auth, async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query.trim()) return res.json([]);

    const { data: rows, error } = await db
      .from('appointments')
      .select('id, name, service, date, time, status')
      .is('deleted_at', null)
      .or(`name.ilike.%${query}%,service.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;

    // match dati na column alias
    const mapped = rows.map(r => ({
      id: r.id,
      patient_name: r.name,
      service: r.service,
      appointment_date: r.date,
      time: r.time,
      status: r.status,
    }));

    res.json(mapped);
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

    const { data: rows, error: fetchError } = await db
      .from('appointments')
      .select('user_id, name, service, date, notes')
      .eq('id', req.params.id)
      .limit(1);
    if (fetchError) throw fetchError;

    const { error } = await db
      .from('appointments')
      .update({ status, handled_by: adminName })
      .eq('id', req.params.id);
    if (error) throw error;

    // Auto-create health record when appointment is marked as completed
    if (status === 'completed' && rows && rows.length > 0) {
      const apt = rows[0];
      
      // Create health record from appointment data
      const healthRecordData = {
        patient: apt.name,
        type: apt.service.includes('Vaccination') ? 'Vaccination' : 
              apt.service.includes('Prenatal') ? 'Prenatal' : 
              apt.service.includes('Dental') ? 'Consultation' : 'Consultation',
        diagnosis: `Completed appointment: ${apt.service}`,
        doctor: adminName,
        date: apt.date,
        notes: apt.notes || `Auto-generated from completed appointment on ${new Date().toLocaleDateString()}`,
        status: 'closed'
      };

      const { data: healthRecord, error: healthRecordError } = await db
        .from('health_records')
        .insert(healthRecordData)
        .select('id')
        .single();

      if (healthRecordError) {
        console.error('Failed to create health record:', healthRecordError);
      } else {
        // Create notification for the user about the new health record
        const { data: users } = await db
          .from('users')
          .select('id')
          .eq('full_name', apt.name)
          .limit(1);
        
        if (users && users.length > 0) {
          const title = `Health Record Created: ${healthRecordData.type}`;
          const message = `Your completed appointment has been recorded. A new ${healthRecordData.type.toLowerCase()} health record has been added to your profile.`;
          
          await db.from('notifications').insert({
            type: 'health_record',
            title,
            message,
            recipient: apt.name,
            priority: 'normal',
          });
        }

        // Emit real-time update for health record creation
        if (global.io) {
          global.io.emit('dashboard-update', {
            type: 'health-record',
            action: 'created',
            data: {
              id: healthRecord.id,
              patient: apt.name,
              type: healthRecordData.type,
              diagnosis: healthRecordData.diagnosis,
              doctor: adminName,
              date: apt.date,
            },
          });
        }
      }
    }

    if (global.io && rows && rows.length > 0) {
      const apt = rows[0];
      const statusMessages = {
        confirmed: 'Appointment Confirmed',
        approved:  'Appointment Approved',
        rejected:  'Appointment Rejected',
        completed: 'Appointment Completed',
      };

      global.io.emit(`appointment-${status}`, {
        appointmentId: req.params.id,
        userId:        apt.user_id,
        patientName:   apt.name,
        service:       apt.service,
        message:       statusMessages[status] || `Appointment ${status}`,
        status,
      });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id',    auth, crud.update);
router.delete('/:id', auth, crud.remove);

module.exports = router;