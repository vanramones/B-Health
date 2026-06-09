import React, { useMemo, useState } from 'react';
import useCrud from '../../hooks/useCrud';
import { Card, Row, Col, Form, InputGroup, Button, Modal } from 'react-bootstrap';
import {
  Search, Edit3, Heart, Baby, Syringe, Users, Stethoscope, Bug, HandHeart,
  Accessibility, Activity, Sparkles, Calendar, Clock, MapPin, Power, Plus, Trash2,
} from 'lucide-react';

const iconMap = {
  heart: Heart, baby: Baby, syringe: Syringe, users: Users, stethoscope: Stethoscope,
  bug: Bug, 'hand-heart': HandHeart, accessibility: Accessibility, activity: Activity,
  sparkles: Sparkles,
};

const ServiceIcon = ({ name, accent, size = 22 }) => {
  const Comp = iconMap[name] || Heart;
  return (
    <div
      className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
      style={{ width: 44, height: 44, backgroundColor: `${accent}1a`, color: accent }}
    >
      <Comp size={size} />
    </div>
  );
};

const accentPalette = [
  '#16a34a', '#3b82f6', '#ec4899', '#f472b6', '#a855f7', '#0ea5e9',
  '#84cc16', '#f59e0b', '#8b5cf6', '#dc2626', '#06b6d4',
];

const iconChoices = Object.keys(iconMap);

const emptyForm = {
  id: null, name: '', category: 'General', icon: 'heart', accent: '#16a34a',
  description: '', beneficiaries: 0, schedule: '', location: '', staff: '', slots_per_hour: 5, active: true,
};

