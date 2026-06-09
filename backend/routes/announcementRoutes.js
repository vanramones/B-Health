const router = require('express').Router();
const { auth } = require('../middleware/auth');
const db = require('../config/db');
const crud = require('../controllers/crudHelper')('announcements', {
  columns:    ['title', 'category', 'body', 'author', 'audience', 'publish_date', 'event_date', 'status', 'pinned'],
  required:   ['title', 'category', 'body'],
  searchCols: ['title', 'body', 'author'],
});

router.get('/',                    auth, crud.getAll);
router.get('/count',               auth, crud.count);
router.get('/trash',               auth, crud.trash);
router.patch('/trash/:id/restore', auth, crud.restore);
router.delete('/trash/:id/purge',  auth, crud.purge);
router.get('/:id',                 auth, crud.getById);

// POST — create announcement with Socket.io emission
router.post('/', auth, async (req, res) => {
  try {
    const result = await crud.create(req, res);
    const { title, category, body, author, audience, publish_date, event_date, status, pinned } = req.body;
    
    if (global.io) {
      global.io.emit('announcement-created', {
        id: result?.id || req.body.id,
        title,
        category,
        body,
        author,
        audience,
        publish_date,
        event_date,
        status,
        pinned,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT — update announcement with Socket.io emission
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, body, author, audience, publish_date, event_date, status, pinned } = req.body;
    
    const columns = ['title', 'category', 'body', 'author', 'audience', 'publish_date', 'event_date', 'status', 'pinned'];
    const data = {};
    columns.forEach((col) => { if (req.body[col] !== undefined) data[col] = req.body[col]; });
    
    const sets = Object.keys(data).map((k) => `${k} = ?`).join(', ');
    await db.query(`UPDATE announcements SET ${sets} WHERE id = ?`, [...Object.values(data), id]);
    
    if (global.io) {
      global.io.emit('announcement-updated', {
        id,
        title,
        category,
        body,
        author,
        audience,
        publish_date,
        event_date,
        status,
        pinned,
      });
    }
    
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE — remove announcement with Socket.io emission
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM announcements WHERE id = ?', [id]);
    
    if (global.io) {
      global.io.emit('announcement-deleted', { id });
    }
    
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
