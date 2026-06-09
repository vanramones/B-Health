import React, { useMemo, useState } from 'react';
import useCrud from '../../hooks/useCrud';
import { Card, Row, Col, Form, InputGroup, Button, Table, Modal } from 'react-bootstrap';
import {
  Search, Plus, Eye, Edit3, Trash2, Users, UserCheck, Heart, AlertTriangle, Phone, MapPin,
} from 'lucide-react';


const statusVariant = {
  active:     { bg: '#bfdbfe', color: '#14532d', border: '#22c55e', label: 'Active'     },
  monitoring: { bg: '#fed7aa', color: '#7c2d12', border: '#f97316', label: 'Monitoring' },
  inactive:   { bg: '#e5e7eb', color: '#1f2937', border: '#9ca3af', label: 'Inactive'   },
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

const emptyForm = { name: '', age: '', gender: 'Male', address: '', contact: '', condition: 'Healthy', status: 'active' };

const Residents = () => {
  const { items, loading, createItem, updateItem, deleteItem } = useCrud('/residents');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showView, setShowView] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const counts = useMemo(() => ({
    all:        items.length,
    active:     items.filter((r) => r.status === 'active').length,
    monitoring: items.filter((r) => r.status === 'monitoring').length,
    inactive:   items.filter((r) => r.status === 'inactive').length,
  }), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((r) => {
      const matchStatus = filter === 'all' || r.status === filter;
      const matchQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        r.condition.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [items, filter, query]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({ ...r, age: String(r.age) });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.address) return;
    const payload = { ...form, age: Number(form.age) };
    if (editingId) {
      await updateItem(editingId, payload);
    } else {
      await createItem(payload);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async () => {
    if (confirmDelete) {
      await deleteItem(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const tabs = [
    { key: 'all',        label: 'All' },
    { key: 'active',     label: 'Active' },
    { key: 'monitoring', label: 'Monitoring' },
    { key: 'inactive',   label: 'Inactive' },
  ];

  const summaryCards = [
    { key: 'all',        label: 'Total Residents', icon: <Users size={18} />,        bg: '#dbeafe', color: '#1d4ed8' },
    { key: 'active',     label: 'Active',          icon: <UserCheck size={18} />,    bg: '#bfdbfe', color: '#14532d' },
    { key: 'monitoring', label: 'Monitoring',      icon: <AlertTriangle size={18} />, bg: '#fed7aa', color: '#7c2d12' },
    { key: 'inactive',   label: 'Inactive',        icon: <Heart size={18} />,        bg: '#e5e7eb', color: '#1f2937' },
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
            <div className="ms-auto d-flex align-items-center gap-2 mt-2 mt-md-0">
              <InputGroup size="sm" className="flex-grow-1" style={{ maxWidth: 260, minWidth: 140 }}>
                <InputGroup.Text className="bg-light border-end-0">
                  <Search size={14} color="#9ca3af" />
                </InputGroup.Text>
                <Form.Control
                  className="bg-light border-start-0"
                  placeholder="Search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{ fontSize: 13 }}
                />
              </InputGroup>
              <Button
                size="sm"
                onClick={openAdd}
                className="d-flex align-items-center gap-1 border-0 flex-shrink-0"
                style={{ backgroundColor: '#16a34a', fontWeight: 500, fontSize: 12 }}
              >
                <Plus size={14} /> <span className="d-none d-sm-inline">Add Resident</span>
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
                <th className="px-4 py-3">Resident</th>
                <th className="py-3">Age</th>
                <th className="py-3">Gender</th>
                <th className="py-3">Address</th>
                <th className="py-3">Condition</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13 }}>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-5" style={{ color: '#9ca3af' }}>
                    No residents found.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
                        style={{
                          width: 32, height: 32,
                          backgroundColor: r.gender === 'Female' ? '#ec4899' : '#3b82f6',
                          fontSize: 11,
                        }}
                      >
                        {r.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                      </div>
                      <span className="fw-semibold" style={{ color: '#111827' }}>{r.name}</span>
                    </div>
                  </td>
                  <td className="py-3" style={{ color: '#374151' }}>{r.age}</td>
                  <td className="py-3" style={{ color: '#374151' }}>{r.gender}</td>
                  <td className="py-3" style={{ color: '#6b7280' }}>{r.address}</td>
                  <td className="py-3" style={{ color: '#374151' }}>{r.condition}</td>
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
              <Users size={32} className="mb-2" />
              <div style={{ fontSize: 14 }}>No residents found.</div>
            </Card.Body>
          </Card>
        ) : (
          <Row className="g-2">
            {filtered.map((r) => (
              <Col key={r.id} xs={12}>
                <Card
                  className="border rounded-4 bh-card-hover"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                >
                  <Card.Body className="p-3">
                    <div className="d-flex align-items-start gap-3">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold flex-shrink-0"
                        style={{
                          width: 44, height: 44,
                          backgroundColor: r.gender === 'Female' ? '#ec4899' : '#3b82f6',
                          fontSize: 13,
                        }}
                      >
                        {r.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                      </div>
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="fw-bold text-truncate" style={{ fontSize: 14, color: '#111827' }}>{r.name}</span>
                          <StatusPill status={r.status} />
                        </div>
                        <div className="d-flex flex-wrap gap-2 mb-2" style={{ fontSize: 12, color: '#6b7280' }}>
                          <span>{r.age} yrs</span>
                          <span>•</span>
                          <span>{r.gender}</span>
                          <span>•</span>
                          <span>{r.condition}</span>
                        </div>
                        <div className="d-flex align-items-center gap-1 mb-2" style={{ fontSize: 12, color: '#6b7280' }}>
                          <MapPin size={12} />
                          <span className="text-truncate">{r.address}</span>
                        </div>
                        {r.contact && (
                          <div className="d-flex align-items-center gap-1" style={{ fontSize: 12, color: '#6b7280' }}>
                            <Phone size={12} />
                            <span>{r.contact}</span>
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
            ))}
          </Row>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal show={showForm} onHide={() => setShowForm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }}>{editingId ? 'Edit Resident' : 'Add Resident'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSave}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Full Name</Form.Label>
              <Form.Control size="sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Form.Group>
            <Row className="g-2 mb-3">
              <Col xs={4}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Age</Form.Label>
                <Form.Control type="number" min={0} max={130} size="sm" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required />
              </Col>
              <Col xs={4}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Gender</Form.Label>
                <Form.Select size="sm" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option>Male</option>
                  <option>Female</option>
                </Form.Select>
              </Col>
              <Col xs={4}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Status</Form.Label>
                <Form.Select size="sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="inactive">Inactive</option>
                </Form.Select>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Address</Form.Label>
              <Form.Control size="sm" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
            </Form.Group>
            <Row className="g-2">
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Contact</Form.Label>
                <Form.Control size="sm" placeholder="0917-..." value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </Col>
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Condition</Form.Label>
                <Form.Select size="sm" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                  <option>Healthy</option>
                  <option>Pediatric</option>
                  <option>Pregnant</option>
                  <option>Hypertension</option>
                  <option>Diabetes</option>
                  <option>Senior Care</option>
                  <option>Other</option>
                </Form.Select>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="border-0" style={{ backgroundColor: '#16a34a' }}>
              {editingId ? 'Save Changes' : 'Add Resident'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal show={!!showView} onHide={() => setShowView(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }}>Resident Profile</Modal.Title>
        </Modal.Header>
        {showView && (
          <Modal.Body>
            <div className="d-flex align-items-center gap-3 mb-3">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
                style={{
                  width: 52, height: 52,
                  backgroundColor: showView.gender === 'Female' ? '#ec4899' : '#3b82f6',
                  fontSize: 16,
                }}
              >
                {showView.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
              </div>
              <div>
                <div className="fw-bold" style={{ fontSize: 16 }}>{showView.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  {showView.age} years old &middot; {showView.gender}
                </div>
              </div>
              <div className="ms-auto"><StatusPill status={showView.status} /></div>
            </div>
            <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
              <div className="d-flex align-items-center gap-2"><MapPin size={14} color="#6b7280" /> <strong>Address:</strong> {showView.address}</div>
              <div className="d-flex align-items-center gap-2"><Phone size={14} color="#6b7280" /> <strong>Contact:</strong> {showView.contact || '—'}</div>
              <div className="d-flex align-items-center gap-2"><Heart size={14} color="#6b7280" /> <strong>Condition:</strong> {showView.condition}</div>
            </div>
          </Modal.Body>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal show={!!confirmDelete} onHide={() => setConfirmDelete(null)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 15 }}>Delete Resident?</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ fontSize: 13 }}>
          Are you sure you want to delete <strong>{confirmDelete?.name}</strong>? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button size="sm" className="border-0" style={{ backgroundColor: '#dc2626' }} onClick={handleDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Residents;
