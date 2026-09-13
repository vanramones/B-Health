import React, { useMemo, useState, useCallback, useEffect } from 'react';
import useCrud from '../../hooks/useCrud';
import api from '../../utils/api';
import { socket } from '../../config/socket';
import { supabase } from '../../config/supabase';
import { Card, Row, Col, Form, InputGroup, Button, Table, Modal, Toast, ToastContainer } from 'react-bootstrap';
import { Search, Plus, Check, X, Calendar, Clock, User, Bell, List, CalendarDays, ChevronLeft, ChevronRight, Activity, FileText, ClipboardList } from 'lucide-react';

const statusVariant = {
  pending:   { bg: '#fecaca', color: '#7f1d1d', border: '#ef4444', label: 'Pending'   },
  approved:  { bg: '#bfdbfe', color: '#1e3a8a', border: '#3b82f6', label: 'Approved'  },
  completed: { bg: '#bfdbfe', color: '#14532d', border: '#22c55e', label: 'Completed' },
  rejected:  { bg: '#e5e7eb', color: '#1f2937', border: '#9ca3af', label: 'Rejected'  },
};

const StatusPill = ({ status }) => {
  const sv = statusVariant[status];
  return (
    <span style={{
      display: 'inline-block',
      backgroundColor: sv.bg, color: sv.color,
      border: `1px solid ${sv.border}`,
      fontWeight: 700, fontSize: 11,
      padding: '4px 12px', borderRadius: 999,
      letterSpacing: '0.02em', lineHeight: 1.4,
    }}>
      {sv.label}
    </span>
  );
};

