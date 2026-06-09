import React, { useMemo, useState, useEffect } from 'react';
import useCrud from '../../hooks/useCrud';
import api from '../../utils/api';
import { Card, Row, Col, Form, InputGroup, Button, Table, Modal } from 'react-bootstrap';
import {
  Search, Plus, Eye, Edit3, Trash2, FileText, Activity, Stethoscope, Pill, ClipboardList,
  Calendar, User, Clock, ChevronDown,
} from 'lucide-react';

const statusVariant = {
  ongoing:    { bg: '#fecaca', color: '#7f1d1d', border: '#ef4444', label: 'Ongoing'    },
  'follow-up':{ bg: '#fed7aa', color: '#7c2d12', border: '#f97316', label: 'Follow-up'  },
  closed:     { bg: '#bfdbfe', color: '#14532d', border: '#22c55e', label: 'Closed'     },
};

const typeVariant = {
  'Consultation': { bg: '#dbeafe', color: '#1e40af', icon: <Stethoscope size={14} /> },
  'Vaccination':  { bg: '#dbeafe', color: '#15803d', icon: <Activity size={14} />     },
  'Prenatal':     { bg: '#fce7f3', color: '#9d174d', icon: <User size={14} />         },
  'Lab Result':   { bg: '#ede9fe', color: '#5b21b6', icon: <ClipboardList size={14} /> },
  'Prescription': { bg: '#fef3c7', color: '#854d0e', icon: <Pill size={14} />         },
};

const StatusPill = ({ status }) => {
  const sv = statusVariant[status];
  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: sv.bg,
        color: sv.color,
        border: `1px solid ${sv.border}`,
        fontWeight: 700,
        fontSize: 11,
        padding: '4px 12px',
        borderRadius: 999,
        letterSpacing: '0.02em',
        lineHeight: 1.4,
      }}
    >
      {sv.label}
    </span>
  );
};

const TypePill = ({ type }) => {
  const tv = typeVariant[type] || { bg: '#f3f4f6', color: '#374151', icon: <FileText size={14} /> };
  return (
    <span
      className="d-inline-flex align-items-center gap-1"
      style={{
        backgroundColor: tv.bg,
        color: tv.color,
        fontWeight: 600,
        fontSize: 11,
        padding: '4px 10px',
        borderRadius: 8,
      }}
    >
      {tv.icon} {type}
    </span>
  );
};

const emptyForm = { patient: '', type: 'Consultation', diagnosis: '', doctor: '', date: '', notes: '', status: 'ongoing' };

