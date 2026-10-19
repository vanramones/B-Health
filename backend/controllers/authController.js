const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

const sign = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const initialsOf = (name) =>
  name.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'AD';

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

    const { data: rows, error } = await db
      .from('admins')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .limit(1);
    if (error) throw error;
    if (!rows || rows.length === 0) return res.status(401).json({ error: 'Invalid username or password.' });

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password.' });
    if (!admin.is_active) return res.status(403).json({ error: 'Account is inactive. Contact administrator.' });

    const token = sign({ id: admin.id, username: admin.username, role: admin.role, owner: !!admin.is_owner });
    res.json({
      ok: true,
      token,
      user: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        initials: initialsOf(admin.name),
        owner: !!admin.is_owner,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  try {
    const { data: rows, error } = await db
      .from('admins')
      .select('id,username,name,email,role,is_owner')
      .eq('id', req.user.id)
      .limit(1);
    if (error) throw error;
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Admin not found.' });
    const a = rows[0];
    res.json({ id: a.id, username: a.username, name: a.name, email: a.email, role: a.role, initials: initialsOf(a.name), owner: !!a.is_owner });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/admins
exports.getAdmins = async (req, res) => {
  try {
    const { data: rows, error } = await db
      .from('admins')
      .select('id,username,name,email,role,is_active,is_owner,created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/admins
exports.createAdmin = async (req, res) => {
  try {
    const { username, password, name, email, role, active } = req.body;
    if (!username || !password || !name) return res.status(400).json({ error: 'Username, password, and name are required.' });

    const { data: existing } = await db
      .from('admins')
      .select('id')
      .eq('username', username.trim().toLowerCase())
      .limit(1);
    if (existing && existing.length > 0) return res.status(409).json({ error: 'Username already exists.' });

    const hashed = await bcrypt.hash(password, 10);
    const { data, error } = await db
      .from('admins')
      .insert({
        username: username.trim().toLowerCase(),
        password: hashed,
        name: name.trim(),
        email: (email || '').trim(),
        role: role || 'Staff',
        is_active: active !== false,
      })
      .select('id')
      .single();
    if (error) throw error;
    res.status(201).json({ ok: true, id: data.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/auth/admins/:id
exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, name, email, role, active } = req.body;

    const { data: rows, error: fetchError } = await db
      .from('admins')
      .select('*')
      .eq('id', id)
      .limit(1);
    if (fetchError) throw fetchError;
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Admin not found.' });
    const admin = rows[0];

    const newUsername = (username ?? admin.username).trim().toLowerCase();
    if (newUsername !== admin.username.toLowerCase()) {
      const { data: dup } = await db
        .from('admins')
        .select('id')
        .eq('username', newUsername)
        .neq('id', id)
        .limit(1);
      if (dup && dup.length > 0) return res.status(409).json({ error: 'Username already taken.' });
    }

    const fields = {
      username: newUsername,
      name: (name ?? admin.name).trim(),
      email: (email ?? admin.email).trim(),
      role: admin.is_owner ? admin.role : (role ?? admin.role),
      is_active: admin.is_owner ? true : (active !== undefined ? !!active : admin.is_active),
    };

    if (password) fields.password = await bcrypt.hash(password, 10);

    const { error } = await db.from('admins').update(fields).eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/auth/admins/:id
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: rows } = await db.from('admins').select('*').eq('id', id).limit(1);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Admin not found.' });
    if (rows[0].is_owner) return res.status(403).json({ error: 'Owner account cannot be deleted.' });
    if (parseInt(id) === req.user.id) return res.status(403).json({ error: 'Cannot delete your own account.' });

    const { error } = await db.from('admins').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/auth/admins/:id/toggle
exports.toggleAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: rows } = await db.from('admins').select('*').eq('id', id).limit(1);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Admin not found.' });
    if (rows[0].is_owner) return res.status(403).json({ error: 'Owner account is always active.' });
    if (parseInt(id) === req.user.id) return res.status(403).json({ error: 'Cannot deactivate your own account.' });

    const { error } = await db
      .from('admins')
      .update({ is_active: !rows[0].is_active })
      .eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
//  USER AUTH  (residents/patients)
// ─────────────────────────────────────────────

const signUser = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/user/register
exports.userRegister = async (req, res) => {
  try {
    const { username, password, full_name, phone, purok } = req.body;
    if (!username || !password || !full_name)
      return res.status(400).json({ error: 'Username, password, and full name are required.' });

    const { data: existing } = await db
      .from('users')
      .select('id')
      .eq('username', username.trim().toLowerCase())
      .limit(1);
    if (existing && existing.length > 0) return res.status(409).json({ error: 'Username already taken.' });

    const hashed = await bcrypt.hash(password, 10);
    const { data, error } = await db
      .from('users')
      .insert({
        username: username.trim().toLowerCase(),
        password: hashed,
        full_name: full_name.trim(),
        phone: (phone || '').trim(),
        purok: (purok || '').trim(),
      })
      .select('id,username,full_name,phone,purok')
      .single();
    if (error) throw error;

    const token = signUser({ id: data.id, username: data.username, type: 'user' });

    if (global.io) {
      global.io.emit('user-created', data);
    }

    res.status(201).json({ ok: true, token, user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/user/login
exports.userLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

    const { data: rows, error } = await db
      .from('users')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .limit(1);
    if (error) throw error;
    if (!rows || rows.length === 0) return res.status(401).json({ error: 'Invalid username or password.' });

    const u = rows[0];
    const valid = await bcrypt.compare(password, u.password);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password.' });
    if (!u.is_active) return res.status(403).json({ error: 'Account is inactive. Contact the health center.' });

    const token = signUser({ id: u.id, username: u.username, type: 'user' });
    res.json({
      ok: true,
      token,
      user: { id: u.id, username: u.username, full_name: u.full_name, phone: u.phone, purok: u.purok },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/user/me
exports.userMe = async (req, res) => {
  try {
    const { data: rows, error } = await db
      .from('users')
      .select('id,username,full_name,phone,purok,created_at')
      .eq('id', req.user.id)
      .limit(1);
    if (error) throw error;
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/users  (admin: create a user)
exports.createUser = async (req, res) => {
  try {
    const { username, password, full_name, phone, purok } = req.body;
    if (!username || !password || !full_name)
      return res.status(400).json({ error: 'Username, password, and full name are required.' });

    const { data: existing } = await db
      .from('users')
      .select('id')
      .eq('username', username.trim().toLowerCase())
      .limit(1);
    if (existing && existing.length > 0) return res.status(409).json({ error: 'Username already taken.' });

    const hashed = await bcrypt.hash(password, 10);
    const { data, error } = await db
      .from('users')
      .insert({
        username: username.trim().toLowerCase(),
        password: hashed,
        full_name: full_name.trim(),
        phone: (phone || '').trim(),
        purok: (purok || '').trim(),
      })
      .select('id')
      .single();
    if (error) throw error;
    res.status(201).json({ ok: true, id: data.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/auth/users/:id  (admin: edit user)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, full_name, phone, purok } = req.body;

    const { data: rows } = await db.from('users').select('*').eq('id', id).limit(1);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const u = rows[0];

    const newUsername = (username ?? u.username).trim().toLowerCase();
    if (newUsername !== u.username.toLowerCase()) {
      const { data: dup } = await db
        .from('users')
        .select('id')
        .eq('username', newUsername)
        .neq('id', id)
        .limit(1);
      if (dup && dup.length > 0) return res.status(409).json({ error: 'Username already taken.' });
    }

    const fields = {
      username:  newUsername,
      full_name: (full_name ?? u.full_name).trim(),
      phone:     (phone     ?? u.phone     ?? '').trim(),
      purok:     (purok     ?? u.purok     ?? '').trim(),
    };
    if (password) fields.password = await bcrypt.hash(password, 10);

    const { error } = await db.from('users').update(fields).eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/users  (admin: list all registered users)
exports.listUsers = async (req, res) => {
  try {
    const { data: rows, error } = await db
      .from('users')
      .select('id,username,full_name,phone,purok,is_active,created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/auth/users/:id/toggle  (admin: toggle user active status)
exports.toggleUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: rows } = await db.from('users').select('id,is_active').eq('id', id).limit(1);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const { error } = await db
      .from('users')
      .update({ is_active: !rows[0].is_active })
      .eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};