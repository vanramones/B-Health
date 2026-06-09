/**
 * Generic CRUD factory — generates standard getAll, getById, create, update, delete handlers for a given table.
 */
const db = require('../config/db');

module.exports = (table, { columns, required = [], searchCols = [] }) => ({

  // GET /
  getAll: async (req, res) => {
    try {
      const { search, status, limit = 100, offset = 0 } = req.query;
      let sql = `SELECT * FROM \`${table}\` WHERE deleted_at IS NULL`;
      const params = [];

      if (status) { sql += ` AND status = ?`; params.push(status); }
      if (search && searchCols.length) {
        const like = searchCols.map((c) => `\`${c}\` LIKE ?`).join(' OR ');
        sql += ` AND (${like})`;
        searchCols.forEach(() => params.push(`%${search}%`));
      }

      sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));

      const [rows] = await db.query(sql, params);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // GET /count
  count: async (req, res) => {
    try {
      const [rows] = await db.query(`SELECT COUNT(*) as total FROM \`${table}\` WHERE deleted_at IS NULL`);
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // GET /trash  — soft-deleted records
  trash: async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT * FROM \`${table}\` WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // PATCH /trash/:id/restore
  restore: async (req, res) => {
    try {
      const [exists] = await db.query(`SELECT id FROM \`${table}\` WHERE id = ? AND deleted_at IS NOT NULL`, [req.params.id]);
      if (exists.length === 0) return res.status(404).json({ error: 'Not found in trash.' });
      await db.query(`UPDATE \`${table}\` SET deleted_at = NULL WHERE id = ?`, [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // DELETE /trash/:id/purge  — permanent delete
  purge: async (req, res) => {
    try {
      const [exists] = await db.query(`SELECT id FROM \`${table}\` WHERE id = ? AND deleted_at IS NOT NULL`, [req.params.id]);
      if (exists.length === 0) return res.status(404).json({ error: 'Not found in trash.' });
      await db.query(`DELETE FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // GET /:id
  getById: async (req, res) => {
    try {
      const [rows] = await db.query(`SELECT * FROM \`${table}\` WHERE id = ? AND deleted_at IS NULL`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found.' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // POST /
  create: async (req, res) => {
    try {
      for (const field of required) {
        if (!req.body[field]) return res.status(400).json({ error: `${field} is required.` });
      }
      const data = {};
      columns.forEach((col) => { if (req.body[col] !== undefined) data[col] = req.body[col]; });

      const keys = Object.keys(data).map((k) => `\`${k}\``).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const [result] = await db.query(
        `INSERT INTO \`${table}\` (${keys}) VALUES (${placeholders})`,
        Object.values(data)
      );
      res.status(201).json({ ok: true, id: result.insertId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // PUT /:id
  update: async (req, res) => {
    try {
      const [exists] = await db.query(`SELECT id FROM \`${table}\` WHERE id = ? AND deleted_at IS NULL`, [req.params.id]);
      if (exists.length === 0) return res.status(404).json({ error: 'Not found.' });

      const data = {};
      columns.forEach((col) => { if (req.body[col] !== undefined) data[col] = req.body[col]; });
      if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No fields to update.' });

      const sets = Object.keys(data).map((k) => `\`${k}\` = ?`).join(', ');
      await db.query(`UPDATE \`${table}\` SET ${sets} WHERE id = ?`, [...Object.values(data), req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // DELETE /:id  — soft delete (move to trash)
  remove: async (req, res) => {
    try {
      const [exists] = await db.query(`SELECT id FROM \`${table}\` WHERE id = ? AND deleted_at IS NULL`, [req.params.id]);
      if (exists.length === 0) return res.status(404).json({ error: 'Not found.' });
      await db.query(`UPDATE \`${table}\` SET deleted_at = NOW() WHERE id = ?`, [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
});
