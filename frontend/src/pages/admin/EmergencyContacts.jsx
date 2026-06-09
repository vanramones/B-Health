import React, { useMemo, useState } from 'react';
import useCrud from '../../hooks/useCrud';
import { Card, Row, Col, Form, InputGroup, Button, Modal, Alert } from 'react-bootstrap';
import {
  Search, Plus, Edit3, Trash2, Eye, Phone, PhoneCall, Copy, Check, MapPin,
  Mail, Star, StarOff, Building2, Ambulance, Shield, Flame, Stethoscope,
  Landmark, AlertTriangle, HeartPulse, Power,
} from 'lucide-react';

const seedContacts = [
  {
    id: 1, name: 'Barangay Health Emergency Hotline', category: 'Barangay',
    phone: '(02) 8123-4567', altPhone: '0917-123-4567', email: 'emergency@brgyhc.gov.ph',
    address: 'Brgy. Hall, Poblacion', available: '24/7', active: true, favorite: true,
    notes: 'First point of contact for any medical or community emergency within the barangay.',
  },
  {
    id: 2, name: 'Poblacion District Hospital', category: 'Hospital',
    phone: '(02) 8234-5678', altPhone: '0918-234-5678', email: 'er@poblaciondh.ph',
    address: '12 Mabini St., Poblacion', available: '24/7', active: true, favorite: true,
    notes: 'Nearest tertiary hospital with full ER and trauma services.',
  },
  {
    id: 3, name: 'Rescue 911 - Ambulance', category: 'Ambulance',
    phone: '911', altPhone: '117', email: '',
    address: 'Regional Dispatch', available: '24/7', active: true, favorite: true,
    notes: 'National emergency hotline. Free ambulance dispatch.',
  },
  {
    id: 4, name: 'PNP Brgy. Reyes Station', category: 'Police',
    phone: '(02) 8345-6789', altPhone: '0919-345-6789', email: '',
    address: '5 Rizal St., Brgy. Reyes', available: '24/7', active: true, favorite: false,
    notes: 'Local police station for crime and safety incidents.',
  },
  {
    id: 5, name: 'Bureau of Fire Protection', category: 'Fire',
    phone: '(02) 8426-0246', altPhone: '160', email: '',
    address: 'Central Fire Station', available: '24/7', active: true, favorite: false,
    notes: 'Fire emergencies, gas leaks, and structural rescue.',
  },
  {
    id: 6, name: 'Dr. Jose Santos (On-call)', category: 'Doctor',
    phone: '0917-555-7890', altPhone: '', email: 'jose.santos@brgyhc.gov.ph',
    address: 'B-Health Center', available: 'Mon–Sat, 24h', active: true, favorite: true,
    notes: 'Senior physician available for after-hours consultations.',
  },
  {
    id: 7, name: 'NDRRMC Disaster Response', category: 'Disaster',
    phone: '(02) 8911-1406', altPhone: '0917-911-1406', email: 'ops@ndrrmc.gov.ph',
    address: 'NDRRMC Operations Center', available: '24/7', active: true, favorite: false,
    notes: 'For natural disasters and large-scale emergencies.',
  },
  {
    id: 8, name: 'Red Cross 143', category: 'Ambulance',
    phone: '143', altPhone: '(02) 8527-0000', email: '',
    address: 'PNRC Regional Office', available: '24/7', active: true, favorite: false,
    notes: 'Blood services, first aid, ambulance assistance.',
  },
  {
    id: 9, name: 'MMDA Metrobase', category: 'Disaster',
    phone: '136', altPhone: '0917-555-1300', email: '',
    address: 'MMDA HQ', available: '24/7', active: false, favorite: false,
    notes: 'Traffic emergencies and road incidents.',
  },
];

const categoryStyle = {
  'Hospital':  { color: '#dc2626', bg: '#fee2e2', icon: <Building2 size={14} /> },
  'Ambulance': { color: '#b91c1c', bg: '#fecaca', icon: <Ambulance size={14} /> },
  'Police':    { color: '#1d4ed8', bg: '#dbeafe', icon: <Shield size={14} /> },
  'Fire':      { color: '#c2410c', bg: '#ffedd5', icon: <Flame size={14} /> },
  'Barangay':  { color: '#0d9488', bg: '#ccfbf1', icon: <Landmark size={14} /> },
  'Doctor':    { color: '#7c3aed', bg: '#ede9fe', icon: <Stethoscope size={14} /> },
  'Disaster':  { color: '#92400e', bg: '#fef3c7', icon: <AlertTriangle size={14} /> },
  'Other':     { color: '#6b7280', bg: '#f3f4f6', icon: <Phone size={14} /> },
};

