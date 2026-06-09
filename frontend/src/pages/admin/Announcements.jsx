import React, { useMemo, useState, useEffect } from 'react';
import useCrud from '../../hooks/useCrud';
import { socket } from '../../config/socket';
import { Card, Row, Col, Form, InputGroup, Button, Modal, Alert } from 'react-bootstrap';
import {
  Search, Plus, Eye, Edit3, Trash2, Megaphone, Pin, PinOff, Calendar, User as UserIcon,
  Send, FileText, AlertTriangle, Syringe, CalendarCheck, Stethoscope, Info,
  CheckCircle2,
} from 'lucide-react';

const categoryStyle = {
  'Health Advisory':     { color: '#dc2626', bg: '#fee2e2', icon: <AlertTriangle size={12} /> },
  'Vaccination Drive':   { color: '#0d9488', bg: '#ccfbf1', icon: <Syringe size={12} /> },
  'Event':               { color: '#7c3aed', bg: '#ede9fe', icon: <CalendarCheck size={12} /> },
  'Schedule':            { color: '#1d4ed8', bg: '#dbeafe', icon: <Calendar size={12} /> },
  'Emergency':           { color: '#b91c1c', bg: '#fecaca', icon: <AlertTriangle size={12} /> },
  'General':             { color: '#6b7280', bg: '#f3f4f6', icon: <Info size={12} /> },
};

const CategoryPill = ({ category }) => {
  const s = categoryStyle[category] || categoryStyle.General;
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
      {s.icon} {category}
    </span>
  );
};

