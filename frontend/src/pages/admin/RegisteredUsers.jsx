import React, { useMemo, useState } from 'react';
import useCrud from '../../hooks/useCrud';
import api from '../../utils/api';
import { Card, Row, Col, Form, InputGroup, Button, Table, Modal } from 'react-bootstrap';
import { Search, Users, UserCheck, UserX, MapPin, Phone, ToggleLeft, ToggleRight, Calendar, Plus, Edit3 } from 'lucide-react';

const emptyForm = { full_name: '', username: '', phone: '', purok: '', password: '' };

const statusVariant = {
  1: { bg: '#dcfce7', color: '#14532d', border: '#86efac', label: 'Active'   },
  0: { bg: '#f3f4f6', color: '#374151', border: '#d1d5db', label: 'Inactive' },
};

const StatusPill = ({ active }) => {
  const sv = statusVariant[active ? 1 : 0];
  return (
    <span style={{
      display: 'inline-block', backgroundColor: sv.bg, color: sv.color,
      border: `1px solid ${sv.border}`, fontWeight: 700, fontSize: 11,
      padding: '4px 12px', borderRadius: 999, letterSpacing: '0.02em',
    }}>
      {sv.label}
    </span>
  );
};

const RegisteredUsers = () => {
  const { items: users, loading, refresh, error } = useCrud('/auth/users');
  const [query, setQuery]         = useState('');
  const [filter, setFilter]       = useState('all');
  const [showView, setShowView]   = useState(null);
  const [toggling, setToggling]   = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [formErr, setFormErr]     = useState('');
  const [saving, setSaving]       = useState(false);

  React.useEffect(() => {
    console.log('[RegisteredUsers] Users loaded:', users.length, 'Loading:', loading, 'Error:', error);
  }, [users, loading, error]);

  React.useEffect(() => {
    socket.on('user-created', () => {
      console.log('[Socket] New user created, refreshing list...');
      refresh();
    });

    return () => {
      socket.off('user-created');
    };
  }, [refresh]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErr('');
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditingId(u.id);
    setForm({ full_name: u.full_name, username: u.username, phone: u.phone || '', purok: u.purok || '', password: '' });
    setFormErr('');
    setShowView(null);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormErr('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (editingId) {
        await api.put(`/auth/users/${editingId}`, payload);
      } else {
        await api.post('/auth/users', payload);
      }
      await refresh();
      setShowForm(false);
    } catch (err) {
      setFormErr(err.message || 'Failed to save.');
    }
    setSaving(false);
  };

  const counts = useMemo(() => ({
    all:      users.length,
    active:   users.filter((u) => u.is_active).length,
    inactive: users.filter((u) => !u.is_active).length,
  }), [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const matchStatus = filter === 'all' || (filter === 'active' ? u.is_active : !u.is_active);
      const matchQuery  = !q || u.full_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || (u.purok || '').toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [users, query, filter]);

  const handleToggle = async (u) => {
    setToggling(u.id);
    try {
      await api.patch(`/auth/users/${u.id}/toggle`);
      await refresh();
    } catch { /* silently ignore */ }
    setToggling(null);
  };

  const summaryCards = [
    { key: 'all',      label: 'Total Users',    icon: <Users size={18} />,     bg: '#dbeafe', color: '#1d4ed8' },
    { key: 'active',   label: 'Active',         icon: <UserCheck size={18} />, bg: '#dcfce7', color: '#15803d' },
    { key: 'inactive', label: 'Inactive',       icon: <UserX size={18} />,     bg: '#fee2e2', color: '#b91c1c' },
  ];

  return (
    <div className="p-4" style={{ backgroundColor: '#f8fafc' }}>

      {/* Summary cards */}
      <Row className="g-2 g-md-3 mb-4">
        {summaryCards.map((c) => (
          <Col key={c.key} xs={6} md={4}>
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
                <div className="d-flex align-items-center justify-content-center rounded-3"
                  style={{ width: 38, height: 38, backgroundColor: c.bg, color: c.color }}>
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
              {[
                { key: 'all',      label: 'All' },
                { key: 'active',   label: 'Active' },
                { key: 'inactive', label: 'Inactive' },
              ].map((t) => (
                <Button key={t.key} size="sm" onClick={() => setFilter(t.key)} className="border-0"
                  style={{ backgroundColor: filter === t.key ? '#1d4ed8' : '#f3f4f6', color: filter === t.key ? '#fff' : '#374151', fontWeight: 600, fontSize: 12 }}>
                  {t.label} <span style={{ opacity: 0.75 }}>({counts[t.key]})</span>
                </Button>
              ))}
            </div>
            <div className="ms-auto d-flex align-items-center gap-2">
              <InputGroup size="sm" style={{ maxWidth: 260, minWidth: 140 }}>
                <InputGroup.Text className="bg-light border-end-0"><Search size={14} color="#9ca3af" /></InputGroup.Text>
                <Form.Control className="bg-light border-start-0" placeholder="Search name, username, purok..."
                  value={query} onChange={(e) => setQuery(e.target.value)} style={{ fontSize: 13 }} />
              </InputGroup>
              <Button size="sm" className="border-0 d-flex align-items-center gap-1"
                style={{ backgroundColor: '#1d4ed8', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
                onClick={openAdd}>
                <Plus size={14} /> Add User
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Desktop Table */}
      <Card className="border rounded-4 d-none d-md-block" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <Card.Body className="p-0">
          <Table hover className="mb-0 align-middle">
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th className="px-4 py-3">Resident</th>
                <th className="py-3">Username</th>
                <th className="py-3">Phone</th>
                <th className="py-3">Purok</th>
                <th className="py-3">Registered</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13 }}>
              {loading && (
                <tr><td colSpan={7} className="text-center py-5" style={{ color: '#9ca3af' }}>Loading...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-5" style={{ color: '#9ca3af' }}>No users found.</td></tr>
              )}
              {filtered.map((u) => (
                <tr key={u.id} onClick={() => setShowView(u)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f7ff'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}>
                  <td className="px-4 py-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
                        style={{ width: 32, height: 32, backgroundColor: '#1d4ed8', fontSize: 11, flexShrink: 0 }}>
                        {u.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                      </div>
                      <span className="fw-semibold" style={{ color: '#111827' }}>{u.full_name}</span>
                    </div>
                  </td>
                  <td className="py-3" style={{ color: '#6b7280' }}>@{u.username}</td>
                  <td className="py-3" style={{ color: '#374151' }}>{u.phone || '—'}</td>
                  <td className="py-3" style={{ color: '#374151' }}>{u.purok || '—'}</td>
                  <td className="py-3" style={{ color: '#6b7280' }}>
                    {new Date(u.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-3"><StatusPill active={u.is_active} /></td>
                  <td className="py-3 text-end pe-4" onClick={(e) => e.stopPropagation()}>
                    <div className="d-flex align-items-center justify-content-end gap-1">
                      <Button size="sm" variant="light" className="border-0 p-1 px-2"
                        onClick={() => openEdit(u)} title="Edit">
                        <Edit3 size={14} color="#1d4ed8" />
                      </Button>
                      <Button size="sm" variant="light" className="border-0 p-1 px-2"
                        disabled={toggling === u.id}
                        onClick={() => handleToggle(u)}
                        title={u.is_active ? 'Deactivate' : 'Activate'}>
                        {u.is_active
                          ? <ToggleRight size={16} color="#16a34a" />
                          : <ToggleLeft  size={16} color="#9ca3af" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Mobile cards */}
      <div className="d-md-none">
        {filtered.length === 0 ? (
          <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-4 text-center" style={{ color: '#9ca3af' }}>
              <Users size={32} className="mb-2" /><div style={{ fontSize: 14 }}>No users found.</div>
            </Card.Body>
          </Card>
        ) : filtered.map((u) => (
          <Card key={u.id} className="border rounded-4 mb-2"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer' }}
            onClick={() => setShowView(u)}>
            <Card.Body className="p-3">
              <div className="d-flex align-items-center gap-3 mb-2">
                <div className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold flex-shrink-0"
                  style={{ width: 44, height: 44, backgroundColor: '#1d4ed8', fontSize: 14 }}>
                  {u.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold text-truncate" style={{ fontSize: 14, color: '#111827' }}>{u.full_name}</span>
                    <StatusPill active={u.is_active} />
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>@{u.username} · {u.purok || '—'}</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>

      {/* View Modal */}
      <Modal show={!!showView} onHide={() => setShowView(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }}>User Profile</Modal.Title>
        </Modal.Header>
        {showView && (<>
          <Modal.Body>
            <div className="d-flex align-items-center gap-3 mb-4">
              <div className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
                style={{ width: 56, height: 56, backgroundColor: '#1d4ed8', fontSize: 18 }}>
                {showView.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
              </div>
              <div>
                <div className="fw-bold" style={{ fontSize: 17 }}>{showView.full_name}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>@{showView.username}</div>
              </div>
              <div className="ms-auto"><StatusPill active={showView.is_active} /></div>
            </div>
            <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
              <div className="d-flex align-items-center gap-2"><Phone size={14} color="#6b7280" /> <strong>Phone:</strong> {showView.phone || '—'}</div>
              <div className="d-flex align-items-center gap-2"><MapPin size={14} color="#6b7280" /> <strong>Purok:</strong> {showView.purok || '—'}</div>
              <div className="d-flex align-items-center gap-2"><Calendar size={14} color="#6b7280" /> <strong>Registered:</strong> {new Date(showView.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </Modal.Body>
          <Modal.Footer className="justify-content-between">
            <Button size="sm" variant="light" className="border-0 d-flex align-items-center gap-1"
              disabled={toggling === showView.id}
              onClick={() => handleToggle(showView)}>
              {showView.is_active
                ? <><ToggleRight size={15} color="#16a34a" /> Deactivate</>
                : <><ToggleLeft  size={15} color="#9ca3af" /> Activate</>}
            </Button>
            <div className="d-flex gap-2">
              <Button size="sm" className="border-0 d-flex align-items-center gap-1"
                style={{ backgroundColor: '#1d4ed8' }}
                onClick={() => openEdit(showView)}>
                <Edit3 size={13} /> Edit
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowView(null)}>Close</Button>
            </div>
          </Modal.Footer>
        </>)}
      </Modal>

      {/* Add / Edit User Modal */}
      <Modal show={showForm} onHide={() => setShowForm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }}>
            {editingId ? <><Edit3 size={16} className="me-2" style={{ color: '#1d4ed8' }} />Edit User</> : <><Plus size={16} className="me-2" style={{ color: '#1d4ed8' }} />Add User</>}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {formErr && (
              <div className="mb-3 p-2 rounded-3" style={{ backgroundColor: '#fee2e2', color: '#991b1b', fontSize: 13 }}>
                {formErr}
              </div>
            )}
            <Row className="g-3">
              <Col xs={12}>
                <Form.Group>
                  <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Full Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control size="sm" style={{ fontSize: 13 }} required
                    value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="e.g. Juan dela Cruz" />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Username <span className="text-danger">*</span></Form.Label>
                  <Form.Control size="sm" style={{ fontSize: 13 }} required
                    value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="e.g. juandelacruz" />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>
                    Password {editingId && <span style={{ fontWeight: 400, color: '#6b7280' }}>(leave blank to keep)</span>}
                    {!editingId && <span className="text-danger"> *</span>}
                  </Form.Label>
                  <Form.Control size="sm" type="password" style={{ fontSize: 13 }}
                    required={!editingId}
                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingId ? 'Leave blank to keep' : 'Enter password'} />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Phone</Form.Label>
                  <Form.Control size="sm" style={{ fontSize: 13 }}
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. 09XX-XXX-XXXX" />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Purok</Form.Label>
                  <Form.Control size="sm" style={{ fontSize: 13 }}
                    value={form.purok} onChange={(e) => setForm({ ...form, purok: e.target.value })}
                    placeholder="e.g. Purok 3" />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button size="sm" variant="light" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" type="submit" className="border-0"
              style={{ backgroundColor: '#1d4ed8' }} disabled={saving}>
              {saving ? 'Saving…' : (editingId ? 'Save Changes' : 'Create User')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default RegisteredUsers;