const CategoryPill = ({ category }) => {
  const s = categoryStyle[category] || categoryStyle.Other;
  return (
    <span
      className="d-inline-flex align-items-center gap-1"
      style={{
        backgroundColor: s.bg,
        color: s.color,
        fontWeight: 600,
        fontSize: 11,
        padding: '3px 10px',
        borderRadius: 999,
      }}
    >
      {s.icon} {category}
    </span>
  );
};

const StatusPill = ({ active }) => (
  <span
    className="d-inline-flex align-items-center gap-1"
    style={{
      backgroundColor: active ? '#bfdbfe' : '#e5e7eb',
      color: active ? '#14532d' : '#4b5563',
      border: `1px solid ${active ? '#22c55e' : '#9ca3af'}`,
      fontWeight: 700,
      fontSize: 10,
      padding: '2px 8px',
      borderRadius: 999,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }}
  >
    <span
      className="rounded-circle d-inline-block"
      style={{ width: 5, height: 5, backgroundColor: active ? '#22c55e' : '#9ca3af' }}
    />
    {active ? 'Active' : 'Inactive'}
  </span>
);

const telHref = (num) => `tel:${(num || '').replace(/[^\d+]/g, '')}`;

const emptyForm = {
  name: '',
  category: 'Hospital',
  phone: '',
  altPhone: '',
  email: '',
  address: '',
  available: '24/7',
  notes: '',
  active: true,
  favorite: false,
};