const Services = () => {
  const { items: rawItems, loading, createItem, updateItem, deleteItem } = useCrud('/services');
  const items = rawItems.map((s) => ({ ...s, active: s.is_active !== undefined ? !!s.is_active : s.active }));
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [showView, setShowView] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [formError, setFormError] = useState(null);

  const categories = useMemo(() => {
    const set = new Set(items.map((s) => s.category));
    return ['all', ...Array.from(set)];
  }, [items]);

  const counts = useMemo(() => {
    const c = { all: items.length };
    items.forEach((s) => { c[s.category] = (c[s.category] || 0) + 1; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((s) => {
      const matchCat = category === 'all' || s.category === category;
      const matchQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [items, category, query]);

  const totalBeneficiaries = useMemo(
    () => items.reduce((s, x) => s + x.beneficiaries, 0),
    [items],
  );
  const activeCount = useMemo(() => items.filter((s) => s.active).length, [items]);

  const toggleActive = async (id) => {
    const svc = items.find((s) => s.id === id);
    await updateItem(id, { is_active: svc?.active ? 0 : 1 });
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditingId(s.id);
    setForm({ ...s });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name) {
      setFormError('Service name is required');
      return;
    }
    try {
      const payload = { ...form, is_active: form.active ? 1 : 0 };
      if (editingId) {
        await updateItem(editingId, payload);
      } else {
        await createItem(payload);
      }
      closeForm();
    } catch (err) {
      setFormError(err.message || 'Failed to save service');
    }
  };

  const handleDelete = async () => {
    if (confirmDelete) {
      await deleteItem(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="p-4" style={{ backgroundColor: '#f8fafc' }}>
      {/* Stat Summary */}
      <Row className="g-2 g-md-3 mb-4 bh-stagger">
        <Col xs={6} md={4}>
          <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-3 d-flex justify-content-between align-items-center">
              <div>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Total Services</div>
                <div className="fw-bold" style={{ fontSize: 26, color: '#111827', lineHeight: 1.1 }}>{items.length}</div>
              </div>
              <div className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: 38, height: 38, backgroundColor: '#dbeafe', color: '#1d4ed8' }}>
                <Heart size={18} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={4}>
          <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-3 d-flex justify-content-between align-items-center">
              <div>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Active Services</div>
                <div className="fw-bold" style={{ fontSize: 26, color: '#111827', lineHeight: 1.1 }}>{activeCount}</div>
              </div>
              <div className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: 38, height: 38, backgroundColor: '#bfdbfe', color: '#14532d' }}>
                <Activity size={18} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={4}>
          <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-3 d-flex justify-content-between align-items-center">
              <div>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Total Beneficiaries</div>
                <div className="fw-bold" style={{ fontSize: 26, color: '#111827', lineHeight: 1.1 }}>{totalBeneficiaries.toLocaleString()}</div>
              </div>
              <div className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: 38, height: 38, backgroundColor: '#fce7f3', color: '#be185d' }}>
                <Users size={18} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Toolbar */}
      <Card className="border rounded-4 mb-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <Card.Body className="p-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="d-flex flex-wrap gap-1">
              {categories.map((c) => {
                const active = category === c;
                return (
                  <Button
                    key={c}
                    size="sm"
                    onClick={() => setCategory(c)}
                    className="border-0"
                    style={{
                      backgroundColor: active ? '#15803d' : '#f3f4f6',
                      color: active ? '#fff' : '#374151',
                      fontWeight: 600,
                      fontSize: 12,
                      textTransform: 'capitalize',
                    }}
                  >
                    {c} <span className="ms-1" style={{ opacity: 0.8 }}>({counts[c] || 0})</span>
                  </Button>
                );
              })}
            </div>
            <div className="ms-auto d-flex align-items-center gap-2 mt-2 mt-md-0">
              <InputGroup size="sm" className="flex-grow-1" style={{ maxWidth: 240, minWidth: 120 }}>
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
                <Plus size={14} /> <span className="d-none d-sm-inline">Add Service</span>
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Services Grid */}
      {filtered.length === 0 ? (
        <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Card.Body className="p-5 text-center" style={{ color: '#9ca3af' }}>No services found.</Card.Body>
        </Card>
      ) : (
        <Row className="g-2 g-md-3 bh-stagger">
          {filtered.map((s) => (
            <Col key={s.id} xs={12} md={6} lg={4}>
              <Card
                className="border rounded-4 h-100 bh-card-hover"
                style={{
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  opacity: s.active ? 1 : 0.6,
                  transition: 'opacity 0.2s ease',
                  cursor: 'pointer',
                }}
                onClick={() => openEdit(s)}
              >
                <Card.Body className="p-4 d-flex flex-column">
                  <div className="d-flex align-items-start gap-3 mb-3">
                    <ServiceIcon name={s.icon} accent={s.accent} />
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="fw-bold text-truncate" style={{ fontSize: 15, color: '#111827' }}>
                        {s.name}
                      </div>
                      <span
                        className="d-inline-block mt-1"
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: s.accent,
                          backgroundColor: `${s.accent}1a`,
                          padding: '2px 8px',
                          borderRadius: 999,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {s.category}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: s.active ? '#14532d' : '#1f2937',
                        backgroundColor: s.active ? '#bfdbfe' : '#e5e7eb',
                        border: `1px solid ${s.active ? '#22c55e' : '#9ca3af'}`,
                        padding: '3px 10px',
                        borderRadius: 999,
                        textTransform: 'uppercase',
                      }}
                    >
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <p style={{ fontSize: 12.5, color: '#4b5563', lineHeight: 1.5, marginBottom: 14, minHeight: 56 }}>
                    {s.description}
                  </p>

                  <div className="d-flex align-items-center justify-content-between mb-3 pb-3"
                    style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Beneficiaries</div>
                      <div className="fw-bold" style={{ fontSize: 20, color: '#111827', lineHeight: 1.1 }}>{s.beneficiaries}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Slots/Hour</div>
                      <div className="fw-bold" style={{ fontSize: 20, color: s.accent, lineHeight: 1.1 }}>{s.slots_per_hour ?? 5}</div>
                    </div>
                    <div className="text-end" style={{ maxWidth: '40%' }}>
                      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Schedule</div>
                      <div className="text-truncate" style={{ fontSize: 11, color: '#4b5563', fontWeight: 500 }} title={s.schedule}>
                        {s.schedule}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto d-flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="light"
                      className="border-0 flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                      onClick={() => openEdit(s)}
                      style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>
                      <Edit3 size={13} /> Edit
                    </Button>
                    <Button size="sm" variant="light"
                      className="border-0 d-flex align-items-center justify-content-center"
                      onClick={() => toggleActive(s.id)}
                      title={s.active ? 'Deactivate' : 'Activate'}
                      style={{ width: 36 }}>
                      <Power size={13} color={s.active ? '#dc2626' : '#16a34a'} />
                    </Button>
                    <Button size="sm" variant="light"
                      className="border-0 d-flex align-items-center justify-content-center"
                      onClick={() => setConfirmDelete(s)}
                      title="Delete"
                      style={{ width: 36 }}>
                      <Trash2 size={13} color="#dc2626" />
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* View Modal */}
      <Modal show={!!showView} onHide={() => setShowView(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }}>Service Details</Modal.Title>
        </Modal.Header>
        {showView && (
          <Modal.Body>
            <div className="d-flex align-items-center gap-3 mb-3">
              <ServiceIcon name={showView.icon} accent={showView.accent} size={26} />
              <div className="flex-grow-1">
                <div className="fw-bold" style={{ fontSize: 16 }}>{showView.name}</div>
                <span
                  className="d-inline-block mt-1"
                  style={{
                    fontSize: 10, fontWeight: 700, color: showView.accent,
                    backgroundColor: `${showView.accent}1a`, padding: '2px 8px',
                    borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}
                >
                  {showView.category}
                </span>
              </div>
              <span
                style={{
                  fontSize: 10, fontWeight: 700,
                  color: showView.active ? '#14532d' : '#1f2937',
                  backgroundColor: showView.active ? '#bfdbfe' : '#e5e7eb',
                  border: `1px solid ${showView.active ? '#22c55e' : '#9ca3af'}`,
                  padding: '3px 10px', borderRadius: 999, textTransform: 'uppercase',
                }}
              >
                {showView.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{showView.description}</p>
            <hr />
            <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
              <div className="d-flex align-items-center gap-2"><Users size={14} color="#6b7280" /> <strong>Beneficiaries:</strong> {showView.beneficiaries}</div>
              <div className="d-flex align-items-center gap-2"><Clock size={14} color="#6b7280" /> <strong>Slots per Hour:</strong> {showView.slots_per_hour ?? 5}</div>
              <div className="d-flex align-items-center gap-2"><Calendar size={14} color="#6b7280" /> <strong>Schedule:</strong> {showView.schedule}</div>
              <div className="d-flex align-items-center gap-2"><MapPin size={14} color="#6b7280" /> <strong>Location:</strong> {showView.location}</div>
              <div className="d-flex align-items-center gap-2"><Stethoscope size={14} color="#6b7280" /> <strong>Staff:</strong> {showView.staff}</div>
            </div>
          </Modal.Body>
        )}
      </Modal>

      {/* Add / Edit Modal */}
      <Modal show={showForm} onHide={closeForm} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }}>{editingId ? 'Edit Service' : 'Add Service'}</Modal.Title>
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
            {/* Live preview */}
            <div className="d-flex align-items-center gap-3 mb-3 p-3 rounded-3"
              style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}>
              <ServiceIcon name={form.icon} accent={form.accent} />
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className="fw-bold text-truncate" style={{ fontSize: 14 }}>{form.name || 'New Service'}</div>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: form.accent,
                  backgroundColor: `${form.accent}1a`, padding: '2px 8px',
                  borderRadius: 999, textTransform: 'uppercase',
                }}>
                  {form.category || 'Category'}
                </span>
              </div>
            </div>

            <Row className="g-2 mb-3">
              <Col xs={8}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Service Name</Form.Label>
                <Form.Control size="sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </Col>
              <Col xs={4}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Category</Form.Label>
                <Form.Control size="sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Description</Form.Label>
              <Form.Control as="textarea" rows={2} size="sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Form.Group>

            <Row className="g-2 mb-3">
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Icon</Form.Label>
                <Form.Select size="sm" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
                  {iconChoices.map((k) => <option key={k} value={k}>{k}</option>)}
                </Form.Select>
              </Col>
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Accent Color</Form.Label>
                <div className="d-flex flex-wrap gap-1 pt-1">
                  {accentPalette.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, accent: c })}
                      className="border-0 rounded-circle"
                      style={{
                        width: 22, height: 22, backgroundColor: c,
                        outline: form.accent === c ? `2px solid ${c}` : 'none',
                        outlineOffset: 2,
                        cursor: 'pointer',
                      }}
                      title={c}
                    />
                  ))}
                </div>
              </Col>
            </Row>

            <Row className="g-2 mb-3">
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Beneficiaries</Form.Label>
                <Form.Control type="number" min={0} size="sm" value={form.beneficiaries} onChange={(e) => setForm({ ...form, beneficiaries: Number(e.target.value) })} />
              </Col>
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Status</Form.Label>
                <Form.Select size="sm" value={form.active ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, active: e.target.value === 'active' })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Form.Select>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Schedule</Form.Label>
              <Form.Control size="sm" placeholder="e.g. Mon-Fri \u2022 8:00 AM - 5:00 PM" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} />
            </Form.Group>
            <Row className="g-2">
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Location</Form.Label>
                <Form.Control size="sm" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </Col>
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Staff</Form.Label>
                <Form.Control size="sm" value={form.staff} onChange={(e) => setForm({ ...form, staff: e.target.value })} />
              </Col>
            </Row>
            <Form.Group className="mt-3">
              <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Slots per Hour</Form.Label>
              <Form.Control
                type="number" min={1} max={100} size="sm"
                value={form.slots_per_hour}
                onChange={(e) => setForm({ ...form, slots_per_hour: Number(e.target.value) })}
              />
              <Form.Text style={{ fontSize: 11, color: '#6b7280' }}>
                Max number of appointments accepted per time slot for this service.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" size="sm" onClick={closeForm}>Cancel</Button>
            <Button type="submit" size="sm" className="border-0" style={{ backgroundColor: '#16a34a' }}>
              {editingId ? 'Save Changes' : 'Add Service'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirm */}
      <Modal show={!!confirmDelete} onHide={() => setConfirmDelete(null)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 15 }}>Delete Service?</Modal.Title>
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

export default Services;