const HealthRecords = () => {
  const { items, loading, createItem, updateItem, deleteItem } = useCrud('/health-records');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showView, setShowView] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await api.get('/auth/users');
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setUsers([]);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) =>
    u.full_name.toLowerCase().includes(userSearch.toLowerCase())
  );

  const counts = useMemo(() => ({
    all:         items.length,
    ongoing:     items.filter((r) => r.status === 'ongoing').length,
    'follow-up': items.filter((r) => r.status === 'follow-up').length,
    closed:      items.filter((r) => r.status === 'closed').length,
  }), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((r) => {
      const matchStatus = filter === 'all' || r.status === filter;
      const matchQuery =
        !q ||
        r.patient.toLowerCase().includes(q) ||
        r.diagnosis.toLowerCase().includes(q) ||
        r.doctor.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [items, filter, query]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({ ...r });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!form.patient) { setFormError('Patient name is required'); return; }
    if (!form.type) { setFormError('Record type is required'); return; }
    if (!form.diagnosis) { setFormError('Diagnosis is required'); return; }
    if (!form.doctor) { setFormError('Doctor/Staff name is required'); return; }
    if (!form.date) { setFormError('Date is required'); return; }
    
    try {
      if (editingId) {
        await updateItem(editingId, form);
      } else {
        await createItem(form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      setFormError('');
    } catch (err) {
      setFormError(err.message || 'Failed to save record');
    }
  };

  const handleDelete = async () => {
    if (confirmDelete) {
      await deleteItem(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const tabs = [
    { key: 'all',        label: 'All' },
    { key: 'ongoing',    label: 'Ongoing' },
    { key: 'follow-up',  label: 'Follow-up' },
    { key: 'closed',     label: 'Closed' },
  ];

  const summaryCards = [
    { key: 'all',         label: 'Total Records', icon: <FileText size={18} />,      bg: '#dbeafe', color: '#1d4ed8' },
    { key: 'ongoing',     label: 'Ongoing',       icon: <Activity size={18} />,      bg: '#fecaca', color: '#7f1d1d' },
    { key: 'follow-up',   label: 'Follow-up',     icon: <ClipboardList size={18} />, bg: '#fed7aa', color: '#7c2d12' },
    { key: 'closed',      label: 'Closed',        icon: <Stethoscope size={18} />,   bg: '#bfdbfe', color: '#14532d' },
  ];

  return (
    <div className="p-4" style={{ backgroundColor: '#f8fafc' }}>
      {/* Stat summary */}
      <Row className="g-2 g-md-3 mb-4 bh-stagger">
        {summaryCards.map((c) => (
          <Col key={c.key} xs={6} lg={3}>
            <Card
              className="border rounded-4 bh-card-hover"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer' }}
              onClick={() => setFilter(c.key)}
            >
              <Card.Body className="p-3 d-flex justify-content-between align-items-center">
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{c.label}</div>
                  <div className="fw-bold" style={{ fontSize: 26, color: '#111827', lineHeight: 1.1 }}>{counts[c.key]}</div>
                </div>
                <div
                  className="d-flex align-items-center justify-content-center rounded-3"
                  style={{ width: 38, height: 38, backgroundColor: c.bg, color: c.color }}
                >
                  {c.icon}
                </div>
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
                  <Button
                    key={t.key}
                    size="sm"
                    onClick={() => setFilter(t.key)}
                    className="border-0"
                    style={{
                      backgroundColor: active ? '#15803d' : '#f3f4f6',
                      color: active ? '#fff' : '#374151',
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {t.label} <span className="ms-1" style={{ opacity: 0.8 }}>({counts[t.key]})</span>
                  </Button>
                );
              })}
            </div>
            <div className="ms-auto d-flex align-items-center gap-2">
              <InputGroup size="sm" style={{ width: 280 }}>
                <InputGroup.Text className="bg-light border-end-0">
                  <Search size={14} color="#9ca3af" />
                </InputGroup.Text>
                <Form.Control
                  className="bg-light border-start-0"
                  placeholder="Search patient, diagnosis, doctor..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{ fontSize: 13 }}
                />
              </InputGroup>
              <Button
                size="sm"
                onClick={openAdd}
                className="d-flex align-items-center gap-1 border-0"
                style={{ backgroundColor: '#16a34a', fontWeight: 500, fontSize: 12 }}
              >
                <Plus size={14} /> Add Record
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Desktop Table - hidden on mobile */}
      <Card className="border rounded-4 d-none d-md-block" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <Card.Body className="p-0">
          <div className="table-responsive-wrapper">
          <Table hover className="mb-0 align-middle">
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th className="px-4 py-3">Patient</th>
                <th className="py-3">Type</th>
                <th className="py-3">Diagnosis</th>
                <th className="py-3">Doctor</th>
                <th className="py-3">Date</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13 }}>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-5" style={{ color: '#9ca3af' }}>
                    No health records found.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
                        style={{ width: 32, height: 32, backgroundColor: '#16a34a', fontSize: 11 }}
                      >
                        {r.patient.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                      </div>
                      <span className="fw-semibold" style={{ color: '#111827' }}>{r.patient}</span>
                    </div>
                  </td>
                  <td className="py-3"><TypePill type={r.type} /></td>
                  <td className="py-3" style={{ color: '#374151' }}>{r.diagnosis}</td>
                  <td className="py-3" style={{ color: '#6b7280' }}>{r.doctor}</td>
                  <td className="py-3" style={{ color: '#6b7280' }}>{r.date}</td>
                  <td className="py-3"><StatusPill status={r.status} /></td>
                  <td className="py-3 text-end pe-4">
                    <div className="d-flex justify-content-end gap-1">
                      <Button size="sm" variant="light" className="border-0 p-1 px-2" onClick={() => setShowView(r)} title="View">
                        <Eye size={14} color="#6b7280" />
                      </Button>
                      <Button size="sm" variant="light" className="border-0 p-1 px-2" onClick={() => openEdit(r)} title="Edit">
                        <Edit3 size={14} color="#1d4ed8" />
                      </Button>
                      <Button size="sm" variant="light" className="border-0 p-1 px-2" onClick={() => setConfirmDelete(r)} title="Delete">
                        <Trash2 size={14} color="#dc2626" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Mobile Card View - visible only on mobile */}
      <div className="d-md-none">
        {filtered.length === 0 ? (
          <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-4 text-center" style={{ color: '#9ca3af' }}>
              <FileText size={32} className="mb-2" />
              <div style={{ fontSize: 14 }}>No health records found.</div>
            </Card.Body>
          </Card>
        ) : (
          <Row className="g-2">
            {filtered.map((r) => {
              const tv = typeVariant[r.type] || { bg: '#f3f4f6', color: '#374151', icon: <FileText size={14} /> };
              return (
                <Col key={r.id} xs={12}>
                  <Card
                    className="border rounded-4 bh-card-hover"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `4px solid ${tv.color}` }}
                  >
                    <Card.Body className="p-3">
                      <div className="d-flex align-items-start gap-3">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                          style={{ width: 44, height: 44, backgroundColor: tv.bg, color: tv.color }}
                        >
                          {tv.icon && React.cloneElement(tv.icon, { size: 20 })}
                        </div>
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="fw-bold text-truncate" style={{ fontSize: 14, color: '#111827' }}>{r.patient}</span>
                            <StatusPill status={r.status} />
                          </div>
                          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                            <TypePill type={r.type} />
                          </div>
                          <div style={{ fontSize: 13, color: '#374151', fontWeight: 500, marginBottom: 4 }}>
                            {r.diagnosis}
                          </div>
                          <div className="d-flex flex-wrap gap-3" style={{ fontSize: 12, color: '#6b7280' }}>
                            <span className="d-flex align-items-center gap-1">
                              <User size={12} /> {r.doctor || '—'}
                            </span>
                            <span className="d-flex align-items-center gap-1">
                              <Calendar size={12} /> {r.date}
                            </span>
                          </div>
                          {r.notes && (
                            <div
                              className="mt-2 p-2 rounded-2 text-truncate"
                              style={{ backgroundColor: '#f9fafb', fontSize: 11, color: '#6b7280' }}
                              title={r.notes}
                            >
                              {r.notes}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="d-flex gap-2 mt-3 pt-2" style={{ borderTop: '1px solid #f3f4f6' }}>
                        <Button
                          size="sm"
                          variant="light"
                          className="flex-grow-1 border-0 d-flex align-items-center justify-content-center gap-1"
                          onClick={() => setShowView(r)}
                          style={{ fontSize: 12 }}
                        >
                          <Eye size={13} color="#6b7280" /> View
                        </Button>
                        <Button
                          size="sm"
                          variant="light"
                          className="flex-grow-1 border-0 d-flex align-items-center justify-content-center gap-1"
                          onClick={() => openEdit(r)}
                          style={{ fontSize: 12 }}
                        >
                          <Edit3 size={13} color="#1d4ed8" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="light"
                          className="flex-grow-1 border-0 d-flex align-items-center justify-content-center gap-1"
                          onClick={() => setConfirmDelete(r)}
                          style={{ fontSize: 12 }}
                        >
                          <Trash2 size={13} color="#dc2626" /> Delete
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal show={showForm} onHide={() => setShowForm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }}>{editingId ? 'Edit Health Record' : 'Add Health Record'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSave}>
          <Modal.Body>
            {formError && (
              <div style={{
                padding: '10px 12px',
                marginBottom: 16,
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                fontSize: 13,
                color: '#dc2626',
              }}>
                {formError}
              </div>
            )}
            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Registered User</Form.Label>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <Form.Control
                  size="sm"
                  placeholder="Click arrow or search to select user..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onFocus={() => setShowUserDropdown(true)}
                  style={{ 
                    paddingRight: '32px',
                    cursor: 'pointer'
                  }}
                />
                <div
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronDown 
                    size={18} 
                    style={{
                      color: '#9ca3af',
                      transition: 'transform 0.2s ease',
                      transform: showUserDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </div>
              </div>
              {showUserDropdown && (
                <div style={{
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  maxHeight: 250,
                  overflowY: 'auto',
                  backgroundColor: '#fff',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}>
                  {users.length > 0 ? (
                    (userSearch ? filteredUsers : users).map((u) => (
                      <div
                        key={u.id}
                        onClick={() => {
                          setForm({ ...form, patient: u.full_name });
                          setUserSearch('');
                          setShowUserDropdown(false);
                        }}
                        style={{
                          padding: '10px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f3f4f6',
                          fontSize: 13,
                          color: form.patient === u.full_name ? '#1d4ed8' : '#374151',
                          backgroundColor: form.patient === u.full_name ? '#eff6ff' : '#fff',
                          fontWeight: form.patient === u.full_name ? 600 : 400,
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = form.patient === u.full_name ? '#eff6ff' : '#fff'}
                      >
                        {u.full_name}
                      </div>
                    ))
                  ) : (
                    <div style={{
                      padding: '8px 12px',
                      fontSize: 13,
                      color: '#9ca3af',
                      backgroundColor: '#f9fafb',
                    }}>
                      Loading users...
                    </div>
                  )}
                </div>
              )}
              {form.patient && (
                <div style={{
                  marginTop: 8,
                  padding: '10px 12px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 6,
                  fontSize: 13,
                  color: '#1d4ed8',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <User size={14} />
                  Selected: <strong>{form.patient}</strong>
                </div>
              )}
            </Form.Group>
            <Row className="g-2 mb-3">
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Type</Form.Label>
                <Form.Select size="sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option>Consultation</option>
                  <option>Vaccination</option>
                  <option>Prenatal</option>
                  <option>Lab Result</option>
                  <option>Prescription</option>
                </Form.Select>
              </Col>
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Status</Form.Label>
                <Form.Select size="sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="ongoing">Ongoing</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="closed">Closed</option>
                </Form.Select>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Diagnosis</Form.Label>
              <Form.Control size="sm" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} required />
            </Form.Group>
            <Row className="g-2 mb-3">
              <Col xs={7}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Doctor / Staff</Form.Label>
                <Form.Control size="sm" placeholder="Dr. Reyes" value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })} required />
              </Col>
              <Col xs={5}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Date</Form.Label>
                <Form.Control type="date" size="sm" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </Col>
            </Row>
            <Form.Group>
              <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Notes</Form.Label>
              <Form.Control as="textarea" rows={3} size="sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="border-0" style={{ backgroundColor: '#16a34a' }}>
              {editingId ? 'Save Changes' : 'Add Record'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal show={!!showView} onHide={() => setShowView(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }}>Health Record Details</Modal.Title>
        </Modal.Header>
        {showView && (
          <Modal.Body>
            <div className="d-flex align-items-center gap-3 mb-3">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
                style={{ width: 52, height: 52, backgroundColor: '#16a34a', fontSize: 16 }}
              >
                {showView.patient.split(' ').map((p) => p[0]).slice(0, 2).join('')}
              </div>
              <div className="flex-grow-1">
                <div className="fw-bold" style={{ fontSize: 16 }}>{showView.patient}</div>
                <div className="mt-1"><TypePill type={showView.type} /></div>
              </div>
              <div><StatusPill status={showView.status} /></div>
            </div>
            <hr />
            <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
              <div className="d-flex align-items-center gap-2"><FileText size={14} color="#6b7280" /> <strong>Diagnosis:</strong> {showView.diagnosis}</div>
              <div className="d-flex align-items-center gap-2"><User size={14} color="#6b7280" /> <strong>Doctor:</strong> {showView.doctor || '—'}</div>
              <div className="d-flex align-items-center gap-2"><Calendar size={14} color="#6b7280" /> <strong>Date:</strong> {showView.date}</div>
              {showView.notes && (
                <div
                  className="mt-2 p-3 rounded-3"
                  style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6', fontSize: 12, color: '#374151' }}
                >
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Notes</div>
                  {showView.notes}
                </div>
              )}
            </div>
          </Modal.Body>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal show={!!confirmDelete} onHide={() => setConfirmDelete(null)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 15 }}>Delete Record?</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ fontSize: 13 }}>
          Delete this record for <strong>{confirmDelete?.patient}</strong>? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button size="sm" className="border-0" style={{ backgroundColor: '#dc2626' }} onClick={handleDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default HealthRecords;
