const router = require('express').Router();
const { auth } = require('../middleware/auth');
const crud = require('../controllers/crudHelper')('notifications', {
  columns:    ['type', 'priority', 'title', 'message', 'recipient', 'is_read'],
  required:   ['type', 'title', 'message'],
  searchCols: ['title', 'message', 'recipient'],
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

// Mark all as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    const db = require('../config/db');
    await db.query('UPDATE notifications SET is_read = 1');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