const StatusPill = ({ status }) => {
  const isPub = status === 'published';
  return (
    <span
      className="d-inline-flex align-items-center gap-1"
      style={{
        backgroundColor: isPub ? '#bfdbfe' : '#fef3c7',
        color: isPub ? '#14532d' : '#92400e',
        border: `1px solid ${isPub ? '#22c55e' : '#f59e0b'}`,
        fontWeight: 700,
        fontSize: 10,
        padding: '3px 10px',
        borderRadius: 999,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {isPub ? <CheckCircle2 size={10} /> : <FileText size={10} />}
      {isPub ? 'Published' : 'Draft'}
    </span>
  );
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  title: '',
  category: 'General',
  body: '',
  author: '',
  audience: 'All Residents',
  publishDate: '',
  eventDate: '',
  status: 'published',
  pinned: false,
};

const Announcements = () => {
  const { items: rawItems, loading, refresh, createItem, updateItem, deleteItem } = useCrud('/announcements');
  const items = rawItems.map((a) => ({ ...a, publishDate: a.publish_date || a.publishDate || '', eventDate: a.event_date || a.eventDate || '', pinned: !!a.pinned }));
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showView, setShowView] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    socket.on('announcement-created', (data) => {
      console.log('[Socket] New announcement created:', data);
      flash('success', 'New announcement posted!');
      refresh();
    });

    socket.on('announcement-updated', (data) => {
      console.log('[Socket] Announcement updated:', data);
      flash('info', 'Announcement updated!');
      refresh();
    });

    socket.on('announcement-deleted', (data) => {
      console.log('[Socket] Announcement deleted:', data);
      flash('warning', 'Announcement deleted!');
      refresh();
    });

    return () => {
      socket.off('announcement-created');
      socket.off('announcement-updated');
      socket.off('announcement-deleted');
    };
  }, [refresh]);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(items.map((a) => a.category)))],
    [items],
  );

  const counts = useMemo(() => ({
    total:     items.length,
    published: items.filter((a) => a.status === 'published').length,
    draft:     items.filter((a) => a.status === 'draft').length,
    pinned:    items.filter((a) => a.pinned).length,
  }), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((a) => {
        const matchCat = category === 'all' || a.category === category;
        const matchStatus = statusFilter === 'all' || a.status === statusFilter;
        const matchQuery =
          !q ||
          a.title.toLowerCase().includes(q) ||
          a.body.toLowerCase().includes(q) ||
          a.author.toLowerCase().includes(q) ||
          a.audience.toLowerCase().includes(q);
        return matchCat && matchStatus && matchQuery;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return (b.publishDate || b.eventDate || '').localeCompare(a.publishDate || a.eventDate || '');
      });
  }, [items, category, statusFilter, query]);

  const flash = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm, author: 'Marlo Reyes' });
    setShowForm(true);
  };

  const openEdit = (a) => {
    setEditingId(a.id);
    setForm({ ...a });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    const payload = { ...form, publish_date: form.publishDate || null, event_date: form.eventDate || null, pinned: form.pinned ? 1 : 0 };
    if (editingId) {
      await updateItem(editingId, payload);
      flash('success', 'Announcement updated.');
    } else {
      await createItem(payload);
      flash('success', 'Announcement created.');
    }
    closeForm();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteItem(confirmDelete.id);
    flash('success', `"${confirmDelete.title}" deleted.`);
    setConfirmDelete(null);
  };

  const togglePin = async (id) => {
    const ann = items.find((a) => a.id === id);
    await updateItem(id, { pinned: ann?.pinned ? 0 : 1 });
  };

  const togglePublish = async (a) => {
    const newStatus = a.status === 'published' ? 'draft' : 'published';
    const publish_date = newStatus === 'published' ? (a.publishDate || todayISO()) : null;
    await updateItem(a.id, { status: newStatus, publish_date });
    flash('success', a.status === 'published' ? 'Moved to draft.' : 'Announcement published.');
  };

  const summaryCards = [
    { key: 'total',     label: 'Total',     value: counts.total,     icon: <Megaphone size={18} />,    bg: '#fef3c7', color: '#92400e' },
    { key: 'published', label: 'Published', value: counts.published, icon: <CheckCircle2 size={18} />, bg: '#bfdbfe', color: '#14532d' },
    { key: 'draft',     label: 'Drafts',    value: counts.draft,     icon: <FileText size={18} />,     bg: '#fde68a', color: '#78350f' },
    { key: 'pinned',    label: 'Pinned',    value: counts.pinned,    icon: <Pin size={18} />,          bg: '#fecaca', color: '#7f1d1d' },
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
                if (c.key === 'total')   { setStatusFilter('all'); setCategory('all'); }
                if (c.key === 'published') setStatusFilter('published');
                if (c.key === 'draft')     setStatusFilter('draft');
                if (c.key === 'pinned')  { /* no specific filter; keep current */ }
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
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
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
                      textTransform: 'capitalize',
                    }}
                  >
                    {c === 'all' ? 'All Categories' : c} <span className="ms-1" style={{ opacity: 0.8 }}>({n})</span>
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
                  placeholder="Search title, body, author..."
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
                <Plus size={14} /> New Announcement
              </Button>
            </div>
          </div>
          <div className="d-flex gap-1">
            {[
              { key: 'all',       label: 'All' },
              { key: 'published', label: 'Published' },
              { key: 'draft',     label: 'Drafts' },
            ].map((t) => {
              const active = statusFilter === t.key;
              const n = t.key === 'all' ? items.length : items.filter((x) => x.status === t.key).length;
              return (
                <Button
                  key={t.key}
                  size="sm"
                  onClick={() => setStatusFilter(t.key)}
                  variant="link"
                  className="text-decoration-none border-0 px-2 py-1"
                  style={{
                    color: active ? '#0f766e' : '#6b7280',
                    fontWeight: active ? 700 : 500,
                    fontSize: 12,
                    borderBottom: active ? '2px solid #0f766e' : '2px solid transparent',
                    borderRadius: 0,
                  }}
                >
                  {t.label} <span style={{ opacity: 0.7 }}>({n})</span>
                </Button>
              );
            })}
          </div>
        </Card.Body>
      </Card>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Card.Body className="p-5 text-center" style={{ color: '#9ca3af' }}>
            No announcements found.
          </Card.Body>
        </Card>
      ) : (
        <div className="d-flex flex-column gap-3 bh-stagger">
          {filtered.map((a) => {
            const cat = categoryStyle[a.category] || categoryStyle.General;
            return (
              <Card
                key={a.id}
                className="border rounded-4 bh-card-hover"
                style={{
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  borderLeft: `4px solid ${cat.color}`,
                  opacity: a.status === 'draft' ? 0.85 : 1,
                }}
              >
                <Card.Body className="p-3 p-md-4">
                  <div className="d-flex flex-wrap align-items-start gap-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                      style={{ width: 48, height: 48, backgroundColor: cat.bg, color: cat.color }}
                    >
                      <Megaphone size={22} />
                    </div>

                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                        {a.pinned && (
                          <span
                            className="d-inline-flex align-items-center gap-1"
                            style={{
                              fontSize: 10, fontWeight: 700, color: '#7f1d1d',
                              backgroundColor: '#fee2e2', padding: '2px 8px',
                              borderRadius: 999, letterSpacing: '0.05em',
                            }}
                          >
                            <Pin size={10} /> PINNED
                          </span>
                        )}
                        <CategoryPill category={a.category} />
                        <StatusPill status={a.status} />
                      </div>

                      <h5
                        className="fw-bold mb-1 text-truncate"
                        style={{ fontSize: 16, color: '#111827', letterSpacing: '-0.01em' }}
                        title={a.title}
                      >
                        {a.title}
                      </h5>

                      <p
                        className="mb-2"
                        style={{
                          fontSize: 13, color: '#4b5563',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.5,
                        }}
                      >
                        {a.body}
                      </p>

                      <div className="d-flex flex-wrap align-items-center gap-3" style={{ fontSize: 12, color: '#6b7280' }}>
                        <span className="d-flex align-items-center gap-1">
                          <UserIcon size={12} /> {a.author || '—'}
                        </span>
                        <span className="d-flex align-items-center gap-1">
                          <Stethoscope size={12} /> {a.audience}
                        </span>
                        {a.publishDate && (
                          <span className="d-flex align-items-center gap-1">
                            <Send size={12} /> Published {a.publishDate}
                          </span>
                        )}
                        {a.eventDate && (
                          <span className="d-flex align-items-center gap-1">
                            <CalendarCheck size={12} /> Event {a.eventDate}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="d-flex flex-column flex-md-row gap-1 flex-shrink-0 ms-auto">
                      <Button
                        size="sm" variant="light" className="border-0 d-flex align-items-center gap-1"
                        onClick={() => setShowView(a)}
                        style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}
                      >
                        <Eye size={13} /> View
                      </Button>
                      <Button
                        size="sm" variant="light" className="border-0 d-flex align-items-center gap-1"
                        onClick={() => openEdit(a)}
                        style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}
                      >
                        <Edit3 size={13} /> Edit
                      </Button>
                      <Button
                        size="sm" variant="light" className="border-0 d-flex align-items-center justify-content-center"
                        onClick={() => togglePin(a.id)}
                        title={a.pinned ? 'Unpin' : 'Pin'}
                        style={{ width: 36 }}
                      >
                        {a.pinned ? <PinOff size={13} color="#6b7280" /> : <Pin size={13} color="#dc2626" />}
                      </Button>
                      <Button
                        size="sm" variant="light" className="border-0 d-flex align-items-center justify-content-center"
                        onClick={() => togglePublish(a)}
                        title={a.status === 'published' ? 'Move to draft' : 'Publish'}
                        style={{ width: 36 }}
                      >
                        {a.status === 'published'
                          ? <FileText size={13} color="#92400e" />
                          : <Send size={13} color="#16a34a" />}
                      </Button>
                      <Button
                        size="sm" variant="light" className="border-0 d-flex align-items-center justify-content-center"
                        onClick={() => setConfirmDelete(a)}
                        title="Delete"
                        style={{ width: 36 }}
                      >
                        <Trash2 size={13} color="#dc2626" />
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            );
          })}
        </div>
      )}

      {/* View Modal */}
      <Modal show={!!showView} onHide={() => setShowView(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }}>Announcement Details</Modal.Title>
        </Modal.Header>
        {showView && (
          <Modal.Body>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              {showView.pinned && (
                <span
                  className="d-inline-flex align-items-center gap-1"
                  style={{
                    fontSize: 10, fontWeight: 700, color: '#7f1d1d',
                    backgroundColor: '#fee2e2', padding: '2px 8px',
                    borderRadius: 999, letterSpacing: '0.05em',
                  }}
                >
                  <Pin size={10} /> PINNED
                </span>
              )}
              <CategoryPill category={showView.category} />
              <StatusPill status={showView.status} />
            </div>
            <h4 className="fw-bold mb-3" style={{ color: '#111827', letterSpacing: '-0.01em' }}>
              {showView.title}
            </h4>
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {showView.body}
            </p>
            <hr />
            <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
              <div className="d-flex align-items-center gap-2"><UserIcon size={14} color="#6b7280" /> <strong>Author:</strong> {showView.author || '—'}</div>
              <div className="d-flex align-items-center gap-2"><Stethoscope size={14} color="#6b7280" /> <strong>Audience:</strong> {showView.audience}</div>
              {showView.publishDate && (
                <div className="d-flex align-items-center gap-2"><Send size={14} color="#6b7280" /> <strong>Published:</strong> {showView.publishDate}</div>
              )}
              {showView.eventDate && (
                <div className="d-flex align-items-center gap-2"><CalendarCheck size={14} color="#6b7280" /> <strong>Event Date:</strong> {showView.eventDate}</div>
              )}
            </div>
          </Modal.Body>
        )}
      </Modal>

      {/* Add / Edit Modal */}
      <Modal show={showForm} onHide={closeForm} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }} className="d-flex align-items-center gap-2">
            <span
              className="d-flex align-items-center justify-content-center rounded-3"
              style={{ width: 30, height: 30, backgroundColor: '#fef3c7', color: '#92400e' }}
            >
              <Megaphone size={15} />
            </span>
            {editingId ? 'Edit Announcement' : 'New Announcement'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Title</Form.Label>
              <Form.Control
                size="sm"
                placeholder="e.g. Free Anti-Rabies Vaccination Drive"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </Form.Group>

            <Row className="g-2 mb-3">
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Category</Form.Label>
                <Form.Select
                  size="sm"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {Object.keys(categoryStyle).map((c) => <option key={c}>{c}</option>)}
                </Form.Select>
              </Col>
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Audience</Form.Label>
                <Form.Control
                  size="sm"
                  placeholder="All Residents"
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                />
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                size="sm"
                placeholder="Write the announcement details..."
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                required
              />
            </Form.Group>

            <Row className="g-2 mb-3">
              <Col xs={4}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Author</Form.Label>
                <Form.Control
                  size="sm"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                />
              </Col>
              <Col xs={4}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Publish Date</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  value={form.publishDate}
                  onChange={(e) => setForm({ ...form, publishDate: e.target.value })}
                />
              </Col>
              <Col xs={4}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Event Date (optional)</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                />
              </Col>
            </Row>

            <Row className="g-2">
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Status</Form.Label>
                <Form.Select
                  size="sm"
                  value={form.status}
                  onChange={(e) => {
                    const next = e.target.value;
                    setForm({
                      ...form,
                      status: next,
                      publishDate: next === 'published' && !form.publishDate ? todayISO() : form.publishDate,
                    });
                  }}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </Form.Select>
              </Col>
              <Col xs={6} className="d-flex align-items-end">
                <Form.Check
                  type="switch"
                  id="pin-switch"
                  label={
                    <span style={{ fontSize: 13, color: '#374151' }}>
                      Pin to top
                    </span>
                  }
                  checked={form.pinned}
                  onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
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
              {editingId ? 'Save Changes' : 'Create Announcement'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete confirm */}
      <Modal show={!!confirmDelete} onHide={() => setConfirmDelete(null)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 15 }}>Delete Announcement?</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ fontSize: 13 }}>
          Delete <strong>{confirmDelete?.title}</strong>? This action cannot be undone.
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

export default Announcements;
