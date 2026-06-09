import React, { useMemo, useState } from 'react';
import useCrud from '../../hooks/useCrud';
import api from '../../utils/api';
import { Card, Row, Col, Form, InputGroup, Button, Modal, Alert } from 'react-bootstrap';
import {
  Search, Plus, Edit3, Trash2, Bell, BellOff, BellRing, CheckCheck, Check,
  Calendar, Syringe, AlertTriangle, Settings as SettingsIcon, Clock, Info,
  Eye, User as UserIcon, CheckCircle2, Inbox,
} from 'lucide-react';

const seedNotifications = [
  {
    id: 1, type: 'Appointment',  priority: 'normal',
    title: 'New appointment booked',
    message: 'Maria Santos booked a prenatal checkup on May 14, 2026 at 9:00 AM.',
    recipient: 'Marlo Reyes', createdAt: '2026-05-11T08:42:00', read: false,
  },
  {
    id: 2, type: 'Vaccination', priority: 'urgent',
    title: 'Vaccination reminder due',
    message: 'Pedro L. Mendoza is due for DPT 3rd dose tomorrow. Please confirm schedule with the parent.',
    recipient: 'Nurse Cruz', createdAt: '2026-05-11T07:30:00', read: false,
  },
  {
    id: 3, type: 'Health Alert', priority: 'urgent',
    title: 'Dengue cluster detected nearby',
    message: 'Two confirmed dengue cases reported in Sitio Bagong Silang. Recommend issuing an advisory.',
    recipient: 'All Staff', createdAt: '2026-05-10T16:15:00', read: false,
  },
  {
    id: 4, type: 'Reminder',     priority: 'normal',
    title: 'Weekly inventory check',
    message: 'Please update the medicine inventory before end of day.',
    recipient: 'Encoder', createdAt: '2026-05-10T09:00:00', read: false,
  },
  {
    id: 5, type: 'System',       priority: 'low',
    title: 'Backup completed',
    message: 'Daily backup of patient records completed successfully at 2:00 AM.',
    recipient: 'Admin', createdAt: '2026-05-10T02:00:00', read: true,
  },
  {
    id: 6, type: 'Appointment',  priority: 'normal',
    title: 'Appointment cancelled',
    message: 'Juan Dela Cruz cancelled his consultation scheduled May 11, 2026.',
    recipient: 'Marlo Reyes', createdAt: '2026-05-09T14:20:00', read: true,
  },
  {
    id: 7, type: 'Vaccination',  priority: 'normal',
    title: 'Flu vaccines arrived',
    message: '50 doses of seasonal flu vaccines received from RHU.',
    recipient: 'All Staff', createdAt: '2026-05-08T11:00:00', read: true,
  },
  {
    id: 8, type: 'Health Alert', priority: 'normal',
    title: 'Measles outbreak advisory',
    message: 'Reminder to follow up with unvaccinated children under 5 years old.',
    recipient: 'Nurse Cruz', createdAt: '2026-05-07T10:00:00', read: true,
  },
];

const typeStyle = {
  'Appointment':  { color: '#1d4ed8', bg: '#dbeafe', icon: <Calendar size={14} /> },
  'Vaccination':  { color: '#0d9488', bg: '#ccfbf1', icon: <Syringe size={14} /> },
  'Health Alert': { color: '#dc2626', bg: '#fee2e2', icon: <AlertTriangle size={14} /> },
  'Reminder':     { color: '#b45309', bg: '#fef3c7', icon: <Clock size={14} /> },
  'System':       { color: '#6b7280', bg: '#f3f4f6', icon: <SettingsIcon size={14} /> },
};

const priorityStyle = {
  urgent: { color: '#7f1d1d', bg: '#fecaca', border: '#ef4444', label: 'Urgent' },
  normal: { color: '#1e40af', bg: '#dbeafe', border: '#3b82f6', label: 'Normal' },
  low:    { color: '#374151', bg: '#f3f4f6', border: '#9ca3af', label: 'Low' },
};

const TypePill = ({ type }) => {
  const s = typeStyle[type] || typeStyle.System;
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
      {s.icon} {type}
    </span>
  );
};

