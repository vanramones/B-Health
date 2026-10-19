// ============================================================================
// Client-side API adapter — talks DIRECTLY to Supabase (no backend needed).
// Mirrors the old Express endpoints so existing pages need no changes.
// ============================================================================
import { supabase } from '../config/supabase';
import { capacityMap, slotCapacity, availability } from '../utils/timeSlots';

const fail = (message, status = 500) => {
  const e = new Error(message);
  e.status = status;
  return e;
};

// ── Identity (sessions are stored by the auth contexts) ──
const getAdmin = () => {
  try { return JSON.parse(localStorage.getItem('bh_admin_auth')); } catch { return null; }
};
const getUser = () => {
  try { return JSON.parse(localStorage.getItem('bh_user_session')); } catch { return null; }
};

// ── endpoint path -> table name & column whitelist (from the old backend) ──
const TABLES = {
  residents:            { table: 'residents',          cols: ['name','age','gender','address','contact','condition','status'], search: ['name','address','condition'] },
  appointments:         { table: 'appointments',       cols: ['resident_id','user_id','name','service','date','time','notes','status','handled_by'], search: ['name','service'] },
  'health-records':     { table: 'health_records',     cols: ['resident_id','patient','type','diagnosis','doctor','date','notes','prescription','status'], search: ['patient','diagnosis','doctor','notes'] },
  vaccinations:         { table: 'vaccinations',       cols: ['resident_id','user_id','patient','age','vaccine','dose','date','next_due','administered_by','site','status','notes','reminder_time'], search: ['patient','vaccine','administered_by'] },
  services:             { table: 'services',           cols: ['name','category','icon','accent','description','beneficiaries','schedule','location','staff','slots_per_hour','slot_schedule','is_active'], search: ['name','category','description'] },
  announcements:        { table: 'announcements',      cols: ['title','category','body','author','audience','publish_date','event_date','status','pinned','image_url'], search: ['title','body','author'] },
  'emergency-contacts': { table: 'emergency_contacts', cols: ['name','category','phone','alt_phone','email','address','available','is_active','is_favorite','notes'], search: ['name','category','phone'] },
  notifications:        { table: 'notifications',      cols: ['type','priority','title','message','recipient','is_read'], search: ['title','message','recipient'] },
};

const pick = (cols, body) => {
  const data = {};
  cols.forEach((c) => { if (body[c] !== undefined) data[c] = body[c]; });
  return data;
};

const throwIf = (error) => { if (error) throw fail(error.message); };

// ── Generic CRUD (mirrors crudHelper.js) ──
async function listAll(cfg, params) {
  let q = supabase.from(cfg.table).select('*').is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (params.status) q = q.eq('status', params.status);
  if (params.search && cfg.search.length) {
    q = q.or(cfg.search.map((c) => `${c}.ilike.%${params.search}%`).join(','));
  }
  const { data, error } = await q;
  throwIf(error);
  return data || [];
}
async function count(cfg) {
  const { count: c, error } = await supabase.from(cfg.table)
    .select('*', { count: 'exact', head: true }).is('deleted_at', null);
  throwIf(error);
  return { total: c || 0 };
}
async function trash(cfg) {
  const { data, error } = await supabase.from(cfg.table).select('*')
    .not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
  throwIf(error);
  return data || [];
}
async function restore(cfg, id) {
  const { error } = await supabase.from(cfg.table).update({ deleted_at: null }).eq('id', id);
  throwIf(error);
  return { ok: true };
}
async function purge(cfg, id) {
  const { error } = await supabase.from(cfg.table).delete().eq('id', id);
  throwIf(error);
  return { ok: true };
}
async function getById(cfg, id) {
  const { data, error } = await supabase.from(cfg.table).select('*').eq('id', id).is('deleted_at', null).limit(1);
  throwIf(error);
  if (!data || !data.length) throw fail('Not found.', 404);
  return data[0];
}
async function create(cfg, body) {
  const { data, error } = await supabase.from(cfg.table).insert(pick(cfg.cols, body)).select('id').single();
  throwIf(error);
  return { ok: true, id: data.id };
}
async function update(cfg, id, body) {
  const { error } = await supabase.from(cfg.table).update(pick(cfg.cols, body)).eq('id', id);
  throwIf(error);
  return { ok: true };
}
async function softDelete(cfg, id) {
  const { error } = await supabase.from(cfg.table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
  throwIf(error);
  return { ok: true };
}

async function findService(name) {
  if (!name) return null;
  const { data } = await supabase.from('services').select('*').eq('name', name).is('deleted_at', null).limit(1);
  return (data && data[0]) || null;
}

// ── RPC auth helper ──
async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  throwIf(error);
  return data;
}

