import React, { useMemo, useState, useEffect, useCallback } from 'react';
import useCrud from '../../hooks/useCrud';
import api from '../../utils/api';
import { supabase } from '../../config/supabase';
import { Card, Row, Col, Form, InputGroup, Button, Table, Modal, Badge } from 'react-bootstrap';
import {
  Search, Plus, Eye, Edit3, Trash2, Syringe, Calendar, User, MapPin, Clock,
  ShieldCheck, AlertTriangle, CheckCircle, XCircle, Users,
} from 'lucide-react';

const STATUS_VARIANT = {
  scheduled: { bg: '#fef3c7', color: '#92400e', border: '#f59e0b', label: 'Scheduled', icon: <Clock size={12} /> },
  completed: { bg: '#dcfce7', color: '#14532d', border: '#22c55e', label: 'Completed', icon: <CheckCircle size={12} /> },
  missed:    { bg: '#fee2e2', color: '#7f1d1d', border: '#ef4444', label: 'Missed',    icon: <XCircle size={12} /> },
};

const VACCINE_COLORS = {
  'BCG': '#16a34a', 'Measles': '#3b82f6', 'Tetanus': '#a855f7',
  'Flu (Influenza)': '#0ea5e9', 'Pneumococcal': '#f59e0b', 'DPT': '#ec4899',
  'Hepatitis B': '#8b5cf6', 'Polio (OPV)': '#06b6d4', 'COVID-19': '#dc2626',
  'HPV': '#84cc16', 'MMR': '#f97316', 'Varicella': '#14b8a6', 'Rabies': '#64748b',
};

const DOSE_OPTIONS = ['1st Dose', '2nd Dose', '3rd Dose', 'Booster', 'Annual', 'Single Dose'];
const SITES = ['Left arm (deltoid)', 'Right arm (deltoid)', 'Left thigh', 'Right thigh', 'Oral', 'Intranasal'];

const StatusPill = ({ status }) => {
  const sv = STATUS_VARIANT[status] || STATUS_VARIANT.scheduled;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: sv.bg, color: sv.color, border: `1px solid ${sv.border}`, fontWeight: 700, fontSize: 11, padding: '3px 10px', borderRadius: 999 }}>
      {sv.icon} {sv.label}
    </span>
  );
};

const VaccinePill = ({ vaccine }) => {
  const color = VACCINE_COLORS[vaccine] || '#6b7280';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: `${color}18`, color, fontWeight: 600, fontSize: 11, padding: '3px 10px', borderRadius: 8 }}>
      <Syringe size={11} /> {vaccine}
    </span>
  );
};

const emptyForm = { user_id: '', patient: '', age: '', vaccine: 'BCG', dose: '1st Dose', date: '', next_due: '', reminder_time: '09:00', administered_by: '', site: 'Left arm (deltoid)', status: 'scheduled', notes: '' };

