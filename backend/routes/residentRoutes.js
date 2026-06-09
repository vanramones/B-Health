const router = require('express').Router();
const { auth } = require('../middleware/auth');
const crud = require('../controllers/crudHelper')('residents', {
  columns:    ['name', 'age', 'gender', 'address', 'contact', 'condition', 'status'],
  required:   ['name', 'age', 'gender'],
  searchCols: ['name', 'address', 'condition'],
});

router.get('/',                   auth, crud.getAll);
router.get('/count',              auth, crud.count);
router.get('/trash',              auth, crud.trash);
router.patch('/trash/:id/restore', auth, crud.restore);
router.delete('/trash/:id/purge', auth, crud.purge);
router.get('/:id',                auth, crud.getById);
router.post('/',                  auth, crud.create);
router.put('/:id',                auth, crud.update);
router.delete('/:id',             auth, crud.remove);

module.exports = router;