// ============================================================================
// Router
// ============================================================================
async function route(method, rawPath, body = {}) {
  const [pathOnly, qs] = rawPath.replace(/^\//, '').split('?');
  const seg = pathOnly.split('/').filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(qs || ''));

  // ---------- AUTH ----------
  if (seg[0] === 'auth') {
    // admin
    if (seg[1] === 'login' && method === 'POST') {
      const res = await rpc('admin_login', { p_username: body.username, p_password: body.password });
      if (!res) throw fail('Invalid username or password.', 401);
      if (res.inactive) throw fail('Account is inactive. Contact administrator.', 403);
      return { ok: true, token: `sb.admin.${res.id}`, user: { ...res, owner: !!res.is_owner } };
    }
    if (seg[1] === 'me' && method === 'GET') {
      const a = getAdmin(); if (!a) throw fail('Admin not found.', 404);
      const { data } = await supabase.from('admins').select('id,username,name,email,role,is_owner').eq('id', a.id).limit(1);
      const r = data && data[0]; if (!r) throw fail('Admin not found.', 404);
      return { ...r, owner: !!r.is_owner };
    }
    if (seg[1] === 'admins') {
      if (!seg[2] && method === 'GET') {
        const { data, error } = await supabase.from('admins')
          .select('id,username,name,email,role,is_active,is_owner,created_at').order('created_at', { ascending: false });
        throwIf(error); return data || [];
      }
      if (!seg[2] && method === 'POST') {
        const r = await rpc('admin_create', { p_username: body.username, p_password: body.password, p_name: body.name, p_email: body.email || '', p_role: body.role || 'Staff', p_active: body.active !== false });
        if (r && r.error) throw fail(r.error, 409);
        return r;
      }
      if (seg[2] && seg[3] === 'toggle' && method === 'PATCH') {
        const me = getAdmin();
        const { data } = await supabase.from('admins').select('is_active,is_owner').eq('id', seg[2]).limit(1);
        const row = data && data[0]; if (!row) throw fail('Admin not found.', 404);
        if (row.is_owner) throw fail('Owner account is always active.', 403);
        if (me && String(me.id) === String(seg[2])) throw fail('Cannot deactivate your own account.', 403);
        const { error } = await supabase.from('admins').update({ is_active: !row.is_active }).eq('id', seg[2]);
        throwIf(error); return { ok: true };
      }
      if (seg[2] && method === 'PUT') {
        const r = await rpc('admin_update', { p_id: Number(seg[2]), p_username: body.username ?? null, p_password: body.password ?? null, p_name: body.name ?? null, p_email: body.email ?? null, p_role: body.role ?? null, p_active: body.active ?? null });
        if (r && r.error) throw fail(r.error, 409);
        return r;
      }
      if (seg[2] && method === 'DELETE') {
        const me = getAdmin();
        const { data } = await supabase.from('admins').select('is_owner').eq('id', seg[2]).limit(1);
        const row = data && data[0]; if (!row) throw fail('Admin not found.', 404);
        if (row.is_owner) throw fail('Owner account cannot be deleted.', 403);
        if (me && String(me.id) === String(seg[2])) throw fail('Cannot delete your own account.', 403);
        const { error } = await supabase.from('admins').delete().eq('id', seg[2]);
        throwIf(error); return { ok: true };
      }
    }
    if (seg[1] === 'users') {
      if (!seg[2] && method === 'GET') {
        const { data, error } = await supabase.from('users')
          .select('id,username,full_name,phone,purok,is_active,created_at').order('created_at', { ascending: false });
        throwIf(error); return data || [];
      }
      if (!seg[2] && method === 'POST') {
        const r = await rpc('user_register', { p_username: body.username, p_password: body.password, p_full_name: body.full_name, p_phone: body.phone || '', p_purok: body.purok || '' });
        if (r && r.error) throw fail(r.error, 409);
        return { ok: true, id: r.id };
      }
      if (seg[2] && seg[3] === 'toggle' && method === 'PATCH') {
        const { data } = await supabase.from('users').select('is_active').eq('id', seg[2]).limit(1);
        const row = data && data[0]; if (!row) throw fail('User not found.', 404);
        const { error } = await supabase.from('users').update({ is_active: !row.is_active }).eq('id', seg[2]);
        throwIf(error); return { ok: true };
      }
      if (seg[2] && method === 'PUT') {
        const r = await rpc('user_update', { p_id: Number(seg[2]), p_username: body.username ?? null, p_password: body.password ?? null, p_full_name: body.full_name ?? null, p_phone: body.phone ?? null, p_purok: body.purok ?? null });
        if (r && r.error) throw fail(r.error, 409);
        return r;
      }
    }
    // user auth
    if (seg[1] === 'user' && seg[2] === 'register' && method === 'POST') {
      const r = await rpc('user_register', { p_username: body.username, p_password: body.password, p_full_name: body.full_name, p_phone: body.phone || '', p_purok: body.purok || '' });
      if (r && r.error) throw fail(r.error, 409);
      return { ok: true, token: `sb.user.${r.id}`, user: r };
    }
    if (seg[1] === 'user' && seg[2] === 'login' && method === 'POST') {
      const r = await rpc('user_login', { p_username: body.username, p_password: body.password });
      if (!r) throw fail('Invalid username or password.', 401);
      if (r.inactive) throw fail('Account is inactive. Contact the health center.', 403);
      return { ok: true, token: `sb.user.${r.id}`, user: r };
    }
    if (seg[1] === 'user' && seg[2] === 'me' && method === 'GET') {
      const u = getUser(); if (!u) throw fail('User not found.', 404);
      const { data } = await supabase.from('users')
        .select('id,username,full_name,phone,purok,email,birthdate,gender,blood_type,civil_status,occupation,philhealth_no,emergency_name,emergency_relationship,emergency_phone,profile_photo,created_at')
        .eq('id', u.id).limit(1);
      if (!data || !data.length) throw fail('User not found.', 404);
      return data[0];
    }
    if (seg[1] === 'user' && seg[2] === 'me' && method === 'PATCH') {
      const u = getUser(); if (!u) throw fail('User not found.', 404);
      const ALLOWED = ['full_name','phone','purok','email','birthdate','gender','blood_type','civil_status','occupation','philhealth_no','emergency_name','emergency_relationship','emergency_phone','profile_photo'];
      const upd = {};
      ALLOWED.forEach((k) => { if (body[k] !== undefined) upd[k] = body[k]; });
      if ('birthdate' in upd && !upd.birthdate) upd.birthdate = null;
      if (!Object.keys(upd).length) throw fail('Nothing to update.', 400);
      const { error: updateError } = await supabase.from('users').update(upd).eq('id', u.id);
      throwIf(updateError);
      const { data, error } = await supabase.from('users')
        .select('id,username,full_name,phone,purok,email,birthdate,gender,blood_type,civil_status,occupation,philhealth_no,emergency_name,emergency_relationship,emergency_phone,profile_photo,created_at')
        .eq('id', u.id).limit(1);
      throwIf(error);
      return data && data[0] ? data[0] : {};
    }
    throw fail(`Unhandled auth route: ${method} /${pathOnly}`, 404);
  }

  // ---------- USER (resident) ----------
  if (seg[0] === 'user') {
    const u = getUser();
    const uid = u ? u.id : -1;
    const fullName = u ? (u.full_name || '') : '';

    if (seg[1] === 'availability' && method === 'GET') {
      if (!params.date) throw fail('date is required.', 400);
      const [{ data: svcs, error: e1 }, { data: appts, error: e2 }] = await Promise.all([
        supabase.from('services').select('*').is('deleted_at', null),
        supabase.from('appointments').select('service,time,status,deleted_at')
          .eq('date', params.date).is('deleted_at', null).not('status', 'in', '("cancelled","rejected")'),
      ]);
      throwIf(e1); throwIf(e2);
      return Object.fromEntries((svcs || []).map((s) => [s.name, availability(s, appts)]));
    }

    if (seg[1] === 'appointments') {
      if (seg[2] === 'slots' && method === 'GET') {
        if (!params.date) throw fail('date is required.', 400);
        const svc = await findService(params.service);
        const limits = capacityMap(svc);
        const { data, error } = await supabase.from('appointments').select('time')
          .eq('date', params.date).eq('service', params.service || '').is('deleted_at', null)
          .not('status', 'in', '("cancelled","rejected")');
        throwIf(error);
        const slots = {};
        (data || []).forEach((r) => { slots[r.time] = (slots[r.time] || 0) + 1; });
        return { limit: slotCapacity(svc, ''), limits, slots };
      }
      if (seg[2] === 'notifications' && method === 'GET') {
        const { data, error } = await supabase.from('appointments')
          .select('id,service,date,time,status,updated_at').eq('user_id', uid).is('deleted_at', null)
          .neq('status', 'pending').order('updated_at', { ascending: false }).limit(20);
        throwIf(error);
        const label = { confirmed: 'Confirmed', rejected: 'Rejected', completed: 'Completed', cancelled: 'Cancelled', approved: 'Approved' };
        const color = { confirmed: '#16a34a', approved: '#16a34a', rejected: '#dc2626', completed: '#1d4ed8', cancelled: '#6b7280' };
        return (data || []).map((r) => ({ id: r.id, type: 'appointment', status: r.status, title: `Appointment ${label[r.status] || r.status}`, message: `${r.service} on ${r.date} at ${r.time}`, color: color[r.status] || '#374151', updated_at: r.updated_at }));
      }
      if (!seg[2] && method === 'GET') {
        const { data, error } = await supabase.from('appointments')
          .select('id,name,service,date,time,notes,status,handled_by,created_at,updated_at')
          .eq('user_id', uid).is('deleted_at', null)
          .order('date', { ascending: false }).order('time', { ascending: true });
        throwIf(error); return data || [];
      }
      if (!seg[2] && method === 'POST') {
        if (!body.service || !body.date || !body.time) throw fail('Service, date, and time are required.', 400);
        const limit = slotCapacity(await findService(body.service), body.time);
        if (limit <= 0) throw fail('This time is not available for this service. Please choose another time.', 409);
        const { data: taken, error: e1 } = await supabase.from('appointments').select('id')
          .eq('date', body.date).eq('time', body.time).eq('service', body.service).is('deleted_at', null)
          .not('status', 'in', '("cancelled","rejected")');
        throwIf(e1);
        if ((taken || []).length >= limit) throw fail(`This time slot is full (max ${limit} per slot for this service). Please choose another time.`, 409);
        const { data: appt, error: e2 } = await supabase.from('appointments').insert({
          user_id: uid, name: fullName, service: body.service, date: body.date, time: body.time, notes: body.notes || '', status: 'pending',
        }).select('id').single();
        throwIf(e2);
        const fd = new Date(body.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
        await supabase.from('notifications').insert({ type: 'Appointment', priority: 'normal', title: 'New appointment booked', message: `${fullName} booked ${body.service} on ${fd} at ${body.time}.${body.notes ? ` Notes: ${body.notes}` : ''}`, recipient: 'All Staff', is_read: false });
        return { ok: true, id: appt.id };
      }
      if (seg[2] && method === 'DELETE') {
        const { data, error: e1 } = await supabase.from('appointments').select('status').eq('id', seg[2]).eq('user_id', uid).limit(1);
        throwIf(e1);
        if (!data || !data.length) throw fail('Appointment not found.', 404);
        if (data[0].status !== 'pending') throw fail('Only pending appointments can be cancelled.', 400);
        const { error } = await supabase.from('appointments').delete().eq('id', seg[2]);
        throwIf(error); return { ok: true };
      }
      if (seg[3] === 'accept-reschedule' && method === 'PATCH') {
        const { data: apptData, error: fetchErr } = await supabase.from('appointments')
          .select('id, service, date, time, notes, name').eq('id', seg[2]).eq('user_id', uid).limit(1).single();
        if (fetchErr || !apptData) throw fail('Appointment not found.', 404);
        const { error: updateErr } = await supabase.from('appointments')
          .update({ status: 'approved' }).eq('id', seg[2]);
        throwIf(updateErr);
        await supabase.from('notifications').insert({
          type: 'Appointment', priority: 'normal',
          title: 'Reschedule Accepted',
          message: `${apptData.name} accepted the reschedule for ${apptData.service} on ${apptData.date} at ${apptData.time}.`,
          recipient: 'All Staff', is_read: false,
        });
        return { ok: true };
      }
      if (seg[3] === 'send-note' && method === 'POST') {
        const { note } = body;
        if (!note || !note.trim()) throw fail('Note is required.', 400);
        const { data: apptData, error: fetchErr } = await supabase.from('appointments')
          .select('id, service, date, time, notes, name').eq('id', seg[2]).eq('user_id', uid).limit(1).single();
        if (fetchErr || !apptData) throw fail('Appointment not found.', 404);
        const userNote = `[NOTE from User] ${note.trim()}`;
        const updatedNotes = apptData.notes ? `${apptData.notes}\n\n${userNote}` : userNote;
        const { error: updateErr } = await supabase.from('appointments')
          .update({ notes: updatedNotes }).eq('id', seg[2]);
        throwIf(updateErr);
        await supabase.from('notifications').insert({
          type: 'Appointment', priority: 'normal',
          title: 'User Sent a Note',
          message: `${apptData.name} (${apptData.service}): "${note.trim()}"`,
          recipient: 'All Staff', is_read: false,
        });
        return { ok: true };
      }
    }

    if (seg[1] === 'announcements' && method === 'GET') {
      const { data, error } = await supabase.from('announcements')
        .select('id, title, category, body, author, audience, publish_date, event_date, pinned, image_url, created_at')
        .eq('status', 'published').is('deleted_at', null)
        .order('pinned', { ascending: false }).order('created_at', { ascending: false });
      throwIf(error); return data || [];
    }
    if (seg[1] === 'health-records' && method === 'GET') {
      const { data, error } = await supabase.from('health_records').select('*')
        .eq('patient', fullName).is('deleted_at', null).order('date', { ascending: false });
      throwIf(error); return data || [];
    }
    if (seg[1] === 'vaccinations' && method === 'GET') {
      const { data, error } = await supabase.from('vaccinations').select('*').is('deleted_at', null)
        .or(`user_id.eq.${uid},and(user_id.is.null,patient.eq."${fullName}")`)
        .order('date', { ascending: false });
      throwIf(error); return data || [];
    }
    if (seg[1] === 'search' && method === 'GET') {
      const query = (params.q || '').trim();
      if (!query) return [];
      const { data, error } = await supabase.from('users').select('id, full_name, username, phone, purok')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%,phone.ilike.%${query}%`).limit(10);
      throwIf(error); return data || [];
    }
    if (seg[1] === 'notifications' && method === 'GET') {
      return buildUserNotifications(uid, fullName);
    }
    throw fail(`Unhandled user route: ${method} /${pathOnly}`, 404);
  }

  // ---------- ADMIN CRUD TABLES + specials ----------
  const cfg = TABLES[seg[0]];
  if (!cfg) throw fail(`Unhandled route: ${method} /${pathOnly}`, 404);

  // specials
  if (seg[0] === 'vaccinations' && seg[1] === 'due-soon' && method === 'GET') {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 7);
    const { data, error } = await supabase.from('vaccinations').select('id, patient, age, vaccine, dose, next_due, status')
      .is('deleted_at', null).or(`status.eq.missed,and(status.eq.scheduled,next_due.lte.${cutoff.toISOString().slice(0,10)})`)
      .order('next_due', { ascending: true }).limit(30);
    throwIf(error);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return (data || []).map((v) => { const due = v.next_due ? new Date(String(v.next_due).slice(0, 10) + 'T00:00:00') : null; return { ...v, overdue: due && due < today, daysAway: due ? Math.round((due - today) / 86400000) : null }; });
  }
  if (seg[0] === 'vaccinations' && seg[1] === 'users-list' && method === 'GET') {
    const { data, error } = await supabase.from('users').select('id, full_name, username, phone, purok')
      .eq('is_active', true).order('full_name', { ascending: true });
    throwIf(error); return data || [];
  }
  if (seg[0] === 'vaccinations' && seg[2] === 'status' && method === 'PATCH') {
    if (!['scheduled','completed','missed'].includes(body.status)) throw fail('Invalid status.', 400);
    const { error } = await supabase.from('vaccinations').update({ status: body.status }).eq('id', seg[1]);
    throwIf(error); return { ok: true };
  }
  if (seg[0] === 'appointments' && seg[1] === 'search' && method === 'GET') {
    const query = (params.q || '').trim();
    if (!query) return [];
    const { data, error } = await supabase.from('appointments').select('id, name, service, date, time, status')
      .is('deleted_at', null).or(`name.ilike.%${query}%,service.ilike.%${query}%`).limit(10);
    throwIf(error);
    return (data || []).map((r) => ({ id: r.id, patient_name: r.name, service: r.service, appointment_date: r.date, time: r.time, status: r.status }));
  }
  if (seg[0] === 'appointments' && seg[2] === 'reschedule' && method === 'PATCH') {
    const { date, time, note } = body;
    if (!date || !time) throw fail('date and time are required.', 400);
    const admin = getAdmin();
    const handledBy = (admin && (admin.username || admin.name)) || 'Admin';

    // Fetch current appointment
    const { data: appt, error: fetchErr } = await supabase.from('appointments')
      .select('user_id, name, service, date, time, notes, status').eq('id', seg[1]).limit(1).single();
    if (fetchErr) throw fail(fetchErr.message);

    const oldDate = appt.date;
    const oldTime = appt.time;

    // Build reschedule note
    const rescheduleNote = note
      ? `[RESCHEDULED by ${handledBy}] ${note}`
      : `[RESCHEDULED by ${handledBy}] Appointment moved from ${oldDate} ${oldTime} to ${date} ${time}.`;
    const combinedNotes = appt.notes ? `${appt.notes}\n\n${rescheduleNote}` : rescheduleNote;

    // Update appointment — include updated_at so the timestamp is always fresh
    const rescheduleTime = new Date().toISOString();
    const { error: updateErr } = await supabase.from('appointments')
      .update({ date, time, notes: combinedNotes, status: 'pending', handled_by: handledBy, updated_at: rescheduleTime })
      .eq('id', seg[1]);
    if (updateErr) throw fail(updateErr.message);

    // Create notification for the user (with user_id so it shows in app)
    const notifTitle = 'Appointment Rescheduled';
    const notifMsg = note
      ? `Your appointment for ${appt.service} has been rescheduled to ${date} at ${time}. Note: ${note}`
      : `Your appointment for ${appt.service} has been rescheduled to ${date} at ${time}.`;
    // Resolve user_id early so we can attach it to the notification
    let targetUserId = appt.user_id || null;
    if (!targetUserId && appt.name) {
      const { data: users } = await supabase.from('users').select('id').eq('full_name', appt.name).limit(1);
      if (users && users.length) targetUserId = users[0].id;
    }
    await supabase.from('notifications').insert({
      type: 'Appointment',
      title: notifTitle,
      message: notifMsg,
      recipient: appt.name,
      priority: 'high',
      created_at: rescheduleTime,
      ...(targetUserId ? { user_id: targetUserId } : {}),
      route: '/user/appointments',
    });

    // Send FCM push notification
    if (targetUserId) {
      supabase.functions.invoke('send-push', {
        body: {
          user_id: targetUserId,
          title: '📅 Appointment Rescheduled',
          body: `Your ${appt.service || 'appointment'} has been moved to ${date} at ${time}.${note ? ` Note: ${note}` : ''} Tap to view details.`,
          route: '/user/appointments',
        },
      }).catch((e) => console.warn('[push] reschedule send-push failed:', e?.message || e));
    }

    return { ok: true, message: 'Appointment rescheduled and user notified.' };
  }
  if (seg[0] === 'appointments' && seg[2] === 'status' && method === 'PATCH') {
    if (!body.status) throw fail('status is required.', 400);
    const admin = getAdmin();
    const handledBy = (admin && (admin.username || admin.name)) || 'Admin';
    // Grab the appointment first so we can resolve the target user for the push
    const { data: appt } = await supabase.from('appointments')
      .select('user_id, name, service, date, time, notes').eq('id', seg[1]).limit(1).single();
    const { error } = await supabase.from('appointments').update({ status: body.status, handled_by: handledBy }).eq('id', seg[1]);
    throwIf(error);
    
    // Auto-create health record when appointment is marked as completed
    if (body.status === 'completed' && appt) {
      const healthRecordType = appt.service.includes('Vaccination') ? 'Vaccination' : 
                               appt.service.includes('Prenatal') ? 'Prenatal' : 
                               appt.service.includes('Dental') ? 'Consultation' : 'Consultation';
      
      const healthRecordData = {
        patient: appt.name,
        type: healthRecordType,
        diagnosis: `Completed appointment: ${appt.service}`,
        doctor: handledBy,
        date: appt.date,
        notes: appt.notes || `Auto-generated from completed appointment on ${new Date().toLocaleDateString()}`,
        status: 'closed'
      };

      const { data: healthRecord, error: healthRecordError } = await supabase
        .from('health_records')
        .insert(healthRecordData)
        .select('id')
        .single();

      if (!healthRecordError && healthRecord) {
        // Create notification for the user about the new health record
        await supabase.from('notifications').insert({
          type: 'health_record',
          title: `Health Record Created: ${healthRecordType}`,
          message: `Your completed appointment has been recorded. A new ${healthRecordType.toLowerCase()} health record has been added to your profile.`,
          recipient: appt.name,
          priority: 'normal',
        });
      }
    }
    
    // Notify the resident via FCM when the admin acts on their appointment
    const pushMap = {
      approved:  { title: '✅ Appointment Approved', verb: 'approved' },
      rejected:  { title: '❌ Appointment Rejected', verb: 'rejected' },
      completed: { title: '🎉 Appointment Completed', verb: 'marked completed' },
      cancelled: { title: '🚫 Appointment Cancelled', verb: 'cancelled' },
    };
    const meta = pushMap[body.status];
    if (meta && appt) {
      let targetUserId = appt.user_id || null;
      if (!targetUserId && appt.name) {
        const { data: users } = await supabase.from('users').select('id').eq('full_name', appt.name).limit(1);
        if (users && users.length) targetUserId = users[0].id;
      }
      if (targetUserId) {
        const when = appt.date ? ` on ${appt.date}${appt.time ? ` at ${appt.time}` : ''}` : '';
        supabase.functions.invoke('send-push', {
          body: {
            user_id: targetUserId,
            title: meta.title,
            body: `Your ${appt.service || 'appointment'}${when} was ${meta.verb}. Tap to view details.`,
            route: '/user/appointments',
          },
        }).catch((e) => console.warn('[push] appointment send-push failed:', e?.message || e));
      }
    }
    return { ok: true };
  }
  if (seg[0] === 'health-records' && seg[1] === 'search' && method === 'GET') {
    const query = (params.q || '').trim();
    if (!query) return [];
    const { data, error } = await supabase.from('health_records').select('id, patient_name:patient, record_type:type, diagnosis, date, doctor')
      .is('deleted_at', null).or(`patient.ilike.%${query}%,diagnosis.ilike.%${query}%,doctor.ilike.%${query}%`).limit(10);
    throwIf(error); return data || [];
  }
  if (seg[0] === 'notifications' && seg[1] === 'read-all' && method === 'PATCH') {
    const { error } = await supabase.from('notifications').update({ is_read: true }).gt('id', 0);
    throwIf(error); return { ok: true };
  }
  // health-records create also notifies the patient
  if (seg[0] === 'health-records' && !seg[1] && method === 'POST') {
    const res = await create(cfg, body);
    const { data: users } = await supabase.from('users').select('id').eq('full_name', body.patient).limit(1);
    if (users && users.length) {
      await supabase.from('notifications').insert({ type: 'health_record', title: `New Health Record: ${body.type}`, message: `A new ${String(body.type).toLowerCase()} record has been added for you. Diagnosis: ${body.diagnosis}`, recipient: body.patient, priority: 'normal' });
    }
    return res;
  }
  // announcement create -> broadcast an FCM push to ALL users (published only)
  if (seg[0] === 'announcements' && !seg[1] && method === 'POST') {
    const res = await create(cfg, body);
    if (body.status === 'published') {
      const plain = body.body ? String(body.body).replace(/<[^>]+>/g, '').trim() : '';
      supabase.functions.invoke('send-push', {
        body: {
          broadcast: true,
          title: `📢 ${body.title || 'New Announcement'}`,
          body: plain ? plain.slice(0, 120) : 'Tap to read the latest announcement.',
          route: '/user/announcements',
        },
      }).catch((e) => console.warn('[push] announcement send-push failed:', e?.message || e));
    }
    return res;
  }

  // generic CRUD
  if (!seg[1] && method === 'GET')  return listAll(cfg, params);
  if (seg[1] === 'count' && method === 'GET') return count(cfg);
  if (seg[1] === 'trash' && !seg[2] && method === 'GET') return trash(cfg);
  if (seg[1] === 'trash' && seg[3] === 'restore' && method === 'PATCH') return restore(cfg, seg[2]);
  if (seg[1] === 'trash' && seg[3] === 'purge' && method === 'DELETE') return purge(cfg, seg[2]);
  if (seg[1] && method === 'GET')    return getById(cfg, seg[1]);
  if (!seg[1] && method === 'POST')  return create(cfg, body);
  if (seg[1] && method === 'PUT')    return update(cfg, seg[1], body);
  if (seg[1] && method === 'DELETE') return softDelete(cfg, seg[1]);

  throw fail(`Unhandled route: ${method} /${pathOnly}`, 404);
}

// Combined "/user/notifications" (direct notifs + announcements + appt status + reschedules)
async function buildUserNotifications(uid, fullName) {

  // ── 1. Direct notifications for this user (reschedule, health records, etc.) ──
  // Use recipient = fullName because the notifications table stores the patient name, not user_id
  const { data: directNotifs = [] } = await supabase.from('notifications')
    .select('id, type, title, message, is_read, created_at, route, recipient')
    .eq('recipient', fullName)
    .not('recipient', 'eq', 'All Staff')
    .order('created_at', { ascending: false })
    .limit(30);
  const directN = (directNotifs || []).filter((n) => !/vaccin/i.test(`${n.type} ${n.title}`)).map((n) => ({
    id: `notif_${n.id}`,
    sourceId: n.id,
    type: /reschedule/i.test(n.title || '') ? 'reschedule' : n.type === 'health_record' ? 'health_record' : 'appointment',
    status: /reschedule/i.test(n.title || '') ? 'rescheduled' : 'notified',
    title: n.title || 'Notification',
    message: n.message || '',
    timestamp: n.created_at,
    navigateTo: n.route || '/user/appointments',
    isRead: n.is_read,
  }));

  // ── 2. Announcements ──
  const { data: anns = [] } = await supabase.from('announcements')
    .select('id, title, category, body, author, publish_date, created_at')
    .eq('status', 'published').is('deleted_at', null).order('created_at', { ascending: false });
  const annN = (anns || []).map((a) => ({ id: `ann_${a.id}`, sourceId: a.id, type: 'announcement', category: a.category, title: a.title, message: a.body ? a.body.replace(/<[^>]+>/g, '').slice(0, 100) : '', author: a.author || 'Admin', timestamp: a.created_at, navigateTo: '/user/announcements' }));

  // ── 3. Non-pending appointment status changes ──
  const { data: appts = [] } = await supabase.from('appointments')
    .select('id, service, date, time, status, notes, updated_at').eq('user_id', uid).is('deleted_at', null)
    .neq('status', 'pending').order('updated_at', { ascending: false });
  const label = { approved: 'Approved', rejected: 'Rejected', completed: 'Completed', cancelled: 'Cancelled' };
  const apptN = (appts || []).map((a) => ({ id: `apt_${a.id}`, sourceId: a.id, type: 'appointment', status: a.status, title: `Appointment ${label[a.status] || a.status}`, message: `${a.service} on ${a.date} at ${a.time}`, timestamp: a.updated_at, navigateTo: '/user/appointments' }));

  // ── 4. Rescheduled appointments — fetch ALL pending for this user, filter client-side ──
  // (avoids ilike with '[' special char that can fail in PostgREST URL encoding)
  const { data: pendingAppts = [] } = await supabase.from('appointments')
    .select('id, service, date, time, status, notes, updated_at')
    .eq('user_id', uid).is('deleted_at', null).eq('status', 'pending')
    .not('notes', 'is', null).order('updated_at', { ascending: false });
  const reschedN = (pendingAppts || [])
    .filter((a) => /RESCHEDULED/i.test(a.notes || ''))
    .map((a) => {
      const blocks   = (a.notes || '').split('\n\n');
      const lastNote = [...blocks].reverse().find((b) => /RESCHEDULED/i.test(b)) || '';
      const cleaned  = lastNote.replace(/\[RESCHEDULED by [^\]]+\]\s*/i, '').trim();
      return {
        id: `resched_${a.id}`,
        sourceId: a.id,
        type: 'reschedule',
        status: 'rescheduled',
        title: 'Appointment Rescheduled',
        message: cleaned || `Your ${a.service} has been moved to ${a.date} at ${a.time}.`,
        timestamp: a.updated_at || new Date().toISOString(),
        navigateTo: '/user/appointments',
      };
    });

  // Combine all sources — deduplicate so the same reschedule doesn't appear twice
  // reschedN (from appointments table) is always reliable since it uses user_id
  // directN (from notifications table by recipient name) supplements when available
  const reschedApptIds = new Set(reschedN.map(n => String(n.sourceId)));
  // Avoid showing appt status entries that are also covered by reschedN
  const filteredApptN = apptN.filter(n => !reschedApptIds.has(String(n.sourceId)));
  return [...reschedN, ...directN, ...annN, ...filteredApptN]
    // Remove exact id duplicates
    .filter((n, i, arr) => arr.findIndex(x => x.id === n.id) === i)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// ── Public interface (mirrors utils/api.js `api`) ──
const withQs = (path, params) => params ? `${path}?${new URLSearchParams(params).toString()}` : path;

export const supabaseApi = {
  get:    (path, params) => route('GET', withQs(path, params)),
  post:   (path, body)   => route('POST', path, body || {}),
  put:    (path, body)   => route('PUT', path, body || {}),
  patch:  (path, body)   => route('PATCH', path, body || {}),
  delete: (path)         => route('DELETE', path),
};

export default supabaseApi;
