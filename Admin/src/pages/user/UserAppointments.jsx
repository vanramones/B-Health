import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Button, Badge, Form, Modal, Nav, Toast, ToastContainer } from 'react-bootstrap';
import {
  Calendar, Clock, User, Plus, CheckCircle, XCircle, AlertCircle, FileText, Eye,
} from 'lucide-react';
import { userApi, useUserAuth } from '../../context/UserAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { socket } from '../../config/socket';
import { supabase } from '../../config/supabase';

const timeSlots = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
];

const statusConfig = {
  approved:  { bg: '#dbeafe', color: '#1e40af', label: 'Approved',  icon: <CheckCircle size={14} /> },
  pending:   { bg: '#fef3c7', color: '#92400e', label: 'Pending',   icon: <AlertCircle size={14} /> },
  completed: { bg: '#dcfce7', color: '#14532d', label: 'Completed', icon: <CheckCircle size={14} /> },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled', icon: <XCircle size={14} /> },
  rejected:  { bg: '#fee2e2', color: '#dc2626', label: 'Rejected',  icon: <XCircle size={14} /> },
};

const SLOT_LIMIT = 5;
const emptyForm = { service: '', date: '', time: '', notes: '', phone: '' };

const UserAppointments = () => {
  const { currentUser } = useUserAuth();
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('all');
  const [showBooking, setShowBooking]   = useState(false);
  const [bookingForm, setBookingForm]   = useState(emptyForm);
  const [submitting, setSubmitting]     = useState(false);
  const [bookError, setBookError]       = useState('');
  const [cancelling, setCancelling]     = useState(null);
  const [slotMap, setSlotMap]           = useState({});
  const [slotLimit, setSlotLimit]       = useState(5);
  const [services, setServices]         = useState([]);
  const [slotLoading, setSlotLoading]   = useState(false);
  const [viewApt, setViewApt]           = useState(null);
  const [notification, setNotification] = useState(null);

  const fetchSlots = useCallback(async (date, service) => {
    if (!date || !service) { setSlotMap({}); return; }
    setSlotLoading(true);
    try {
      const params = new URLSearchParams({ date, service }).toString();
      const data = await userApi.get(`/user/appointments/slots?${params}`);
      setSlotMap(data.slots || {});
      setSlotLimit(data.limit || 5);
    } catch { setSlotMap({}); }
    setSlotLoading(false);
  }, []);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userApi.get('/user/appointments');
      setAppointments(Array.isArray(data) ? data : []);
    } catch { setAppointments([]); }
    setLoading(false);
  }, [userApi]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const fetchServices = useCallback(async () => {
    try {
      const data = await userApi.get('/services');
      setServices(Array.isArray(data) ? data.map((s) => s.name) : []);
    } catch { setServices([]); }
  }, [userApi]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  // ── Socket.io listeners (manual events from admin) ──
  useEffect(() => {
    const handleAppointmentUpdate = (data) => {
      setNotification({
        type: data.status,
        message: data.message,
        patientName: data.patientName,
        service: data.service,
      });
      fetchAppointments();
      setTimeout(() => setNotification(null), 5000);
    };

    socket.on('appointment-approved',   handleAppointmentUpdate);
    socket.on('appointment-confirmed',  handleAppointmentUpdate);
    socket.on('appointment-rejected',   handleAppointmentUpdate);
    socket.on('appointment-completed',  handleAppointmentUpdate);

    return () => {
      socket.off('appointment-approved');
      socket.off('appointment-confirmed');
      socket.off('appointment-rejected');
      socket.off('appointment-completed');
    };
  }, [fetchAppointments]);

  // ── Supabase Realtime listener ──
  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel('user-appointments-' + currentUser.id)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAppointments((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setAppointments((prev) =>
              prev.map((apt) => apt.id === payload.new.id ? payload.new : apt)
            );
            // Show notification kung may status change
            const newStatus = payload.new.status;
            if (newStatus && newStatus !== 'pending') {
              const statusMessages = {
                approved:  'Appointment Approved',
                rejected:  'Appointment Rejected',
                completed: 'Appointment Completed',
                cancelled: 'Appointment Cancelled',
              };
              setNotification({
                type:        newStatus,
                message:     statusMessages[newStatus] || `Appointment ${newStatus}`,
                patientName: payload.new.name,
                service:     payload.new.service,
              });
              setTimeout(() => setNotification(null), 5000);
            }
          } else if (payload.eventType === 'DELETE') {
            setAppointments((prev) => prev.filter((apt) => apt.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const openBooking = () => {
    setShowBooking(true);
    fetchServices();
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (filter === 'all')      return true;
    if (filter === 'upcoming') return ['approved', 'pending'].includes(apt.status);
    if (filter === 'past')     return ['completed', 'cancelled'].includes(apt.status);
    return apt.status === filter;
  });

  const handleDateChange = (date) => {
    setBookingForm((f) => ({ ...f, date, time: '' }));
    fetchSlots(date, bookingForm.service);
  };

  const handleServiceChange = (service) => {
    setBookingForm((f) => ({ ...f, service, time: '' }));
    if (bookingForm.date) fetchSlots(bookingForm.date, service);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setBookError('');
    if (!currentUser) {
      setBookError('Session expired. Please log in again.');
      setSubmitting(false);
      return;
    }
    try {
      await userApi.post('/user/appointments', {
        service: bookingForm.service,
        date:    bookingForm.date,
        time:    bookingForm.time,
        notes:   bookingForm.notes,
      });
      setShowBooking(false);
      setBookingForm(emptyForm);
      await fetchAppointments();
    } catch (err) {
      setBookError(err.message || 'Failed to book appointment.');
    }
    setSubmitting(false);
  };

  const handleCancel = async (id) => {
    setCancelling(id);
    try {
      await userApi.delete(`/user/appointments/${id}`);
      await fetchAppointments();
    } catch { }
    setCancelling(null);
  };

  const tabs = [
    { key: 'all',      labelKey: 'all' },
    { key: 'upcoming', labelKey: 'upcomingAppointments' },
    { key: 'past',     labelKey: 'completed' },
  ];

  return (
    <div>
      {/* Notification Toast */}
      {notification && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, maxWidth: 400 }}>
          <Toast show={!!notification} onClose={() => setNotification(null)} delay={5000} autohide>
            <Toast.Header style={{
              backgroundColor: notification.type === 'rejected' ? '#fee2e2' : notification.type === 'completed' ? '#dcfce7' : '#dbeafe',
              borderBottom: `3px solid ${notification.type === 'rejected' ? '#dc2626' : notification.type === 'completed' ? '#22c55e' : '#1d4ed8'}`,
            }}>
              <strong style={{ color: notification.type === 'rejected' ? '#dc2626' : notification.type === 'completed' ? '#22c55e' : '#1d4ed8' }}>
                {notification.message}
              </strong>
            </Toast.Header>
            <Toast.Body style={{ fontSize: 13, color: '#374151' }}>
              <div><strong>{notification.service}</strong></div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Patient: {notification.patientName}</div>
            </Toast.Body>
          </Toast>
        </div>
      )}

      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: '#111827' }}>{t('myAppointments')}</h4>
          <p className="mb-0" style={{ fontSize: 13, color: '#6b7280' }}>
            View and manage your health appointments
          </p>
        </div>
        <Button
          className="d-flex align-items-center gap-2 border-0"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', fontSize: 13, fontWeight: 600 }}
          onClick={() => { setBookingForm(emptyForm); setSlotMap({}); setBookError(''); openBooking(); }}
        >
          <Plus size={16} /> {t('bookAppointment')}
        </Button>
      </div>

      {/* Filter Tabs */}
      <Card className="border rounded-4 mb-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <Card.Body className="p-3">
          <Nav className="gap-2">
            {tabs.map((tab) => (
              <Nav.Link
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className="px-3 py-2 rounded-3"
                style={{
                  fontSize: 13,
                  fontWeight: filter === tab.key ? 600 : 500,
                  color: filter === tab.key ? '#1d4ed8' : '#374151',
                  backgroundColor: filter === tab.key ? '#dbeafe' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                {t(tab.labelKey)}
              </Nav.Link>
            ))}
          </Nav>
        </Card.Body>
      </Card>

      {/* Appointments List */}
      {loading ? (
        <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Card.Body className="p-5 text-center" style={{ color: '#9ca3af' }}>
            <div style={{ fontSize: 14 }}>Loading appointments...</div>
          </Card.Body>
        </Card>
      ) : filteredAppointments.length === 0 ? (
        <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Card.Body className="p-5 text-center" style={{ color: '#9ca3af' }}>
            <Calendar size={40} className="mb-3" />
            <div style={{ fontSize: 14 }}>No appointments found</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Tap <strong>Book Appointment</strong> to get started.</div>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-3">
          {filteredAppointments.map((apt) => {
            const sc = statusConfig[apt.status] || statusConfig.pending;
            return (
              <Col key={apt.id} xs={12} md={6} lg={4}>
                <Card
                  className="border rounded-4 h-100"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                  onClick={() => setViewApt(apt)}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}
                >
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <Badge className="d-flex align-items-center gap-1"
                        style={{ backgroundColor: sc.bg, color: sc.color, fontSize: 11, fontWeight: 600 }}>
                        {sc.icon} {sc.label || apt.status}
                      </Badge>
                      <Eye size={15} color="#9ca3af" />
                    </div>
                    <h6 className="fw-bold mb-2" style={{ fontSize: 15, color: '#111827' }}>{apt.service}</h6>
                    <div className="d-flex flex-column gap-2 mb-3" style={{ fontSize: 13 }}>
                      <div className="d-flex align-items-center gap-2" style={{ color: '#374151' }}>
                        <User size={14} color="#6b7280" />{apt.name || 'You'}
                      </div>
                      <div className="d-flex align-items-center gap-2" style={{ color: '#374151' }}>
                        <Calendar size={14} color="#6b7280" />
                        {new Date(apt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="d-flex align-items-center gap-2" style={{ color: '#374151' }}>
                        <Clock size={14} color="#6b7280" />{apt.time}
                      </div>
                    </div>
                    {apt.notes && (
                      <div className="p-2 rounded-2" style={{ backgroundColor: '#f9fafb', fontSize: 12, color: '#6b7280' }}>
                        {apt.notes}
                      </div>
                    )}
                    {apt.status === 'pending' && (
                      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="light" className="w-100 border"
                          style={{ fontSize: 12, color: '#991b1b' }}
                          disabled={cancelling === apt.id}
                          onClick={() => handleCancel(apt.id)}>
                          {cancelling === apt.id ? 'Cancelling...' : 'Cancel Appointment'}
                        </Button>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* View Modal */}
      <style>{`
        @media (max-width: 576px) {
          .bh-apt-modal .modal-dialog { margin: 0 !important; max-width: 100% !important; position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; }
          .bh-apt-modal .modal-content { border-radius: 20px 20px 0 0 !important; border: none !important; }
        }
      `}</style>
      <Modal show={!!viewApt} onHide={() => setViewApt(null)} centered dialogClassName="bh-apt-modal">
        {viewApt && (() => {
          const sc = statusConfig[viewApt.status] || { bg: '#f3f4f6', color: '#6b7280', label: viewApt.status, icon: <AlertCircle size={20} /> };
          return (
            <>
              <Modal.Header closeButton style={{ borderBottom: `3px solid ${sc.color}`, padding: '16px 20px' }}>
                <Modal.Title style={{ fontSize: 15, fontWeight: 700 }}>
                  <FileText size={16} className="me-2" style={{ color: '#1d4ed8' }} />
                  Appointment Details
                </Modal.Title>
              </Modal.Header>
              <Modal.Body style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ textAlign: 'center', padding: '20px 16px', marginBottom: 16, borderRadius: 16, background: `linear-gradient(135deg, ${sc.bg}, ${sc.bg}cc)` }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#fff', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px ${sc.color}33`, color: sc.color }}>
                    {React.cloneElement(sc.icon, { size: 28 })}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 6 }}>{viewApt.service}</div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, backgroundColor: '#fff', color: sc.color, fontWeight: 700, fontSize: 12, padding: '5px 16px', borderRadius: 999, boxShadow: `0 2px 8px ${sc.color}33` }}>
                    {sc.icon} {sc.label}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { icon: <Calendar size={18} color="#1d4ed8" />, label: 'Date', value: new Date(viewApt.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) },
                    { icon: <Clock size={18} color="#7c3aed" />, label: 'Time', value: viewApt.time },
                    viewApt.name && { icon: <User size={18} color="#059669" />, label: 'Patient Name', value: viewApt.name },
                    viewApt.notes && { icon: <FileText size={18} color="#f59e0b" />, label: 'Notes / Remarks', value: viewApt.notes },
                    viewApt.status !== 'pending' && { icon: <User size={18} color="#7c3aed" />, label: viewApt.status === 'rejected' ? 'Rejected By' : viewApt.status === 'completed' ? 'Completed By' : 'Approved By', value: viewApt.handled_by || 'Admin' },
                    { icon: <Clock size={18} color="#6b7280" />, label: 'Booked On', value: new Date(viewApt.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
                  ].filter(Boolean).map((row, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, backgroundColor: '#f9fafb', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ flexShrink: 0, marginTop: 2 }}>{row.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{row.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', wordBreak: 'break-word', lineHeight: 1.4 }}>{row.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Modal.Body>
              <Modal.Footer style={{ padding: '12px 20px', gap: 8, flexWrap: 'wrap', borderTop: '1px solid #f3f4f6' }}>
                {viewApt.status === 'pending' && (
                  <Button size="sm" variant="light" className="border flex-fill" style={{ fontSize: 13, color: '#991b1b', fontWeight: 600 }} disabled={cancelling === viewApt.id} onClick={() => { handleCancel(viewApt.id); setViewApt(null); }}>
                    {cancelling === viewApt.id ? 'Cancelling…' : 'Cancel Appointment'}
                  </Button>
                )}
                <Button size="sm" variant="secondary" className="flex-fill" style={{ fontSize: 13, fontWeight: 600 }} onClick={() => setViewApt(null)}>Close</Button>
              </Modal.Footer>
            </>
          );
        })()}
      </Modal>

      {/* Booking Modal */}
      <Modal show={showBooking} onHide={() => setShowBooking(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }}>
            <Calendar size={18} className="me-2" style={{ color: '#1d4ed8' }} />
            Book an Appointment
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleBookingSubmit}>
          <Modal.Body>
            {bookError && (
              <div className="mb-3 p-2 rounded-3" style={{ backgroundColor: '#fee2e2', color: '#991b1b', fontSize: 13 }}>{bookError}</div>
            )}
            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Service Type</Form.Label>
                  <Form.Select size="sm" value={bookingForm.service} onChange={(e) => handleServiceChange(e.target.value)} required style={{ fontSize: 13 }}>
                    <option value="">Select a service</option>
                    {services.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Preferred Date</Form.Label>
                  <Form.Control type="date" size="sm" value={bookingForm.date} onChange={(e) => handleDateChange(e.target.value)} required min={new Date().toISOString().split('T')[0]} style={{ fontSize: 13 }} />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>
                    Preferred Time
                    {bookingForm.date && bookingForm.service && !slotLoading && (
                      <span className="ms-2" style={{ fontSize: 11, color: '#6b7280', fontWeight: 400 }}>({slotLimit} slots/hour)</span>
                    )}
                  </Form.Label>
                  <Form.Select size="sm" value={bookingForm.time} onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })} required disabled={!bookingForm.date || !bookingForm.service || slotLoading} style={{ fontSize: 13 }}>
                    <option value="">{slotLoading ? 'Loading...' : (!bookingForm.service ? 'Select a service first' : 'Select a time')}</option>
                    {timeSlots.map((slot) => {
                      const booked = slotMap[slot] || 0;
                      const full   = booked >= slotLimit;
                      const left   = slotLimit - booked;
                      return <option key={slot} value={slot} disabled={full}>{slot}{full ? ' — FULL' : ` (${left} slot${left !== 1 ? 's' : ''} left)`}</option>;
                    })}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Phone Number</Form.Label>
                  <Form.Control type="tel" size="sm" placeholder="09XX-XXX-XXXX" value={bookingForm.phone} onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })} required style={{ fontSize: 13 }} />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Reason / Notes (Optional)</Form.Label>
                  <Form.Control as="textarea" rows={3} size="sm" placeholder="Describe your symptoms or reason for visit..." value={bookingForm.notes} onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })} style={{ fontSize: 13 }} />
                </Form.Group>
              </Col>
            </Row>
            <div className="mt-3 p-3 rounded-3" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12, color: '#1d4ed8' }}>
              <strong>Note:</strong> Your appointment request will be reviewed by our staff. You will receive a confirmation within 24 hours.
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" size="sm" onClick={() => setShowBooking(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default UserAppointments;