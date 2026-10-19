/**
 * Generic CRUD factory — Supabase version
 */
const db = require('../config/db');

module.exports = (table, { columns, required = [], searchCols = [] }) => ({

  // GET /
  getAll: async (req, res) => {
    try {
      const { search, status, limit = 100, offset = 0 } = req.query;

      let query = db
        .from(table)
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (status) query = query.eq('status', status);

      if (search && searchCols.length) {
        const orFilter = searchCols.map((c) => `${c}.ilike.%${search}%`).join(',');
        query = query.or(orFilter);
      }

      const { data: rows, error } = await query;
      if (error) throw error;
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // GET /count
  count: async (req, res) => {
    try {
      const { count, error } = await db
        .from(table)
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);
      if (error) throw error;
      res.json({ total: count });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // GET /trash — soft-deleted records
  trash: async (req, res) => {
    try {
      const { data: rows, error } = await db
        .from(table)
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // PATCH /trash/:id/restore
  restore: async (req, res) => {
    try {
      const { data: exists, error: fetchError } = await db
        .from(table)
        .select('id')
        .eq('id', req.params.id)
        .not('deleted_at', 'is', null)
        .limit(1);
      if (fetchError) throw fetchError;
      if (!exists || exists.length === 0) return res.status(404).json({ error: 'Not found in trash.' });

      const { error } = await db
        .from(table)
        .update({ deleted_at: null })
        .eq('id', req.params.id);
      if (error) throw error;
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // DELETE /trash/:id/purge — permanent delete
  purge: async (req, res) => {
    try {
      const { data: exists, error: fetchError } = await db
        .from(table)
        .select('id')
        .eq('id', req.params.id)
        .not('deleted_at', 'is', null)
        .limit(1);
      if (fetchError) throw fetchError;
      if (!exists || exists.length === 0) return res.status(404).json({ error: 'Not found in trash.' });

      const { error } = await db.from(table).delete().eq('id', req.params.id);
      if (error) throw error;
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // GET /:id
  getById: async (req, res) => {
    try {
      const { data: rows, error } = await db
        .from(table)
        .select('*')
        .eq('id', req.params.id)
        .is('deleted_at', null)
        .limit(1);
      if (error) throw error;
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found.' });
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

      const { data: result, error } = await db
        .from(table)
        .insert(data)
        .select('id')
        .single();
      if (error) throw error;
      res.status(201).json({ ok: true, id: result.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // PUT /:id
  update: async (req, res) => {
    try {
      const { data: exists, error: fetchError } = await db
        .from(table)
        .select('id')
        .eq('id', req.params.id)
        .is('deleted_at', null)
        .limit(1);
      if (fetchError) throw fetchError;
      if (!exists || exists.length === 0) return res.status(404).json({ error: 'Not found.' });

      const data = {};
      columns.forEach((col) => { if (req.body[col] !== undefined) data[col] = req.body[col]; });
      if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No fields to update.' });

      const { error } = await db.from(table).update(data).eq('id', req.params.id);
      if (error) throw error;
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // DELETE /:id — soft delete (move to trash)
  remove: async (req, res) => {
    try {
      const { data: exists, error: fetchError } = await db
        .from(table)
        .select('id')
        .eq('id', req.params.id)
        .is('deleted_at', null)
        .limit(1);
      if (fetchError) throw fetchError;
      if (!exists || exists.length === 0) return res.status(404).json({ error: 'Not found.' });

      const { error } = await db
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', req.params.id);
      if (error) throw error;
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
});