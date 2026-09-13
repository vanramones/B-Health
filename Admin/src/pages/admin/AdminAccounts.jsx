import React, { useMemo, useState } from 'react';
import {
  Card, Row, Col, Form, InputGroup, Button, Table, Modal, Alert,
} from 'react-bootstrap';
import {
  Search, Plus, Eye, EyeOff, Edit3, Trash2, ShieldCheck, ShieldOff, Shield,
  UserCog, Stethoscope, HeartPulse, Crown, Power, User as UserIcon, Mail, Lock,
  Users as UsersIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ROLE_OPTIONS = ['Super Admin', 'Health Administrator', 'Doctor', 'Nurse', 'Staff', 'Encoder'];

const roleStyle = {
  'Super Admin':          { bg: '#fef3c7', color: '#92400e', icon: <Crown size={11} /> },
  'Health Administrator': { bg: '#ccfbf1', color: '#0f766e', icon: <ShieldCheck size={11} /> },
  'Doctor':               { bg: '#dbeafe', color: '#1d4ed8', icon: <Stethoscope size={11} /> },
  'Nurse':                { bg: '#fce7f3', color: '#9d174d', icon: <HeartPulse size={11} /> },
  'Staff':                { bg: '#e0e7ff', color: '#3730a3', icon: <UserCog size={11} /> },
  'Encoder':              { bg: '#ecfccb', color: '#365314', icon: <UserCog size={11} /> },
};

const RolePill = ({ role }) => {
  const s = roleStyle[role] || roleStyle.Staff;
  return (
    <span
      className="d-inline-flex align-items-center gap-1"
      style={{
        backgroundColor: s.bg,
        color: s.color,
        fontWeight: 600,
        fontSize: 11,
        padding: '4px 10px',
        borderRadius: 999,
      }}
    >
      {s.icon} {role}
    </span>
  );
};

const StatusPill = ({ active }) => (
  <span
    className="d-inline-flex align-items-center gap-1"
    style={{
      backgroundColor: active ? '#bfdbfe' : '#fecaca',
      color: active ? '#14532d' : '#7f1d1d',
      border: `1px solid ${active ? '#22c55e' : '#ef4444'}`,
      fontWeight: 700,
      fontSize: 11,
      padding: '3px 10px',
      borderRadius: 999,
    }}
  >
    <span
      className="rounded-circle d-inline-block"
      style={{ width: 6, height: 6, backgroundColor: active ? '#22c55e' : '#ef4444' }}
    />
    {active ? 'Active' : 'Inactive'}
  </span>
);

const emptyForm = {
  username: '',
  password: '',
  name: '',
  email: '',
  role: 'Staff',
  active: true,
};

const AdminAccounts = () => {
  const { user, admins, addAdmin, updateAdmin, deleteAdmin, toggleAdminActive } = useAuth();

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null); // { type:'success'|'error', msg }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return admins.filter((a) => {
      const matchRole = roleFilter === 'all' || a.role === roleFilter;
      const matchQuery =
        !q ||
        a.username.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q);
      return matchRole && matchQuery;
    });
  }, [admins, query, roleFilter]);

  const counts = useMemo(() => ({
    total:    admins.length,
    active:   admins.filter((a) => a.active).length,
    inactive: admins.filter((a) => !a.active).length,
    super:    admins.filter((a) => a.owner || a.role === 'Super Admin').length,
  }), [admins]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setShowPwd(false);
    setShowForm(true);
  };

  const openEdit = (a) => {
    setEditingId(a.id);
    setForm({
      username: a.username,
      password: '', // leave blank → don't change
      name: a.name,
      email: a.email || '',
      role: a.role,
      active: a.active,
    });
    setFormError('');
    setShowPwd(false);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
  };

  const flash = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (editingId) {
      const payload = { ...form };
      if (!payload.password) delete payload.password; // keep existing pwd
      const res = await updateAdmin(editingId, payload);
      if (!res.ok) { setFormError(res.error); return; }
      flash('success', `Admin "${form.name}" updated.`);
    } else {
      const res = await addAdmin(form);
      if (!res.ok) { setFormError(res.error); return; }
      flash('success', `Admin "${form.name}" added.`);
    }
    closeForm();
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const res = await deleteAdmin(confirmDelete.id);
    if (!res.ok) {
      flash('error', res.error);
    } else {
      flash('success', `Admin "${confirmDelete.name}" deleted.`);
    }
    setConfirmDelete(null);
  };

  const handleToggle = async (a) => {
    const res = await toggleAdminActive(a.id);
    if (!res.ok) flash('error', res.error);
  };

  const editingAdmin = admins.find((a) => a.id === editingId);
  const editingIsOwner = !!editingAdmin?.owner;
  const editingIsSelf = !!user && !!editingAdmin && user.id === editingAdmin.id;

  const summaryCards = [
    { key: 'total',    label: 'Total Admins',  icon: <UsersIcon size={18} />,    value: counts.total,    bg: '#dbeafe', color: '#1d4ed8' },
    { key: 'active',   label: 'Active',         icon: <ShieldCheck size={18} />,  value: counts.active,   bg: '#bfdbfe', color: '#14532d' },
    { key: 'inactive', label: 'Inactive',       icon: <ShieldOff size={18} />,    value: counts.inactive, bg: '#fecaca', color: '#7f1d1d' },
    { key: 'super',    label: 'Super Admins',   icon: <Crown size={18} />,        value: counts.super,    bg: '#fef3c7', color: '#92400e' },
  ];

  return (
    <div className="p-4" style={{ backgroundColor: '#f8fafc' }}>
      {/* Toast */}
      {toast && (
        <Alert
          variant={toast.type === 'success' ? 'success' : 'danger'}
          onClose={() => setToast(null)}
          dismissible
          className="border-0 rounded-3 mb-3"
          style={{ fontSize: 13 }}
        >
          {toast.msg}
        </Alert>
      )}

      {/* Stat summary */}
      <Row className="g-2 g-md-3 mb-4 bh-stagger">
        {summaryCards.map((c) => (
          <Col key={c.key} xs={6} lg={3}>
            <Card className="border rounded-4 bh-card-hover" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <Card.Body className="p-3 d-flex justify-content-between align-items-center">
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{c.label}</div>
                  <div className="fw-bold" style={{ fontSize: 26, color: '#111827', lineHeight: 1.1 }}>{c.value}</div>
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
              {['all', ...ROLE_OPTIONS].map((r) => {
                const active = roleFilter === r;
                const count = r === 'all' ? admins.length : admins.filter((a) => a.role === r).length;
                return (
                  <Button
                    key={r}
                    size="sm"
                    onClick={() => setRoleFilter(r)}
                    className="border-0"
                    style={{
                      backgroundColor: active ? '#0f766e' : '#f3f4f6',
                      color: active ? '#fff' : '#374151',
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {r === 'all' ? 'All' : r}
                    <span className="ms-1" style={{ opacity: 0.8 }}>({count})</span>
                  </Button>
                );
              })}
            </div>
            <div className="ms-auto d-flex align-items-center gap-2">
              <InputGroup size="sm" style={{ width: 260 }}>
                <InputGroup.Text className="bg-light border-end-0">
                  <Search size={14} color="#9ca3af" />
                </InputGroup.Text>
                <Form.Control
                  className="bg-light border-start-0"
                  placeholder="Search by name, username, email..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{ fontSize: 13 }}
                />
              </InputGroup>
              <Button
                size="sm"
                onClick={openAdd}
                className="d-flex align-items-center gap-1 border-0 fw-semibold"
                style={{
                  background: 'linear-gradient(135deg, #14b8a6, #0f766e)',
                  fontSize: 12,
                  boxShadow: '0 2px 8px rgba(15, 118, 110, 0.3)',
                }}
              >
                <Plus size={14} /> Add Admin
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
                <th className="px-4 py-3">Admin</th>
                <th className="py-3">Username</th>
                <th className="py-3">Role</th>
                <th className="py-3">Status</th>
                <th className="py-3">Created</th>
                <th className="py-3 text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13 }}>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-5" style={{ color: '#9ca3af' }}>
                    No admin accounts found.
                  </td>
                </tr>
              )}
              {filtered.map((a) => {
                const isSelf = user && user.id === a.id;
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
                          style={{
                            width: 36, height: 36,
                            background: 'linear-gradient(135deg, #5eead4, #14b8a6 60%, #0f766e)',
                            fontSize: 12,
                          }}
                        >
                          {a.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="d-flex align-items-center gap-1 fw-semibold" style={{ color: '#111827' }}>
                            {a.name}
                            {a.owner && (
                              <span
                                className="d-inline-flex align-items-center gap-1"
                                style={{
                                  fontSize: 9, fontWeight: 700, color: '#92400e',
                                  backgroundColor: '#fef3c7', padding: '1px 6px',
                                  borderRadius: 999, letterSpacing: '0.05em',
                                }}
                              >
                                <Crown size={9} /> OWNER
                              </span>
                            )}
                            {isSelf && (
                              <span
                                style={{
                                  fontSize: 9, fontWeight: 700, color: '#0f766e',
                                  backgroundColor: '#ccfbf1', padding: '1px 6px',
                                  borderRadius: 999, letterSpacing: '0.05em',
                                }}
                              >
                                YOU
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>{a.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3" style={{ color: '#374151', fontWeight: 500, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                      {a.username}
                    </td>
                    <td className="py-3"><RolePill role={a.role} /></td>
                    <td className="py-3"><StatusPill active={a.active} /></td>
                    <td className="py-3" style={{ color: '#6b7280', fontSize: 12 }}>
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-end pe-4">
                      <div className="d-flex justify-content-end gap-1">
                        <Button
                          size="sm" variant="light"
                          className="border-0 p-1 px-2"
                          onClick={() => openEdit(a)}
                          title="Edit"
                        >
                          <Edit3 size={14} color="#1d4ed8" />
                        </Button>
                        <Button
                          size="sm" variant="light"
                          className="border-0 p-1 px-2"
                          onClick={() => handleToggle(a)}
                          disabled={a.owner || isSelf}
                          title={a.active ? 'Deactivate' : 'Activate'}
                        >
                          <Power size={14} color={a.owner || isSelf ? '#9ca3af' : (a.active ? '#dc2626' : '#16a34a')} />
                        </Button>
                        <Button
                          size="sm" variant="light"
                          className="border-0 p-1 px-2"
                          onClick={() => setConfirmDelete(a)}
                          disabled={a.owner || isSelf}
                          title={a.owner ? 'Owner cannot be deleted' : (isSelf ? 'Cannot delete yourself' : 'Delete')}
                        >
                          <Trash2 size={14} color={a.owner || isSelf ? '#9ca3af' : '#dc2626'} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Add / Edit Modal */}
      <Modal show={showForm} onHide={closeForm} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }} className="d-flex align-items-center gap-2">
            <span
              className="d-flex align-items-center justify-content-center rounded-3"
              style={{ width: 30, height: 30, backgroundColor: '#ccfbf1', color: '#0f766e' }}
            >
              {editingId ? <Edit3 size={15} /> : <Plus size={16} />}
            </span>
            {editingId ? 'Edit Admin Account' : 'Add Admin Account'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {editingIsOwner && (
              <Alert variant="warning" className="border-0 rounded-3 py-2 mb-3" style={{ fontSize: 12 }}>
                <Crown size={12} className="me-1" />
                This is the <strong>owner</strong> account. Role and status are locked.
              </Alert>
            )}
            {editingIsSelf && !editingIsOwner && (
              <Alert variant="info" className="border-0 rounded-3 py-2 mb-3" style={{ fontSize: 12 }}>
                You are editing your own signed-in account. Status cannot be changed here.
              </Alert>
            )}
            {formError && (
              <Alert variant="danger" className="border-0 rounded-3 py-2 mb-3" style={{ fontSize: 13 }}>
                {formError}
              </Alert>
            )}

            <Row className="g-2 mb-3">
              <Col xs={12}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Full Name</Form.Label>
                <InputGroup size="sm">
                  <InputGroup.Text className="bg-light border-end-0">
                    <UserIcon size={13} color="#6b7280" />
                  </InputGroup.Text>
                  <Form.Control
                    className="border-start-0"
                    placeholder="Juan Dela Cruz"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </InputGroup>
              </Col>
            </Row>

            <Row className="g-2 mb-3">
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Username</Form.Label>
                <Form.Control
                  size="sm"
                  placeholder="juan.cruz"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  disabled={editingIsOwner}
                />
              </Col>
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Email</Form.Label>
                <InputGroup size="sm">
                  <InputGroup.Text className="bg-light border-end-0">
                    <Mail size={13} color="#6b7280" />
                  </InputGroup.Text>
                  <Form.Control
                    type="email"
                    className="border-start-0"
                    placeholder="email@brgyhc.gov.ph"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </InputGroup>
              </Col>
            </Row>

            <Row className="g-2 mb-3">
              <Col xs={editingIsOwner ? 12 : 6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>
                  {editingId ? 'New Password (leave blank to keep)' : 'Password'}
                </Form.Label>
                <InputGroup size="sm">
                  <InputGroup.Text className="bg-light border-end-0">
                    <Lock size={13} color="#6b7280" />
                  </InputGroup.Text>
                  <Form.Control
                    type={showPwd ? 'text' : 'password'}
                    className="border-start-0 border-end-0"
                    placeholder={editingId ? '••••••••' : 'At least 6 characters'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required={!editingId}
                    minLength={editingId ? undefined : 6}
                  />
                  <Button
                    type="button"
                    variant="light"
                    className="border border-start-0"
                    onClick={() => setShowPwd((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff size={13} color="#6b7280" /> : <Eye size={13} color="#6b7280" />}
                  </Button>
                </InputGroup>
              </Col>
              {!editingIsOwner && (
                <Col xs={6}>
                  <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Role</Form.Label>
                  <Form.Select
                    size="sm"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </Form.Select>
                </Col>
              )}
            </Row>

            {!editingIsOwner && !editingIsSelf && (
              <Form.Check
                type="switch"
                id="admin-active-switch"
                label={
                  <span style={{ fontSize: 13, color: '#374151' }}>
                    Account is <strong>{form.active ? 'Active' : 'Inactive'}</strong>
                  </span>
                }
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" size="sm" onClick={closeForm}>Cancel</Button>
            <Button
              type="submit"
              size="sm"
              className="border-0 fw-semibold"
              style={{
                background: 'linear-gradient(135deg, #14b8a6, #0f766e)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(15, 118, 110, 0.3)',
              }}
            >
              {editingId ? 'Save Changes' : 'Create Admin'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete confirm */}
      <Modal show={!!confirmDelete} onHide={() => setConfirmDelete(null)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 15 }}>Delete Admin?</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ fontSize: 13 }}>
          Are you sure you want to delete the admin account for <strong>{confirmDelete?.name}</strong> (<code>{confirmDelete?.username}</code>)? This cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button size="sm" className="border-0" style={{ backgroundColor: '#dc2626' }} onClick={handleConfirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminAccounts;