const PriorityPill = ({ priority }) => {
  const p = priorityStyle[priority] || priorityStyle.normal;
  return (
    <span
      style={{
        backgroundColor: p.bg,
        color: p.color,
        border: `1px solid ${p.border}`,
        fontWeight: 700,
        fontSize: 10,
        padding: '2px 8px',
        borderRadius: 999,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {p.label}
    </span>
  );
};

const relativeTime = (iso) => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
};

const isToday = (iso) => {
  const d = new Date(iso);
  const t = new Date();
  return d.toDateString() === t.toDateString();
};

const emptyForm = {
  type: 'Reminder',
  priority: 'normal',
  title: '',
  message: '',
  recipient: 'All Staff',
};

const Notifications = () => {
  const { items: rawItems, loading, createItem, updateItem, deleteItem, refresh } = useCrud('/notifications');
  const items = rawItems.map((n) => ({ ...n, read: n.is_read !== undefined ? !!n.is_read : !!n.read, createdAt: n.created_at || n.createdAt }));
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all | unread | read
  const [query, setQuery] = useState('');
  const [showView, setShowView] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [appointmentDetail, setAppointmentDetail] = useState(null);
  const [loadingAppointment, setLoadingAppointment] = useState(false);

  const counts = useMemo(() => ({
    total:  items.length,
    unread: items.filter((n) => !n.read).length,
    today:  items.filter((n) => isToday(n.createdAt)).length,
    urgent: items.filter((n) => n.priority === 'urgent').length,
  }), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((n) => {
        const matchType = typeFilter === 'all' || n.type === typeFilter;
        const matchStatus =
          statusFilter === 'all' ||
          (statusFilter === 'unread' && !n.read) ||
          (statusFilter === 'read' && n.read);
        const matchQuery =
          !q ||
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          n.recipient.toLowerCase().includes(q) ||
          n.type.toLowerCase().includes(q);
        return matchType && matchStatus && matchQuery;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [items, typeFilter, statusFilter, query]);

  const flash = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2800);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (n) => {
    setEditingId(n.id);
    setForm({
      type: n.type,
      priority: n.priority,
      title: n.title,
      message: n.message,
      recipient: n.recipient,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    if (editingId) {
      await updateItem(editingId, form);
      flash('success', 'Notification updated.');
    } else {
      await createItem({ ...form, is_read: 0 });
      flash('success', 'Notification created.');
    }
    closeForm();
  };

  const toggleRead = async (id) => {
    const n = items.find((x) => x.id === id);
    await updateItem(id, { is_read: n?.read ? 0 : 1 });
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    await refresh();
    flash('success', 'All notifications marked as read.');
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteItem(confirmDelete.id);
    flash('success', 'Notification deleted.');
    setConfirmDelete(null);
  };

  const clearAllRead = async () => {
    const readItems = items.filter((n) => n.read);
    for (const n of readItems) { await deleteItem(n.id); }
    flash('success', 'Read notifications cleared.');
  };

  const openViewNotification = async (n) => {
    setShowView(n);
    setAppointmentDetail(null);
    
    // Auto mark as read when viewing
    if (!n.read) {
      updateItem(n.id, { is_read: 1 });
    }
    
    // If it's an appointment notification, try to fetch the appointment details
    if (n.type === 'Appointment') {
      setLoadingAppointment(true);
      try {
        // Extract user name from message to find the appointment
        const appointments = await api.get('/appointments');
        const userNameMatch = n.message.match(/^([^b]+) booked/);
        if (userNameMatch) {
          const userName = userNameMatch[1].trim();
          const apt = appointments.find((a) => a.name === userName && a.message?.includes(n.message.split(' on ')[1]?.split(' at ')[0]));
          if (apt) setAppointmentDetail(apt);
        }
      } catch (err) {
        console.error('Failed to fetch appointment:', err);
      }
      setLoadingAppointment(false);
    }
  };

  const summaryCards = [
    { key: 'total',  label: 'Total',  value: counts.total,  icon: <Inbox size={18} />,         bg: '#dbeafe', color: '#1d4ed8' },
    { key: 'unread', label: 'Unread', value: counts.unread, icon: <BellRing size={18} />,      bg: '#fee2e2', color: '#991b1b' },
    { key: 'today',  label: 'Today',  value: counts.today,  icon: <Calendar size={18} />,      bg: '#fef3c7', color: '#92400e' },
    { key: 'urgent', label: 'Urgent', value: counts.urgent, icon: <AlertTriangle size={18} />, bg: '#fecaca', color: '#7f1d1d' },
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
                if (c.key === 'unread') setStatusFilter('unread');
                else if (c.key === 'total') setStatusFilter('all');
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
              {['all', ...Object.keys(typeStyle)].map((t) => {
                const active = typeFilter === t;
                const n = t === 'all' ? items.length : items.filter((x) => x.type === t).length;
                return (
                  <Button
                    key={t}
                    size="sm"
                    onClick={() => setTypeFilter(t)}
                    className="border-0"
                    style={{
                      backgroundColor: active ? '#0f766e' : '#f3f4f6',
                      color: active ? '#fff' : '#374151',
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {t === 'all' ? 'All Types' : t}
                    <span className="ms-1" style={{ opacity: 0.8 }}>({n})</span>
                  </Button>
                );
              })}
            </div>
            <div className="ms-auto d-flex align-items-center gap-2">
              <InputGroup size="sm" style={{ width: 240 }}>
                <InputGroup.Text className="bg-light border-end-0">
                  <Search size={14} color="#9ca3af" />
                </InputGroup.Text>
                <Form.Control
                  className="bg-light border-start-0"
                  placeholder="Search notifications..."
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
                <Plus size={14} /> New
              </Button>
            </div>
          </div>
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex gap-1">
              {[
                { key: 'all',    label: 'All' },
                { key: 'unread', label: 'Unread' },
                { key: 'read',   label: 'Read' },
              ].map((t) => {
                const active = statusFilter === t.key;
                const n =
                  t.key === 'all' ? items.length :
                  t.key === 'unread' ? items.filter((x) => !x.read).length :
                  items.filter((x) => x.read).length;
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
            <div className="d-flex gap-1">
              <Button
                size="sm"
                variant="light"
                onClick={markAllRead}
                disabled={counts.unread === 0}
                className="border-0 d-flex align-items-center gap-1"
                style={{ fontSize: 12, fontWeight: 600, color: '#0f766e' }}
              >
                <CheckCheck size={13} /> Mark all read
              </Button>
              <Button
                size="sm"
                variant="light"
                onClick={clearAllRead}
                disabled={items.length === counts.unread}
                className="border-0 d-flex align-items-center gap-1"
                style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}
              >
                <Trash2 size={13} /> Clear read
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Card.Body className="p-5 text-center" style={{ color: '#9ca3af' }}>
            <BellOff size={32} className="mb-2" />
            <div style={{ fontSize: 14 }}>No notifications.</div>
          </Card.Body>
        </Card>
      ) : (
        <div className="d-flex flex-column gap-2 bh-stagger">
          {filtered.map((n) => {
            const t = typeStyle[n.type] || typeStyle.System;
            return (
              <Card
                key={n.id}
                className="border rounded-3 bh-card-hover"
                style={{
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  borderLeft: `4px solid ${n.read ? '#e5e7eb' : t.color}`,
                  backgroundColor: n.read ? '#fff' : '#fefce8',
                  cursor: 'pointer',
                }}
                onClick={() => openViewNotification(n)}
              >
                <Card.Body className="p-3">
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0 position-relative"
                      style={{ width: 40, height: 40, backgroundColor: t.bg, color: t.color }}
                    >
                      {t.icon}
                      {!n.read && (
                        <span
                          className="position-absolute rounded-circle"
                          style={{
                            width: 10, height: 10, top: -2, right: -2,
                            backgroundColor: '#dc2626',
                            border: '2px solid #fff',
                          }}
                        />
                      )}
                    </div>

                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                        <TypePill type={n.type} />
                        <PriorityPill priority={n.priority} />
                        {!n.read && (
                          <span
                            style={{
                              fontSize: 9, fontWeight: 700, color: '#dc2626',
                              backgroundColor: '#fee2e2', padding: '1px 6px',
                              borderRadius: 999, letterSpacing: '0.05em',
                            }}
                          >
                            NEW
                          </span>
                        )}
                      </div>

                      <div
                        className={n.read ? '' : 'fw-bold'}
                        style={{ fontSize: 14, color: '#111827', marginBottom: 2 }}
                      >
                        {n.title}
                      </div>
                      <div
                        style={{
                          fontSize: 13, color: '#4b5563',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.5,
                          marginBottom: 4,
                        }}
                      >
                        {n.message}
                      </div>

                      <div className="d-flex flex-wrap align-items-center gap-3" style={{ fontSize: 11, color: '#6b7280' }}>
                        <span className="d-flex align-items-center gap-1">
                          <UserIcon size={11} /> {n.recipient}
                        </span>
                        <span className="d-flex align-items-center gap-1">
                          <Clock size={11} /> {relativeTime(n.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="d-flex flex-shrink-0 gap-1">
                      <Button
                        size="sm" variant="light"
                        className="border-0 p-1 px-2"
                        onClick={(e) => { e.stopPropagation(); openViewNotification(n); }}
                        title="View"
                      >
                        <Eye size={14} color="#6b7280" />
                      </Button>
                      <Button
                        size="sm" variant="light"
                        className="border-0 p-1 px-2"
                        onClick={(e) => { e.stopPropagation(); toggleRead(n.id); }}
                        title={n.read ? 'Mark as unread' : 'Mark as read'}
                      >
                        {n.read
                          ? <BellRing size={14} color="#0f766e" />
                          : <Check size={14} color="#16a34a" />}
                      </Button>
                      <Button
                        size="sm" variant="light"
                        className="border-0 p-1 px-2"
                        onClick={(e) => { e.stopPropagation(); openEdit(n); }}
                        title="Edit"
                      >
                        <Edit3 size={14} color="#1d4ed8" />
                      </Button>
                      <Button
                        size="sm" variant="light"
                        className="border-0 p-1 px-2"
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(n); }}
                        title="Delete"
                      >
                        <Trash2 size={14} color="#dc2626" />
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
      <Modal show={!!showView} onHide={() => setShowView(null)} centered size={showView?.type === 'Appointment' && appointmentDetail ? 'lg' : 'md'}>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }}>
            {showView?.type === 'Appointment' && appointmentDetail ? 'Appointment Details' : 'Notification Details'}
          </Modal.Title>
        </Modal.Header>
        {showView && (
          <Modal.Body>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              <TypePill type={showView.type} />
              <PriorityPill priority={showView.priority} />
              {!showView.read && (
                <span
                  style={{
                    fontSize: 10, fontWeight: 700, color: '#dc2626',
                    backgroundColor: '#fee2e2', padding: '2px 8px',
                    borderRadius: 999, letterSpacing: '0.05em',
                  }}
                >
                  UNREAD
                </span>
              )}
            </div>
            <h5 className="fw-bold mb-3" style={{ color: '#111827' }}>{showView.title}</h5>
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {showView.message}
            </p>
            
            {/* Appointment Details */}
            {showView.type === 'Appointment' && (
              <>
                <hr />
                <div className="mb-3">
                  <h6 className="fw-bold mb-2" style={{ color: '#111827' }}>Appointment Information</h6>
                  {loadingAppointment ? (
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Loading appointment details...</div>
                  ) : appointmentDetail ? (
                    <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
                      <div className="d-flex justify-content-between">
                        <strong>Patient:</strong> <span>{appointmentDetail.name}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <strong>Service:</strong> <span>{appointmentDetail.service}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <strong>Date:</strong> <span>{new Date(appointmentDetail.date).toLocaleDateString()}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <strong>Time:</strong> <span>{appointmentDetail.time}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <strong>Status:</strong> 
                        <span style={{
                          backgroundColor: appointmentDetail.status === 'pending' ? '#fef3c7' : '#dbeafe',
                          color: appointmentDetail.status === 'pending' ? '#92400e' : '#1e40af',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                        }}>
                          {appointmentDetail.status?.toUpperCase()}
                        </span>
                      </div>
                      {appointmentDetail.notes && (
                        <div className="d-flex flex-column">
                          <strong>Notes:</strong> <span style={{ marginTop: 4 }}>{appointmentDetail.notes}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Appointment details not found.</div>
                  )}
                </div>
              </>
            )}
            
            <hr />
            <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
              <div className="d-flex align-items-center gap-2"><UserIcon size={14} color="#6b7280" /> <strong>Recipient:</strong> {showView.recipient}</div>
              <div className="d-flex align-items-center gap-2"><Clock size={14} color="#6b7280" /> <strong>Created:</strong> {new Date(showView.createdAt).toLocaleString()}</div>
              <div className="d-flex align-items-center gap-2">
                {showView.read
                  ? <><CheckCircle2 size={14} color="#16a34a" /> <strong>Read</strong></>
                  : <><BellRing size={14} color="#dc2626" /> <strong>Unread</strong></>}
              </div>
            </div>
          </Modal.Body>
        )}
        <Modal.Footer>
          {showView && !showView.read && (
            <Button
              size="sm"
              onClick={() => { toggleRead(showView.id); setShowView({ ...showView, read: true }); }}
              className="border-0 d-flex align-items-center gap-1"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0f766e)', color: '#fff' }}
            >
              <Check size={14} /> Mark as Read
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
              <Bell size={15} />
            </span>
            {editingId ? 'Edit Notification' : 'New Notification'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-2 mb-3">
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Type</Form.Label>
                <Form.Select
                  size="sm"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {Object.keys(typeStyle).map((t) => <option key={t}>{t}</option>)}
                </Form.Select>
              </Col>
              <Col xs={6}>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Priority</Form.Label>
                <Form.Select
                  size="sm"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </Form.Select>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Title</Form.Label>
              <Form.Control
                size="sm"
                placeholder="e.g. New appointment booked"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                size="sm"
                placeholder="Write the notification message..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group>
              <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Recipient</Form.Label>
              <Form.Control
                size="sm"
                placeholder="All Staff / Marlo Reyes / Nurse Cruz..."
                value={form.recipient}
                onChange={(e) => setForm({ ...form, recipient: e.target.value })}
              />
            </Form.Group>
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
              {editingId ? 'Save Changes' : 'Send Notification'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete confirm */}
      <Modal show={!!confirmDelete} onHide={() => setConfirmDelete(null)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 15 }}>Delete Notification?</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ fontSize: 13 }}>
          Delete <strong>{confirmDelete?.title}</strong>? This cannot be undone.
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

export default Notifications;