const Vaccination = () => {
  const { items: raw, loading, refresh, createItem, updateItem, deleteItem } = useCrud('/vaccinations');
  const items = raw.map((r) => ({ ...r, next_due: r.next_due || '', administered_by: r.administered_by || '' }));

  const [users, setUsers]               = useState([]);
  const [filter, setFilter]             = useState('all');
  const [query, setQuery]               = useState('');
  const [showForm, setShowForm]         = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [showView, setShowView]         = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm]                 = useState(emptyForm);
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    api.get('/vaccinations/users-list')
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .catch(() => setUsers([]));
  }, []);

  // ── Supabase Realtime ──
  const handleRealtime = useCallback(() => { refresh(); }, [refresh]);

  React.useEffect(() => {
    const channel = supabase
      .channel('admin-vaccinations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vaccinations' }, handleRealtime)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [handleRealtime]);

  const counts = useMemo(() => ({
    all:       items.length,
    scheduled: items.filter((r) => r.status === 'scheduled').length,
    completed: items.filter((r) => r.status === 'completed').length,
    missed:    items.filter((r) => r.status === 'missed').length,
  }), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((r) => {
      const matchStatus = filter === 'all' || r.status === filter;
      const matchQuery  = !q || (r.patient || '').toLowerCase().includes(q) || (r.vaccine || '').toLowerCase().includes(q) || (r.administered_by || '').toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [items, filter, query]);

  const selectUser = (userId) => {
    const u = users.find((u) => String(u.id) === String(userId));
    setForm((f) => ({ ...f, user_id: userId, patient: u ? u.full_name : '' }));
  };

  const openAdd = () => { setEditingId(null); setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) }); setShowForm(true); };
  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({ user_id: r.user_id || '', patient: r.patient || '', age: String(r.age || ''), vaccine: r.vaccine || 'BCG', dose: r.dose || '1st Dose', date: r.date || '', next_due: r.next_due || '', reminder_time: r.reminder_time || '09:00', administered_by: r.administered_by || '', site: r.site || 'Left arm (deltoid)', status: r.status || 'scheduled', notes: r.notes || '' });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, age: form.age ? Number(form.age) : null, user_id: form.user_id || null, next_due: form.next_due || null };
      if (editingId) await updateItem(editingId, payload);
      else           await createItem(payload);
      closeForm();
    } finally { setSaving(false); }
  };

  const quickStatus = async (id, status) => {
    try { await api.patch(`/vaccinations/${id}/status`, { status }); await refresh(); }
    catch { await updateItem(id, { status }); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteItem(confirmDelete.id);
    setConfirmDelete(null);
  };

  const tabs = [
    { key: 'all', label: 'All' }, { key: 'scheduled', label: 'Scheduled' },
    { key: 'completed', label: 'Completed' }, { key: 'missed', label: 'Missed' },
  ];

  const summaryCards = [
    { key: 'all',       label: 'Total Records', icon: <Syringe size={18} />,       bg: '#dbeafe', color: '#1d4ed8' },
    { key: 'scheduled', label: 'Scheduled',     icon: <Clock size={18} />,         bg: '#fef3c7', color: '#92400e' },
    { key: 'completed', label: 'Completed',     icon: <CheckCircle size={18} />,   bg: '#dcfce7', color: '#14532d' },
    { key: 'missed',    label: 'Missed',        icon: <AlertTriangle size={18} />, bg: '#fee2e2', color: '#7f1d1d' },
  ];

  return (
    <div className="p-4" style={{ backgroundColor: '#f8fafc' }}>
      {/* Stats */}
      <Row className="g-2 g-md-3 mb-4 bh-stagger">
        {summaryCards.map((c) => (
          <Col key={c.key} xs={6} lg={3}>
            <Card className="border rounded-4 bh-card-hover" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer' }} onClick={() => setFilter(c.key)}>
              <Card.Body className="p-3 d-flex justify-content-between align-items-center">
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{c.label}</div>
                  <div className="fw-bold" style={{ fontSize: 26, color: '#111827', lineHeight: 1.1 }}>{counts[c.key]}</div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.icon}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Toolbar */}
      <Card className="border rounded-4 mb-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <Card.Body className="p-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="d-flex flex-wrap gap-1">
              {tabs.map((t) => {
                const active = filter === t.key;
                return (
                  <Button key={t.key} size="sm" onClick={() => setFilter(t.key)} className="border-0"
                    style={{ backgroundColor: active ? '#15803d' : '#f3f4f6', color: active ? '#fff' : '#374151', fontWeight: 600, fontSize: 12 }}>
                    {t.label} <span style={{ opacity: 0.75 }}>({counts[t.key]})</span>
                  </Button>
                );
              })}
            </div>
            <div className="ms-auto d-flex gap-2 mt-2 mt-md-0">
              <InputGroup size="sm" style={{ maxWidth: 260, minWidth: 130 }}>
                <InputGroup.Text className="bg-light border-end-0"><Search size={13} color="#9ca3af" /></InputGroup.Text>
                <Form.Control className="bg-light border-start-0" placeholder="Search patient, vaccine…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ fontSize: 12 }} />
              </InputGroup>
              <Button size="sm" onClick={openAdd} className="d-flex align-items-center gap-1 border-0 flex-shrink-0" style={{ backgroundColor: '#16a34a', fontSize: 12, fontWeight: 600 }}>
                <Plus size={14} /> <span className="d-none d-sm-inline">Record</span>
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Table */}
      <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <Card.Body className="p-0">
          <div className="table-responsive-wrapper">
            <Table hover className="mb-0 align-middle">
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th className="px-4 py-3">Patient</th><th className="py-3">Vaccine</th><th className="py-3">Dose</th>
                  <th className="py-3">Date Given</th><th className="py-3">Next Due</th><th className="py-3">Given By</th>
                  <th className="py-3">Status</th><th className="py-3 text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: 13 }}>
                {loading && <tr><td colSpan={8} className="text-center py-5" style={{ color: '#9ca3af' }}>Loading…</td></tr>}
                {!loading && filtered.length === 0 && <tr><td colSpan={8} className="text-center py-5" style={{ color: '#9ca3af' }}>No vaccination records found.</td></tr>}
                {filtered.map((r) => (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setShowView(r)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}>
                    <td className="px-4 py-3">
                      <div className="d-flex align-items-center gap-2">
                        <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {(r.patient || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-semibold" style={{ color: '#111827' }}>{r.patient}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.age ? `${r.age} y/o` : ''}{r.user_id ? <span className="ms-1" style={{ color: '#16a34a' }}>● registered</span> : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3"><VaccinePill vaccine={r.vaccine} /></td>
                    <td className="py-3" style={{ color: '#374151', fontWeight: 600 }}>{r.dose}</td>
                    <td className="py-3" style={{ color: '#6b7280' }}>{r.date ? new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                    <td className="py-3" style={{ color: r.next_due && new Date(r.next_due) < new Date() ? '#dc2626' : '#6b7280', fontWeight: r.next_due && new Date(r.next_due) < new Date() ? 700 : 400 }}>
                      {r.next_due ? new Date(r.next_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="py-3" style={{ color: '#6b7280' }}>{r.administered_by || '—'}</td>
                    <td className="py-3"><StatusPill status={r.status} /></td>
                    <td className="py-3 text-end pe-4" onClick={(e) => e.stopPropagation()}>
                      <div className="d-flex justify-content-end gap-1">
                        {r.status === 'scheduled' && <Button size="sm" variant="light" className="border-0 p-1 px-2" title="Mark Completed" onClick={() => quickStatus(r.id, 'completed')}><CheckCircle size={14} color="#16a34a" /></Button>}
                        {r.status === 'scheduled' && <Button size="sm" variant="light" className="border-0 p-1 px-2" title="Mark Missed" onClick={() => quickStatus(r.id, 'missed')}><XCircle size={14} color="#dc2626" /></Button>}
                        <Button size="sm" variant="light" className="border-0 p-1 px-2" title="Edit" onClick={() => openEdit(r)}><Edit3 size={14} color="#1d4ed8" /></Button>
                        <Button size="sm" variant="light" className="border-0 p-1 px-2" title="Delete" onClick={() => setConfirmDelete(r)}><Trash2 size={14} color="#dc2626" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Add/Edit Modal */}
      <Modal show={showForm} onHide={closeForm} centered size="lg">
        <Modal.Header closeButton style={{ borderBottom: '2px solid #dcfce7' }}>
          <Modal.Title style={{ fontSize: 16, fontWeight: 700 }}><Syringe size={17} className="me-2" color="#16a34a" />{editingId ? 'Edit Vaccination Record' : 'Record Vaccination'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSave}>
          <Modal.Body className="p-4">
            <div className="p-3 rounded-3 mb-3" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <Form.Label style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 6 }}><Users size={13} className="me-1" /> Link to Registered User (optional)</Form.Label>
              <Form.Select size="sm" value={form.user_id} onChange={(e) => selectUser(e.target.value)} style={{ fontSize: 13 }}>
                <option value="">— Select registered user —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name} ({u.username})</option>)}
              </Form.Select>
              <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>Selecting a user links this record to their account so they can view it.</div>
            </div>
            <Row className="g-3 mb-3">
              <Col xs={12} md={8}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Patient Full Name *</Form.Label>
                <Form.Control size="sm" value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} required style={{ fontSize: 13 }} />
              </Col>
              <Col xs={12} md={4}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Age</Form.Label>
                <Form.Control type="number" min={0} max={130} size="sm" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} style={{ fontSize: 13 }} />
              </Col>
            </Row>
            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Vaccine *</Form.Label>
                <Form.Select size="sm" value={form.vaccine} onChange={(e) => setForm({ ...form, vaccine: e.target.value })} style={{ fontSize: 13 }}>
                  {Object.keys(VACCINE_COLORS).map((v) => <option key={v}>{v}</option>)}
                </Form.Select>
              </Col>
              <Col xs={12} md={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Dose *</Form.Label>
                <Form.Select size="sm" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} style={{ fontSize: 13 }}>
                  {DOSE_OPTIONS.map((d) => <option key={d}>{d}</option>)}
                </Form.Select>
              </Col>
            </Row>
            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Date Administered *</Form.Label>
                <Form.Control type="date" size="sm" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required style={{ fontSize: 13 }} />
              </Col>
              <Col xs={12} md={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Next Due Date</Form.Label>
                <Form.Control type="date" size="sm" value={form.next_due} onChange={(e) => setForm({ ...form, next_due: e.target.value })} style={{ fontSize: 13 }} />
              </Col>
            </Row>
            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>
                  <Clock size={13} className="me-1" style={{ color: '#f59e0b' }} />
                  Reminder Time
                </Form.Label>
                <Form.Control 
                  type="time" 
                  size="sm" 
                  value={form.reminder_time} 
                  onChange={(e) => setForm({ ...form, reminder_time: e.target.value })} 
                  style={{ fontSize: 13 }} 
                />
                <Form.Text style={{ fontSize: 11, color: '#6b7280' }}>
                  Time when reminder notification will be sent
                </Form.Text>
              </Col>
            </Row>
            <Row className="g-3 mb-3">
              <Col xs={12} md={7}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Administered By</Form.Label>
                <Form.Control size="sm" placeholder="e.g. Nurse Cruz, Dr. Santos" value={form.administered_by} onChange={(e) => setForm({ ...form, administered_by: e.target.value })} style={{ fontSize: 13 }} />
              </Col>
              <Col xs={12} md={5}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Injection Site</Form.Label>
                <Form.Select size="sm" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} style={{ fontSize: 13 }}>
                  {SITES.map((s) => <option key={s}>{s}</option>)}
                </Form.Select>
              </Col>
            </Row>
            <Row className="g-3">
              <Col xs={12} md={4}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Status</Form.Label>
                <Form.Select size="sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ fontSize: 13 }}>
                  <option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="missed">Missed</option>
                </Form.Select>
              </Col>
              <Col xs={12} md={8}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Remarks / Notes</Form.Label>
                <Form.Control size="sm" placeholder="Adverse reactions, observations…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ fontSize: 13 }} />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" size="sm" className="border" onClick={closeForm}>Cancel</Button>
            <Button type="submit" size="sm" className="border-0" disabled={saving} style={{ backgroundColor: '#16a34a', fontWeight: 600 }}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Record Vaccination'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal show={!!showView} onHide={() => setShowView(null)} centered>
        {showView && (() => {
          const sv = STATUS_VARIANT[showView.status] || STATUS_VARIANT.scheduled;
          const vc = VACCINE_COLORS[showView.vaccine] || '#6b7280';
          return (
            <>
              <Modal.Header closeButton style={{ borderBottom: `3px solid ${vc}` }}>
                <Modal.Title style={{ fontSize: 15, fontWeight: 700 }}><Syringe size={16} className="me-2" style={{ color: vc }} />Vaccination Details</Modal.Title>
              </Modal.Header>
              <Modal.Body className="p-0">
                <div style={{ background: `linear-gradient(135deg, ${vc}18, ${vc}08)`, padding: '20px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: `${vc}22`, color: vc, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}><Syringe size={28} /></div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>{showView.vaccine}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{showView.dose}</div>
                  <StatusPill status={showView.status} />
                </div>
                <div className="p-4 d-flex flex-column gap-3">
                  <div style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {(showView.patient || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Patient</div>
                      <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{showView.patient}</div>
                      {showView.age && <div style={{ fontSize: 12, color: '#6b7280' }}>{showView.age} years old</div>}
                      {showView.user_id && <Badge style={{ backgroundColor: '#dcfce7', color: '#14532d', fontSize: 10 }}>Registered User</Badge>}
                    </div>
                  </div>
                  {[
                    { icon: <Calendar size={16} color="#1d4ed8" />, label: 'Date Administered', value: showView.date ? new Date(showView.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                    showView.next_due && { icon: <Clock size={16} color="#f59e0b" />, label: 'Next Due Date', value: new Date(showView.next_due).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                    { icon: <User size={16} color="#7c3aed" />, label: 'Administered By', value: showView.administered_by || '—' },
                    { icon: <MapPin size={16} color="#dc2626" />, label: 'Injection Site', value: showView.site || '—' },
                    showView.notes && { icon: <ShieldCheck size={16} color="#6b7280" />, label: 'Remarks', value: showView.notes },
                  ].filter(Boolean).map((row, i) => (
                    <div key={i} style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ marginTop: 2, flexShrink: 0 }}>{row.icon}</div>
                      <div>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{row.label}</div>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{row.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Modal.Body>
              <Modal.Footer className="justify-content-between">
                <div className="d-flex gap-2">
                  {showView.status === 'scheduled' && <Button size="sm" className="border-0" style={{ backgroundColor: '#16a34a', fontSize: 12 }} onClick={() => { quickStatus(showView.id, 'completed'); setShowView(null); }}><CheckCircle size={13} className="me-1" /> Mark Completed</Button>}
                  {showView.status === 'scheduled' && <Button size="sm" variant="light" className="border" style={{ fontSize: 12, color: '#dc2626' }} onClick={() => { quickStatus(showView.id, 'missed'); setShowView(null); }}>Mark Missed</Button>}
                </div>
                <Button size="sm" variant="secondary" onClick={() => setShowView(null)}>Close</Button>
              </Modal.Footer>
            </>
          );
        })()}
      </Modal>

      {/* Delete Confirm */}
      <Modal show={!!confirmDelete} onHide={() => setConfirmDelete(null)} centered size="sm">
        <Modal.Header closeButton><Modal.Title style={{ fontSize: 15 }}>Delete Record?</Modal.Title></Modal.Header>
        <Modal.Body style={{ fontSize: 13 }}>Delete <strong>{confirmDelete?.vaccine}</strong> ({confirmDelete?.dose}) record for <strong>{confirmDelete?.patient}</strong>? This cannot be undone.</Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" className="border" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button size="sm" className="border-0" style={{ backgroundColor: '#dc2626' }} onClick={handleDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Vaccination;