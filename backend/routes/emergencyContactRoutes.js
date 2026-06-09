const router = require('express').Router();
const { auth } = require('../middleware/auth');
const crud = require('../controllers/crudHelper')('emergency_contacts', {
  columns:    ['name', 'category', 'phone', 'alt_phone', 'email', 'address', 'available', 'is_active', 'is_favorite', 'notes'],
  required:   ['name', 'category', 'phone'],
  searchCols: ['name', 'category', 'phone'],
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
