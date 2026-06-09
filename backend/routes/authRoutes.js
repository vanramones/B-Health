const router = require('express').Router();
const ctrl   = require('../controllers/authController');
const { auth, userAuth } = require('../middleware/auth');

// Admin auth
router.post('/login',     ctrl.login);
router.get('/me',          auth, ctrl.me);

// Admin CRUD (protected)
router.get('/admins',      auth, ctrl.getAdmins);
router.post('/admins',     auth, ctrl.createAdmin);
router.put('/admins/:id',  auth, ctrl.updateAdmin);
router.delete('/admins/:id', auth, ctrl.deleteAdmin);
router.patch('/admins/:id/toggle', auth, ctrl.toggleAdmin);

// Admin: list and manage registered users
router.get('/users',              auth, ctrl.listUsers);
router.post('/users',             auth, ctrl.createUser);
router.put('/users/:id',          auth, ctrl.updateUser);
router.patch('/users/:id/toggle', auth, ctrl.toggleUser);

// User auth (public)
router.post('/user/register', ctrl.userRegister);
router.post('/user/login',    ctrl.userLogin);
router.get('/user/me',        userAuth, ctrl.userMe);

module.exports = router;