const Appointments = () => {
  const { items, loading, refresh, createItem, updateItem } = useCrud('/appointments');
  const [filter, setFilter]   = useState('all');
  const [query, setQuery]     = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState(null);
  const [form, setForm] = useState({ name: '', service: '', date: '', time: '' });
  const [newAppointments, setNewAppointments] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastData, setToastData] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [currentDate, setCurrentDate] = useState(new Date());

  // ── Socket.io — bagong appointment mula sa user ──
  useEffect(() => {
    const handleNewAppointment = (data) => {
      refresh();
      // Show notification
      setToastData(data);
      setShowToast(true);
      // Add to new appointments list
      setNewAppointments(prev => [...prev, data.id]);
      // Play notification sound (optional)
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      } catch (e) {}
    };

    socket.on('appointment-created', handleNewAppointment);
    return () => socket.off('appointment-created', handleNewAppointment);
  }, [refresh]);

  // ── Supabase Realtime ──
  const handleRealtimeUpdate = useCallback((payload) => {
    if (payload.eventType === 'INSERT') {
      refresh();
    } else if (payload.eventType === 'UPDATE') {
      refresh();
    } else if (payload.eventType === 'DELETE') {
      refresh();
    }
  }, [refresh]);

  React.useEffect(() => {
    const channel = supabase
      .channel('admin-appointments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, handleRealtimeUpdate)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [handleRealtimeUpdate]);

  const counts = useMemo(() => ({
    all:       items.length,
    pending:   items.filter((a) => a.status === 'pending').length,
    approved:  items.filter((a) => a.status === 'approved').length,
    completed: items.filter((a) => a.status === 'completed').length,
    rejected:  items.filter((a) => a.status === 'rejected').length,
  }), [items]);

  const filtered = useMemo(() => items.filter((a) => {
    const matchStatus = filter === 'all' || a.status === filter;
    const matchQuery  = !query || a.name.toLowerCase().includes(query.toLowerCase()) || a.service.toLowerCase().includes(query.toLowerCase());
    return matchStatus && matchQuery;
  }), [items, filter, query]);

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
            <Card className="border rounded-4 bh-card-hover" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer' }} onClick={() => setFilter(t.key)}>
              <Card.Body className="p-3 d-flex justify-content-between align-items-center">
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{t.label}</div>
                  <div className="fw-bold" style={{ fontSize: 26, color: '#111827', lineHeight: 1.1 }}>{counts[t.key]}</div>
                </div>
                <div className="d-flex align-items-center justify-content-center rounded-3"
                  style={{ width: 38, height: 38, backgroundColor: statusVariant[t.key].bg, color: statusVariant[t.key].color }}>
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
                const newCount = t.key === 'pending' ? newAppointments.length : 0;
                return (
                  <Button key={t.key} size="sm" onClick={() => setFilter(t.key)} className="border-0 position-relative"
                    style={{ backgroundColor: active ? '#15803d' : '#f3f4f6', color: active ? '#fff' : '#374151', fontWeight: 600, fontSize: 12 }}>
                    {t.label} <span className="ms-1" style={{ opacity: 0.8 }}>({counts[t.key]})</span>
                    {newCount > 0 && (
                      <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill"
                        style={{ backgroundColor: '#ef4444', fontSize: 9, padding: '3px 6px' }}>
                        {newCount}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
            <div className="ms-auto d-flex align-items-center gap-2 mt-2 mt-md-0">
              {/* View Mode Toggle */}
              <div className="btn-group" role="group">
                <Button size="sm" onClick={() => setViewMode('list')} 
                  className="border d-flex align-items-center gap-1"
                  style={{ 
                    backgroundColor: viewMode === 'list' ? '#16a34a' : '#fff',
                    color: viewMode === 'list' ? '#fff' : '#374151',
                    fontWeight: 500,
                    fontSize: 12,
                    borderColor: '#e5e7eb'
                  }}>
                  <List size={14} /> List
                </Button>
                <Button size="sm" onClick={() => setViewMode('calendar')}
                  className="border d-flex align-items-center gap-1"
                  style={{ 
                    backgroundColor: viewMode === 'calendar' ? '#16a34a' : '#fff',
                    color: viewMode === 'calendar' ? '#fff' : '#374151',
                    fontWeight: 500,
                    fontSize: 12,
                    borderColor: '#e5e7eb'
                  }}>
                  <CalendarDays size={14} /> Calendar
                </Button>
              </div>
              
              <InputGroup size="sm" className="flex-grow-1" style={{ maxWidth: 240, minWidth: 140 }}>
                <InputGroup.Text className="bg-light border-end-0"><Search size={14} color="#9ca3af" /></InputGroup.Text>
                <Form.Control className="bg-light border-start-0" placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ fontSize: 13 }} />
              </InputGroup>
              <Button size="sm" onClick={() => setShowAdd(true)} className="d-flex align-items-center gap-1 border-0 flex-shrink-0"
                style={{ backgroundColor: '#16a34a', fontWeight: 500, fontSize: 12 }}>
                <Plus size={14} /> <span className="d-none d-sm-inline">New Appointment</span>
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <Card className="border rounded-4 mb-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Card.Body className="p-4">
            {/* Calendar Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
              <Button size="sm" variant="light" onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setCurrentDate(newDate);
              }}>
                <ChevronLeft size={16} />
              </Button>
              <h5 className="mb-0 fw-bold" style={{ color: '#111827' }}>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h5>
              <Button size="sm" variant="light" onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setCurrentDate(newDate);
              }}>
                <ChevronRight size={16} />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center fw-bold" style={{ fontSize: 11, color: '#6b7280', padding: '8px 0' }}>
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {(() => {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const days = [];

                // Empty cells before first day
                for (let i = 0; i < firstDay; i++) {
                  days.push(<div key={`empty-${i}`} />);
                }

                // Days of month
                for (let day = 1; day <= daysInMonth; day++) {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayAppointments = filtered.filter(a => a.date === dateStr);
                  const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

                  days.push(
                    <div
                      key={day}
                      className="border rounded p-2"
                      style={{
                        minHeight: 80,
                        backgroundColor: isToday ? '#f0fdf4' : '#fff',
                        borderColor: isToday ? '#16a34a' : '#e5e7eb',
                        cursor: dayAppointments.length > 0 ? 'pointer' : 'default',
                      }}
                    >
                      <div className="fw-bold mb-1" style={{ fontSize: 12, color: isToday ? '#16a34a' : '#374151' }}>
                        {day}
                      </div>
                      {dayAppointments.slice(0, 3).map((apt) => (
                        <div
                          key={apt.id}
                          onClick={() => setShowView(apt)}
                          className="rounded px-2 py-1 mb-1"
                          style={{
                            fontSize: 10,
                            backgroundColor: statusVariant[apt.status].bg,
                            color: statusVariant[apt.status].color,
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {apt.time} {apt.name}
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 600 }}>
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                    </div>
                  );
                }

                return days;
              })()}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Table View */}
      {viewMode === 'list' && (
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
                  <tr><td colSpan={6} className="text-center py-5" style={{ color: '#9ca3af' }}>No appointments found.</td></tr>
                )}
                {filtered.map((a) => {
                  const isNew = newAppointments.includes(a.id);
                  return (
                  <tr key={a.id} onClick={() => {
                    setShowView(a);
                    // Remove from new appointments when viewed
                    setNewAppointments(prev => prev.filter(id => id !== a.id));
                  }} style={{ 
                    cursor: 'pointer',
                    backgroundColor: isNew ? '#fef3c7' : 'transparent',
                  }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isNew ? '#fde68a' : '#f0fff4'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isNew ? '#fef3c7' : ''}>
                    <td className="px-4 py-3">
                      <div className="d-flex align-items-center gap-2">
                        <div className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
                          style={{ width: 32, height: 32, backgroundColor: '#16a34a', fontSize: 11 }}>
                          {a.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                        </div>
                        <span className="fw-semibold" style={{ color: '#111827' }}>{a.name}</span>
                        {isNew && (
                          <span style={{
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}>
                            NEW
                          </span>
                        )}
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
                        {a.status === 'approved' && (<>
                          <Button size="sm" variant="light" className="border-0 p-1 px-2" onClick={() => updateStatus(a.id, 'completed')} title="Mark Completed"><Check size={14} color="#1d4ed8" /></Button>
                          <Button size="sm" variant="light" className="border-0 p-1 px-2" onClick={() => updateStatus(a.id, 'rejected')} title="Reject"><X size={14} color="#dc2626" /></Button>
                        </>)}
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
      )}

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
      <Modal show={!!showView} onHide={() => setShowView(null)} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div className="d-flex align-items-center gap-2">
            <Calendar size={22} color="#1d4ed8" />
            <Modal.Title style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Appointment Details</Modal.Title>
          </div>
        </Modal.Header>
        {showView && (<>
          <Modal.Body className="p-4" style={{ backgroundColor: '#fafafa' }}>
            {/* Patient Profile Card */}
            <div className="rounded-4 p-4 mb-4" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div className="d-flex align-items-center gap-4">
                <div className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
                  style={{ width: 70, height: 70, backgroundColor: '#16a34a', fontSize: 22 }}>
                  {showView.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-grow-1">
                  <div className="fw-bold" style={{ fontSize: 22, color: '#1e293b' }}>{showView.name}</div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <User size={16} color="#6b7280" />
                    <span style={{ fontSize: 14, color: '#6b7280' }}>{showView.service}</span>
                  </div>
                </div>
                <div className="ms-auto">
                  <StatusPill status={showView.status} />
                </div>
              </div>
            </div>

            <Row className="g-4">
              {/* Appointment Info */}
              <Col xs={12} md={6}>
                <div className="rounded-4 p-4 h-100" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
                  <div className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ fontSize: 15, color: '#1e293b' }}>
                    <FileText size={18} color="#1d4ed8" /> Appointment Info
                  </div>
                  <div className="d-flex flex-column gap-3" style={{ fontSize: 14 }}>
                    <div className="d-flex align-items-start gap-3 p-3 rounded-3" style={{ backgroundColor: '#f8fafc' }}>
                      <Calendar size={20} color="#1d4ed8" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Date</div>
                        <div className="fw-semibold" style={{ color: '#1e293b' }}>{showView.date}</div>
                      </div>
                    </div>
                    <div className="d-flex align-items-start gap-3 p-3 rounded-3" style={{ backgroundColor: '#f8fafc' }}>
                      <Clock size={20} color="#0891b2" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Time</div>
                        <div className="fw-semibold" style={{ color: '#1e293b' }}>{showView.time}</div>
                      </div>
                    </div>
                    <div className="d-flex align-items-start gap-3 p-3 rounded-3" style={{ backgroundColor: '#f8fafc' }}>
                      <Activity size={20} color="#7c3aed" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Service</div>
                        <div className="fw-semibold" style={{ color: '#1e293b' }}>{showView.service}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>

              {/* Notes Section */}
              <Col xs={12} md={6}>
                <div className="rounded-4 p-4 h-100" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
                  <div className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ fontSize: 15, color: '#1e293b' }}>
                    <ClipboardList size={18} color="#f59e0b" /> Notes
                  </div>
                  {showView.notes ? (
                    <div className="p-3 rounded-3" style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', fontSize: 14, minHeight: 120 }}>
                      {showView.notes}
                    </div>
                  ) : (
                    <div className="p-3 rounded-3" style={{ backgroundColor: '#f8fafc', color: '#9ca3af', fontSize: 14, minHeight: 120, fontStyle: 'italic' }}>
                      No notes provided
                    </div>
                  )}
                </div>
              </Col>
            </Row>

            {/* Status Timeline */}
            <div className="rounded-4 p-4 mt-4" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
              <div className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ fontSize: 15, color: '#1e293b' }}>
                <Clock size={18} color="#16a34a" /> Status Timeline
              </div>
              <div className="d-flex align-items-center gap-2" style={{ fontSize: 14 }}>
                {['pending', 'approved', 'completed'].map((s, idx) => (
                  <React.Fragment key={s}>
                    <div className="d-flex flex-column align-items-center" style={{ flex: 1 }}>
                      <div className="d-flex align-items-center justify-content-center rounded-circle"
                        style={{
                          width: 36, height: 36,
                          backgroundColor: ['pending', 'approved', 'completed'].indexOf(showView.status) >= idx ? statusVariant[showView.status].bg : '#e5e7eb',
                          color: ['pending', 'approved', 'completed'].indexOf(showView.status) >= idx ? statusVariant[showView.status].color : '#9ca3af',
                          border: `2px solid ${['pending', 'approved', 'completed'].indexOf(showView.status) >= idx ? statusVariant[showView.status].border : '#d1d5db'}`,
                          fontSize: 12, fontWeight: 700
                        }}>
                        {idx + 1}
                      </div>
                      <div className="mt-2 fw-semibold" style={{ fontSize: 12, color: ['pending', 'approved', 'completed'].indexOf(showView.status) >= idx ? statusVariant[showView.status].color : '#9ca3af', textTransform: 'capitalize' }}>
                        {s}
                      </div>
                    </div>
                    {idx < 2 && <div style={{ flex: 0.5, height: 2, backgroundColor: ['pending', 'approved', 'completed'].indexOf(showView.status) > idx ? statusVariant[showView.status].border : '#e5e7eb' }} />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="justify-content-between p-4" style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <div className="d-flex gap-2">
              {showView.status === 'pending' && (<>
                <Button size="md" className="border-0 d-flex align-items-center gap-2" style={{ backgroundColor: '#16a34a', fontWeight: 600 }} onClick={() => { updateStatus(showView.id, 'approved'); setShowView(null); }}>
                  <Check size={18} /> Approve
                </Button>
                <Button size="md" variant="danger" className="d-flex align-items-center gap-2" onClick={() => { updateStatus(showView.id, 'rejected'); setShowView(null); }}>
                  <X size={18} /> Reject
                </Button>
              </>)}
              {showView.status === 'approved' && (<>
                <Button size="md" className="border-0 d-flex align-items-center gap-2" style={{ backgroundColor: '#1d4ed8', fontWeight: 600 }} onClick={() => { updateStatus(showView.id, 'completed'); setShowView(null); }}>
                  <Check size={18} /> Mark Completed
                </Button>
                <Button size="md" variant="danger" className="d-flex align-items-center gap-2" onClick={() => { updateStatus(showView.id, 'rejected'); setShowView(null); }}>
                  <X size={18} /> Reject
                </Button>
              </>)}
            </div>
            <Button size="md" variant="secondary" onClick={() => setShowView(null)}>Close</Button>
          </Modal.Footer>
        </>)}
      </Modal>

      {/* Toast Notification for New Appointments */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast show={showToast} onClose={() => setShowToast(false)} delay={5000} autohide
          style={{ 
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            border: '2px solid #16a34a',
          }}>
          <Toast.Header closeButton style={{ backgroundColor: '#dcfce7', borderBottom: '1px solid #86efac' }}>
            <div className="d-flex align-items-center gap-2">
              <div className="d-flex align-items-center justify-content-center rounded-circle"
                style={{ width: 28, height: 28, backgroundColor: '#16a34a' }}>
                <Bell size={14} color="#fff" />
              </div>
              <strong className="me-auto" style={{ color: '#166534', fontSize: 14 }}>
                New Appointment Received
              </strong>
            </div>
          </Toast.Header>
          <Toast.Body style={{ fontSize: 13 }}>
            {toastData && (
              <div>
                <div className="mb-2">
                  <strong style={{ color: '#111827' }}>{toastData.name}</strong> has booked an appointment
                </div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  <div><strong>Service:</strong> {toastData.service}</div>
                  <div><strong>Date:</strong> {toastData.date}</div>
                  <div><strong>Time:</strong> {toastData.time}</div>
                </div>
              </div>
            )}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
};

export default Appointments;