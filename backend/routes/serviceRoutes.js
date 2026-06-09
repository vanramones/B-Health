const router = require('express').Router();
const { auth } = require('../middleware/auth');
const crud = require('../controllers/crudHelper')('services', {
  columns:    ['name', 'category', 'icon', 'accent', 'description', 'beneficiaries', 'schedule', 'location', 'staff', 'slots_per_hour', 'is_active'],
  required:   ['name', 'category'],
  searchCols: ['name', 'category', 'description'],
});

router.get('/',                    crud.getAll);        // public — needed for user appointment booking
router.get('/count',               auth, crud.count);
router.get('/trash',               auth, crud.trash);
router.patch('/trash/:id/restore', auth, crud.restore);
router.delete('/trash/:id/purge',  auth, crud.purge);
router.get('/:id',                 auth, crud.getById);
router.post('/',                   auth, crud.create);
router.put('/:id',                 auth, crud.update);
router.delete('/:id',              auth, crud.remove);

module.exports = router;