const EmergencyContacts = () => {
  const { items: rawItems, loading, createItem, updateItem, deleteItem } = useCrud('/emergency-contacts');
  const items = rawItems.map((c) => ({ ...c, altPhone: c.alt_phone || c.altPhone || '', active: c.is_active !== undefined ? !!c.is_active : !!c.active, favorite: c.is_favorite !== undefined ? !!c.is_favorite : !!c.favorite }));
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [showFavs, setShowFavs] = useState(false);
  const [showView, setShowView] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const categories = useMemo(
    () => ['all', ...Object.keys(categoryStyle).filter((c) => items.some((i) => i.category === c))],
    [items],
  );

  const counts = useMemo(() => ({
    total:     items.length,
    active:    items.filter((c) => c.active).length,
    favorites: items.filter((c) => c.favorite).length,
    hospitals: items.filter((c) => c.category === 'Hospital' || c.category === 'Ambulance').length,
  }), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((c) => {
        const matchCat = category === 'all' || c.category === category;
        const matchFav = !showFavs || c.favorite;
        const matchQuery =
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q) ||
          (c.altPhone || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.address || '').toLowerCase().includes(q);
        return matchCat && matchFav && matchQuery;
      })
      .sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [items, category, showFavs, query]);

  const flash = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2800);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({ ...c });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    const payload = { ...form, alt_phone: form.altPhone, is_active: form.active ? 1 : 0, is_favorite: form.favorite ? 1 : 0 };
    if (editingId) {
      await updateItem(editingId, payload);
      flash('success', 'Contact updated.');
    } else {
      await createItem(payload);
      flash('success', 'Contact added.');
    }
    closeForm();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteItem(confirmDelete.id);
    flash('success', `${confirmDelete.name} deleted.`);
    setConfirmDelete(null);
  };

  const toggleActive = async (id) => {
    const c = items.find((x) => x.id === id);
    await updateItem(id, { is_active: c?.active ? 0 : 1 });
  };

  const toggleFavorite = async (id) => {
    const c = items.find((x) => x.id === id);
    await updateItem(id, { is_favorite: c?.favorite ? 0 : 1 });
  };

  const copyPhone = async (c) => {
    try {
      await navigator.clipboard.writeText(c.phone);
      setCopiedId(c.id);
      flash('success', `Copied: ${c.phone}`);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      flash('error', 'Unable to copy. Please copy manually.');
    }
  };

  const summaryCards = [
    { key: 'total',     label: 'Total Contacts', value: counts.total,     icon: <Phone size={18} />,       bg: '#dbeafe', color: '#1d4ed8' },
    { key: 'active',    label: 'Active',          value: counts.active,    icon: <PhoneCall size={18} />,   bg: '#bfdbfe', color: '#14532d' },
    { key: 'favorites', label: 'Favorites',       value: counts.favorites, icon: <Star size={18} />,        bg: '#fef3c7', color: '#92400e' },
    { key: 'hospitals', label: 'Medical & Rescue', value: counts.hospitals, icon: <HeartPulse size={18} />,  bg: '#fee2e2', color: '#991b1b' },
  ];

  return (
    <div className="p-4" style={{ backgroundColor: '#f8fafc' }}>
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
            <Card
              className="border rounded-4 bh-card-hover"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer' }}
              onClick={() => {
                if (c.key === 'favorites') setShowFavs(true);
                else setShowFavs(false);
              }}
            >
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
              {categories.map((c) => {
                const active = category === c;
                const n = c === 'all' ? items.length : items.filter((x) => x.category === c).length;
                return (
                  <Button
                    key={c}
                    size="sm"
                    onClick={() => setCategory(c)}
                    className="border-0"
                    style={{
                      backgroundColor: active ? '#0f766e' : '#f3f4f6',
                      color: active ? '#fff' : '#374151',
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {c === 'all' ? 'All' : c}
                    <span className="ms-1" style={{ opacity: 0.8 }}>({n})</span>
                  </Button>
                );
              })}
            </div>
            <div className="ms-auto d-flex align-items-center gap-2 mt-2 mt-md-0">
              <Button
                size="sm"
                variant="light"
                onClick={() => setShowFavs((v) => !v)}
                className="border-0 d-flex align-items-center gap-1 flex-shrink-0"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: showFavs ? '#92400e' : '#6b7280',
                  backgroundColor: showFavs ? '#fef3c7' : '#f3f4f6',
                }}
              >
                {showFavs ? <Star size={13} fill="#f59e0b" color="#f59e0b" /> : <Star size={13} />}
                <span className="d-none d-sm-inline">Favorites</span> {showFavs && `(${counts.favorites})`}
              </Button>
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
                className="d-flex align-items-center gap-1 border-0 fw-semibold flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #14b8a6, #0f766e)',
                  fontSize: 12,
                  boxShadow: '0 2px 8px rgba(15, 118, 110, 0.3)',
                }}
              >
                <Plus size={14} /> <span className="d-none d-sm-inline">Add Contact</span>
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Grid of contact cards */}
      {filtered.length === 0 ? (
        <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Card.Body className="p-5 text-center" style={{ color: '#9ca3af' }}>
            <Phone size={32} className="mb-2" />
            <div style={{ fontSize: 14 }}>No contacts found.</div>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-2 g-md-3 bh-stagger">
          {filtered.map((c) => {
            const s = categoryStyle[c.category] || categoryStyle.Other;
            return (
              <Col key={c.id} xs={12} md={6} xl={4}>
                <Card
                  className="border rounded-4 bh-card-hover h-100"
                  style={{
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    borderLeft: `4px solid ${s.color}`,
                    opacity: c.active ? 1 : 0.6,
                  }}
                >
                  <Card.Body className="p-3 d-flex flex-column">
                    <div className="d-flex align-items-start gap-2 mb-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                        style={{ width: 44, height: 44, backgroundColor: s.bg, color: s.color }}
                      >
                        {s.icon && React.cloneElement(s.icon, { size: 22 })}
                      </div>
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="d-flex align-items-center gap-1 mb-1">
                          <CategoryPill category={c.category} />
                          <StatusPill active={c.active} />
                        </div>
                        <div
                          className="fw-bold text-truncate"
                          style={{ fontSize: 14, color: '#111827', lineHeight: 1.25 }}
                          title={c.name}
                        >
                          {c.name}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(c.id)}
                        className="border-0 bg-transparent flex-shrink-0"
                        title={c.favorite ? 'Unfavorite' : 'Favorite'}
                        style={{ padding: 4, lineHeight: 0 }}
                      >
                        {c.favorite
                          ? <Star size={16} fill="#f59e0b" color="#f59e0b" />
                          : <StarOff size={16} color="#9ca3af" />}
                      </button>
                    </div>

                    <div className="d-flex flex-column gap-1 mb-2" style={{ fontSize: 13 }}>
                      <div className="d-flex align-items-center gap-2">
                        <Phone size={13} color={s.color} />
                        <a
                          href={telHref(c.phone)}
                          className="fw-bold text-decoration-none"
                          style={{ color: '#111827' }}
                        >
                          {c.phone}
                        </a>
                        <button
                          type="button"
                          onClick={() => copyPhone(c)}
                          className="border-0 bg-transparent ms-auto"
                          title="Copy number"
                          style={{ padding: 2, lineHeight: 0 }}
                        >
                          {copiedId === c.id
                            ? <Check size={12} color="#16a34a" />
                            : <Copy size={12} color="#9ca3af" />}
                        </button>
                      </div>
                      {c.altPhone && (
                        <div className="d-flex align-items-center gap-2" style={{ fontSize: 12, color: '#6b7280' }}>
                          <Phone size={11} /> {c.altPhone} <span style={{ opacity: 0.7 }}>(alt)</span>
                        </div>
                      )}
                      {c.address && (
                        <div className="d-flex align-items-center gap-2 text-truncate" style={{ fontSize: 12, color: '#6b7280' }} title={c.address}>
                          <MapPin size={11} /> <span className="text-truncate">{c.address}</span>
                        </div>
                      )}
                      {c.available && (
                        <div className="d-flex align-items-center gap-2" style={{ fontSize: 12, color: '#6b7280' }}>
                          <PhoneCall size={11} /> Available {c.available}
                        </div>
                      )}
                    </div>

                    <div className="mt-auto d-flex gap-1">
                      <Button
                        as="a"
                        href={telHref(c.phone)}
                        size="sm"
                        className="border-0 fw-semibold flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                        style={{
                          background: 'linear-gradient(135deg, #16a34a, #15803d)',
                          color: '#fff',
                          fontSize: 12,
                        }}
                      >
                        <PhoneCall size={13} /> Call
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        className="border-0 d-flex align-items-center justify-content-center"
                        onClick={() => setShowView(c)}
                        title="View"
                        style={{ width: 34 }}
                      >
                        <Eye size={13} color="#6b7280" />
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        className="border-0 d-flex align-items-center justify-content-center"
                        onClick={() => openEdit(c)}
                        title="Edit"
                        style={{ width: 34 }}
                      >
                        <Edit3 size={13} color="#1d4ed8" />
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        className="border-0 d-flex align-items-center justify-content-center"
                        onClick={() => toggleActive(c.id)}
                        title={c.active ? 'Deactivate' : 'Activate'}
                        style={{ width: 34 }}
                      >
                        <Power size={13} color={c.active ? '#dc2626' : '#16a34a'} />
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        className="border-0 d-flex align-items-center justify-content-center"
                        onClick={() => setConfirmDelete(c)}
                        title="Delete"
                        style={{ width: 34 }}
                      >
                        <Trash2 size={13} color="#dc2626" />
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* View Modal */}
      <Modal show={!!showView} onHide={() => setShowView(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }}>Emergency Contact</Modal.Title>
        </Modal.Header>
        {showView && (
          <Modal.Body>
            <div className="d-flex align-items-center gap-3 mb-3">
              <div
                className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                style={{
                  width: 56, height: 56,
                  backgroundColor: (categoryStyle[showView.category] || categoryStyle.Other).bg,
                  color: (categoryStyle[showView.category] || categoryStyle.Other).color,
                }}
              >
                {React.cloneElement((categoryStyle[showView.category] || categoryStyle.Other).icon, { size: 28 })}
              </div>
              <div className="flex-grow-1">
                <h5 className="fw-bold mb-1" style={{ color: '#111827' }}>{showView.name}</h5>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <CategoryPill category={showView.category} />
                  <StatusPill active={showView.active} />
                  {showView.favorite && (
                    <span
                      className="d-inline-flex align-items-center gap-1"
                      style={{
                        fontSize: 10, fontWeight: 700, color: '#92400e',
                        backgroundColor: '#fef3c7', padding: '2px 8px',
                        borderRadius: 999, letterSpacing: '0.04em',
                      }}
                    >
                      <Star size={10} fill="#f59e0b" color="#f59e0b" /> FAVORITE
                    </span>
                  )}
                </div>
              </div>
            </div>
            <hr />
            <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
              <div className="d-flex align-items-center gap-2">
                <Phone size={14} color="#6b7280" /> <strong>Primary:</strong>
                <a href={telHref(showView.phone)} className="fw-bold text-decoration-none" style={{ color: '#0f766e' }}>
                  {showView.phone}
                </a>
              </div>
              {showView.altPhone && (
                <div className="d-flex align-items-center gap-2">
                  <Phone size={14} color="#6b7280" /> <strong>Alternate:</strong>
                  <a href={telHref(showView.altPhone)} className="text-decoration-none" style={{ color: '#0f766e' }}>
                    {showView.altPhone}
                  </a>
                </div>
              )}
              {showView.email && (
                <div className="d-flex align-items-center gap-2">
                  <Mail size={14} color="#6b7280" /> <strong>Email:</strong>
                  <a href={`mailto:${showView.email}`} className="text-decoration-none" style={{ color: '#0f766e' }}>
                    {showView.email}
                  </a>
                </div>
              )}
              {showView.address && (
                <div className="d-flex align-items-center gap-2"><MapPin size={14} color="#6b7280" /> <strong>Address:</strong> {showView.address}</div>
              )}
              {showView.available && (
                <div className="d-flex align-items-center gap-2"><PhoneCall size={14} color="#6b7280" /> <strong>Available:</strong> {showView.available}</div>
              )}
              {showView.notes && (
                <div className="mt-2 p-2 rounded-3" style={{ backgroundColor: '#f9fafb', fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                  {showView.notes}
                </div>
              )}
            </div>
          </Modal.Body>
        )}
        <Modal.Footer>
          {showView && (
            <Button
              as="a"
              href={telHref(showView.phone)}
              size="sm"
              className="border-0 d-flex align-items-center gap-1"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff' }}
            >
              <PhoneCall size={14} /> Call {showView.phone}
            </Button>
          )}
          <Button variant="light" size="sm" onClick={() => setShowView(null)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* Add / Edit Modal */}
      <Modal show={showForm} onHide={closeForm} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }} className="d-flex align-items-center gap-2">
            <span
              className="d-flex align-items-center justify-content-center rounded-3"
              style={{ width: 30, height: 30, backgroundColor: '#fee2e2', color: '#dc2626' }}
            >
              <Phone size={15} />
            </span>
            {editingId ? 'Edit Contact' : 'Add Emergency Contact'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-2 mb-3">
              <Col xs={8}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Name</Form.Label>
                <Form.Control
                  size="sm"
                  placeholder="e.g. Poblacion District Hospital"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Col>
              <Col xs={4}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Category</Form.Label>
                <Form.Select
                  size="sm"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {Object.keys(categoryStyle).map((c) => <option key={c}>{c}</option>)}
                </Form.Select>
              </Col>
            </Row>

            <Row className="g-2 mb-3">
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Primary Phone</Form.Label>
                <InputGroup size="sm">
                  <InputGroup.Text className="bg-light border-end-0">
                    <Phone size={13} color="#6b7280" />
                  </InputGroup.Text>
                  <Form.Control
                    className="border-start-0"
                    placeholder="(02) 8123-4567"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                  />
                </InputGroup>
              </Col>
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Alternate Phone</Form.Label>
                <Form.Control
                  size="sm"
                  placeholder="0917-123-4567"
                  value={form.altPhone}
                  onChange={(e) => setForm({ ...form, altPhone: e.target.value })}
                />
              </Col>
            </Row>

            <Row className="g-2 mb-3">
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Email</Form.Label>
                <InputGroup size="sm">
                  <InputGroup.Text className="bg-light border-end-0">
                    <Mail size={13} color="#6b7280" />
                  </InputGroup.Text>
                  <Form.Control
                    type="email"
                    className="border-start-0"
                    placeholder="contact@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </InputGroup>
              </Col>
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Available</Form.Label>
                <Form.Control
                  size="sm"
                  placeholder="24/7 / Mon-Fri 8am-5pm"
                  value={form.available}
                  onChange={(e) => setForm({ ...form, available: e.target.value })}
                />
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Address</Form.Label>
              <Form.Control
                size="sm"
                placeholder="Street, Barangay, City"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                size="sm"
                placeholder="Optional notes about this contact..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Form.Group>

            <Row className="g-2">
              <Col xs={6}>
                <Form.Check
                  type="switch"
                  id="active-switch"
                  label={
                    <span style={{ fontSize: 13, color: '#374151' }}>
                      Active <span style={{ color: '#6b7280', fontSize: 11 }}>(shows in main list)</span>
                    </span>
                  }
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
              </Col>
              <Col xs={6}>
                <Form.Check
                  type="switch"
                  id="fav-switch"
                  label={
                    <span style={{ fontSize: 13, color: '#374151' }}>
                      Mark as favorite
                    </span>
                  }
                  checked={form.favorite}
                  onChange={(e) => setForm({ ...form, favorite: e.target.checked })}
                />
              </Col>
            </Row>
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
              {editingId ? 'Save Changes' : 'Add Contact'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete confirm */}
      <Modal show={!!confirmDelete} onHide={() => setConfirmDelete(null)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 15 }}>Delete Contact?</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ fontSize: 13 }}>
          Delete <strong>{confirmDelete?.name}</strong>? This cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button size="sm" className="border-0" style={{ backgroundColor: '#dc2626' }} onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EmergencyContacts;
