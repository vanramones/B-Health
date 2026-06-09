import React, { useMemo, useState } from 'react';
import useCrud from '../../hooks/useCrud';
import api from '../../utils/api';
import { socket } from '../../config/socket';
import { Card, Row, Col, Form, InputGroup, Button, Table, Modal } from 'react-bootstrap';
import { Search, Plus, Check, X, Calendar, Clock, User } from 'lucide-react';


const statusVariant = {
  pending:   { bg: '#fecaca', color: '#7f1d1d', border: '#ef4444', label: 'Pending'   },
  approved:  { bg: '#bfdbfe', color: '#1e3a8a', border: '#3b82f6', label: 'Approved'  },
  completed: { bg: '#bfdbfe', color: '#14532d', border: '#22c55e', label: 'Completed' },
  rejected:  { bg: '#e5e7eb', color: '#1f2937', border: '#9ca3af', label: 'Rejected'  },
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

const Appointments = () => {
  const { items, loading, refresh, createItem, updateItem } = useCrud('/appointments');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState(null);
  const [form, setForm] = useState({ name: '', service: '', date: '', time: '' });

  React.useEffect(() => {
    socket.on('appointment-created', () => {
      console.log('[Socket] New appointment created, refreshing list...');
      refresh();
    });

    return () => {
      socket.off('appointment-created');
    };
  }, [refresh]);

  const counts = useMemo(() => ({
    all: items.length,
    pending: items.filter((a) => a.status === 'pending').length,
    approved: items.filter((a) => a.status === 'approved').length,
    completed: items.filter((a) => a.status === 'completed').length,
    rejected: items.filter((a) => a.status === 'rejected').length,
  }), [items]);

  const filtered = useMemo(() => {
    return items.filter((a) => {
      const matchStatus = filter === 'all' || a.status === filter;
      const matchQuery =
        !query ||
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.service.toLowerCase().includes(query.toLowerCase());
      return matchStatus && matchQuery;
    });
  }, [items, filter, query]);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      await refresh();
    } catch { await updateItem(id, { status }); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.service || !form.date || !form.time) return;
    await createItem({ ...form, status: 'pending' });
    setForm({ name: '', service: '', date: '', time: '' });
    setShowAdd(false);
  };

  const tabs = [
    { key: 'all',       label: 'All',       color: '#6b7280' },
    { key: 'pending',   label: 'Pending',   color: '#b45309' },
    { key: 'approved',  label: 'Approved',  color: '#15803d' },
    { key: 'completed', label: 'Completed', color: '#1d4ed8' },
    { key: 'rejected',  label: 'Rejected',  color: '#b91c1c' },
  ];

  return (
    <div className="p-4" style={{ backgroundColor: '#f8fafc' }}>
      {/* Stat summary */}
      <Row className="g-2 g-md-3 mb-4 bh-stagger">
        {tabs.filter((t) => t.key !== 'all').map((t) => (
          <Col key={t.key} xs={6} lg={3}>
            <Card
              className="border rounded-4 bh-card-hover"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer' }}
              onClick={() => setFilter(t.key)}
            >
              <Card.Body className="p-3 d-flex justify-content-between align-items-center">
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{t.label}</div>
                  <div className="fw-bold" style={{ fontSize: 26, color: '#111827', lineHeight: 1.1 }}>{counts[t.key]}</div>
                </div>
                <div
                  className="d-flex align-items-center justify-content-center rounded-3"
                  style={{ width: 38, height: 38, backgroundColor: statusVariant[t.key].bg, color: statusVariant[t.key].color }}
                >
                  <Calendar size={18} />
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
              <InputGroup size="sm" className="flex-grow-1" style={{ maxWidth: 240, minWidth: 140 }}>
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
                onClick={() => setShowAdd(true)}
                className="d-flex align-items-center gap-1 border-0 flex-shrink-0"
                style={{ backgroundColor: '#16a34a', fontWeight: 500, fontSize: 12 }}
              >
                <Plus size={14} /> <span className="d-none d-sm-inline">New Appointment</span>
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
                <th className="px-4 py-3">Patient</th>
                <th className="py-3">Service</th>
                <th className="py-3">Date</th>
                <th className="py-3">Time</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13 }}>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-5" style={{ color: '#9ca3af' }}>
                    No appointments found.
                  </td>
                </tr>
              )}
              {filtered.map((a) => (
                <tr key={a.id} onClick={() => setShowView(a)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fff4'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}>
                  <td className="px-4 py-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
                        style={{ width: 32, height: 32, backgroundColor: '#16a34a', fontSize: 11 }}>
                        {a.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                      </div>
                      <span className="fw-semibold" style={{ color: '#111827' }}>{a.name}</span>
                    </div>
                  </td>
                  <td className="py-3" style={{ color: '#374151' }}>{a.service}</td>
                  <td className="py-3" style={{ color: '#6b7280' }}>{a.date}</td>
                  <td className="py-3" style={{ color: '#6b7280' }}>{a.time}</td>
                  <td className="py-3"><StatusPill status={a.status} /></td>
                  <td className="py-3 text-end pe-4" onClick={(e) => e.stopPropagation()}>
                    <div className="d-flex justify-content-end gap-1">
                      {a.status === 'pending' && (<>
                        <Button size="sm" variant="light" className="border-0 p-1 px-2" onClick={() => updateStatus(a.id, 'approved')} title="Approve"><Check size={14} color="#16a34a" /></Button>
                        <Button size="sm" variant="light" className="border-0 p-1 px-2" onClick={() => updateStatus(a.id, 'rejected')} title="Reject"><X size={14} color="#dc2626" /></Button>
                      </>)}
                      {a.status === 'approved' && (
                        <>
                          <Button size="sm" variant="light" className="border-0 p-1 px-2" onClick={() => updateStatus(a.id, 'completed')} title="Mark Completed"><Check size={14} color="#1d4ed8" /></Button>
                          <Button size="sm" variant="light" className="border-0 p-1 px-2" onClick={() => updateStatus(a.id, 'rejected')} title="Reject"><X size={14} color="#dc2626" /></Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Add Modal */}
      <Modal show={showAdd} onHide={() => setShowAdd(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }}>New Appointment</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAdd}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Patient Name</Form.Label>
              <Form.Control size="sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Service</Form.Label>
              <Form.Select size="sm" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} required>
                <option value="">Select service...</option>
                <option>General Consultation</option>
                <option>Vaccination (BCG)</option>
                <option>Vaccination (Flu)</option>
                <option>Prenatal Checkup</option>
                <option>Dental Cleaning</option>
                <option>Blood Pressure</option>
                <option>Follow-up Checkup</option>
              </Form.Select>
            </Form.Group>
            <Row className="g-2">
              <Col xs={7}>
                <Form.Group>
                  <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Date</Form.Label>
                  <Form.Control type="date" size="sm" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </Form.Group>
              </Col>
              <Col xs={5}>
                <Form.Group>
                  <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Time</Form.Label>
                  <Form.Control size="sm" placeholder="09:00 AM" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="border-0" style={{ backgroundColor: '#16a34a' }}>Create</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal show={!!showView} onHide={() => setShowView(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }}>Appointment Details</Modal.Title>
        </Modal.Header>
        {showView && (<>
          <Modal.Body>
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
                style={{ width: 44, height: 44, backgroundColor: '#16a34a' }}>
                {showView.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
              </div>
              <div>
                <div className="fw-bold" style={{ fontSize: 15 }}>{showView.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{showView.service}</div>
              </div>
              <div className="ms-auto"><StatusPill status={showView.status} /></div>
            </div>
            <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
              <div className="d-flex align-items-center gap-2"><Calendar size={14} color="#6b7280" /> <strong>Date:</strong> {showView.date}</div>
              <div className="d-flex align-items-center gap-2"><Clock size={14} color="#6b7280" /> <strong>Time:</strong> {showView.time}</div>
              {showView.notes && <div className="d-flex align-items-center gap-2"><User size={14} color="#6b7280" /> <strong>Notes:</strong> {showView.notes}</div>}
            </div>
          </Modal.Body>
          <Modal.Footer className="justify-content-between">
            <div className="d-flex gap-2">
              {showView.status === 'pending' && (<>
                <Button size="sm" className="border-0" style={{ backgroundColor: '#16a34a' }} onClick={() => { updateStatus(showView.id, 'approved'); setShowView(null); }}>Approve</Button>
                <Button size="sm" variant="danger" onClick={() => { updateStatus(showView.id, 'rejected'); setShowView(null); }}>Reject</Button>
              </>)}
              {showView.status === 'approved' && (
                <>
                  <Button size="sm" className="border-0" style={{ backgroundColor: '#1d4ed8' }} onClick={() => { updateStatus(showView.id, 'completed'); setShowView(null); }}>Mark Completed</Button>
                  <Button size="sm" variant="danger" onClick={() => { updateStatus(showView.id, 'rejected'); setShowView(null); }}>Reject</Button>
                </>
              )}
            </div>
            <Button size="sm" variant="secondary" onClick={() => setShowView(null)}>Close</Button>
          </Modal.Footer>
        </>)}
      </Modal>
    </div>
  );
};

export default Appointments;
