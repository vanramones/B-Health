import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Button, Badge, Form, Modal, Nav, Toast, ToastContainer } from 'react-bootstrap';
import {
  Calendar, Clock, User, Plus, CheckCircle, XCircle, AlertCircle, FileText, Eye,
  MessageSquare, Send, CalendarClock,
} from 'lucide-react';

const isRescheduled = (apt) => apt.notes && /\bRESCHEDULED\b/i.test(apt.notes);
import { userApi, useUserAuth } from '../../context/UserAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { socket } from '../../config/socket';
import { supabase } from '../../config/supabase';

import { TIME_SLOTS as timeSlots } from '../../utils/timeSlots';

const statusConfig = {
  approved:  { bg: '#f1f5f9', color: '#0f172a', label: 'Approved',  icon: <CheckCircle size={14} /> },
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
  const [slotLimits, setSlotLimits]     = useState({});
  const [services, setServices]         = useState([]);
  const [slotLoading, setSlotLoading]   = useState(false);
  const [viewApt, setViewApt]           = useState(null);
  const [notification, setNotification] = useState(null);
  const [accepting, setAccepting]       = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(null);
  const [noteText, setNoteText]         = useState('');
  const [sendingNote, setSendingNote]   = useState(false);
  const [noteSuccess, setNoteSuccess]   = useState('');

  const fetchSlots = useCallback(async (date, service) => {
    if (!date || !service) { setSlotMap({}); return; }
    setSlotLoading(true);
    try {
      const params = new URLSearchParams({ date, service }).toString();
      const data = await userApi.get(`/user/appointments/slots?${params}`);
      setSlotMap(data.slots || {});
      setSlotLimit(data.limit || 5);
      setSlotLimits(data.limits || {});
    } catch { setSlotMap({}); setSlotLimits({}); }
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

    const handleRescheduled = (data) => {
      fetchAppointments();
      setNotification({ type: 'rescheduled', message: 'Appointment Rescheduled', patientName: data.patientName, service: data.service });
      setTimeout(() => setNotification(null), 5000);
    };

    socket.on('appointment-approved',      handleAppointmentUpdate);
    socket.on('appointment-confirmed',     handleAppointmentUpdate);
    socket.on('appointment-rejected',      handleAppointmentUpdate);
    socket.on('appointment-completed',     handleAppointmentUpdate);
    socket.on('appointment-rescheduled',   handleRescheduled);

    return () => {
      socket.off('appointment-approved');
      socket.off('appointment-confirmed');
      socket.off('appointment-rejected');
      socket.off('appointment-completed');
      socket.off('appointment-rescheduled');
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

  // Live slot counts while the booking form is open (any resident's booking changes them)
  useEffect(() => {
    if (!showBooking || !bookingForm.date || !bookingForm.service) return;
    const channel = supabase
      .channel(`slots-${bookingForm.service}-${bookingForm.date}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' },
        () => fetchSlots(bookingForm.date, bookingForm.service))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [showBooking, bookingForm.date, bookingForm.service, fetchSlots]);

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
      fetchSlots(bookingForm.date, bookingForm.service);
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

  const handleAcceptReschedule = async (id) => {
    setAccepting(id);
    try {
      await userApi.patch(`/user/appointments/${id}/accept-reschedule`, {});
      await fetchAppointments();
      setViewApt(null);
      setNotification({ type: 'accepted', message: 'Reschedule Accepted!', patientName: '', service: '' });
      setTimeout(() => setNotification(null), 3000);
    } catch (e) {
      alert(e.message || 'Failed to accept reschedule.');
    }
    setAccepting(null);
  };

  const handleSendNote = async (e) => {
    e.preventDefault();
    if (!showNoteModal || !noteText.trim()) return;
    setSendingNote(true);
    try {
      await userApi.post(`/user/appointments/${showNoteModal.id}/send-note`, { note: noteText.trim() });
      setNoteSuccess('Note sent to admin successfully!');
      setNoteText('');
      await fetchAppointments();
      setTimeout(() => { setShowNoteModal(null); setNoteSuccess(''); }, 2000);
    } catch (e) {
      alert(e.message || 'Failed to send note.');
    }
    setSendingNote(false);
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
              backgroundColor: notification.type === 'rejected' ? '#fee2e2' : notification.type === 'completed' ? '#dcfce7' : '#f1f5f9',
              borderBottom: `3px solid ${notification.type === 'rejected' ? '#dc2626' : notification.type === 'completed' ? '#22c55e' : '#0f172a'}`,
            }}>
              <strong style={{ color: notification.type === 'rejected' ? '#dc2626' : notification.type === 'completed' ? '#22c55e' : '#0f172a' }}>
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
          style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', fontSize: 13, fontWeight: 600 }}
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
                  color: filter === tab.key ? '#0f172a' : '#374151',
                  backgroundColor: filter === tab.key ? '#f1f5f9' : 'transparent',
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
                    {/* Reschedule indicator */}
                    {isRescheduled(apt) && (
                      <div className="p-2 rounded-3 mb-2 d-flex align-items-center gap-2"
                        style={{ backgroundColor: apt.status === 'pending' ? '#fffbeb' : '#f0fdf4', border: `1px solid ${apt.status === 'pending' ? '#fde68a' : '#86efac'}`, fontSize: 12, color: apt.status === 'pending' ? '#92400e' : '#166534' }}>
                        <CalendarClock size={13} /> Rescheduled by admin
                      </div>
                    )}
                    {apt.notes && !isRescheduled(apt) && (
                      <div className="p-2 rounded-2" style={{ backgroundColor: '#f9fafb', fontSize: 12, color: '#6b7280' }}>
                        {apt.notes}
                      </div>
                    )}
                    <div className="mt-3 d-flex flex-column gap-2" onClick={(e) => e.stopPropagation()}>
                      {/* Accept Reschedule */}
                      {isRescheduled(apt) && apt.status === 'pending' && (
                        <Button size="sm" className="w-100 border-0 d-flex align-items-center justify-content-center gap-1"
                          style={{ background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 600 }}
                          disabled={accepting === apt.id}
                          onClick={() => handleAcceptReschedule(apt.id)}>
                          {accepting === apt.id ? 'Accepting...' : <><CheckCircle size={14} /> Accept Reschedule</>}
                        </Button>
                      )}
                      {/* Send Note — always available */}
                      <Button size="sm" variant="outline-primary" className="w-100 d-flex align-items-center justify-content-center gap-1"
                        style={{ fontSize: 12, fontWeight: 600 }}
                        onClick={() => { setShowNoteModal(apt); setNoteText(''); setNoteSuccess(''); }}>
                        <MessageSquare size={14} /> Send Note to Admin
                      </Button>
                      {/* Cancel — only pending non-rescheduled */}
                      {apt.status === 'pending' && !isRescheduled(apt) && (
                        <Button size="sm" variant="light" className="w-100 border"
                          style={{ fontSize: 12, color: '#991b1b' }}
                          disabled={cancelling === apt.id}
                          onClick={() => handleCancel(apt.id)}>
                          {cancelling === apt.id ? 'Cancelling...' : 'Cancel Appointment'}
                        </Button>
                      )}
                    </div>
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
      <Modal show={!!viewApt} onHide={() => setViewApt(null)} centered scrollable dialogClassName="bh-apt-modal">
        {viewApt && (() => {
          const sc = statusConfig[viewApt.status] || { bg: '#f3f4f6', color: '#6b7280', label: viewApt.status, icon: <AlertCircle size={20} /> };
          return (
            <>
              <Modal.Header closeButton style={{ borderBottom: `3px solid ${sc.color}`, padding: '16px 20px' }}>
                <Modal.Title style={{ fontSize: 15, fontWeight: 700 }}>
                  <FileText size={16} className="me-2" style={{ color: '#0f172a' }} />
                  Appointment Details
                </Modal.Title>
              </Modal.Header>
              <Modal.Body style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
                {/* Header status card */}
                <div style={{ textAlign: 'center', padding: '16px', marginBottom: 12, borderRadius: 14, background: `linear-gradient(135deg, ${sc.bg}, ${sc.bg}bb)` }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: '#fff', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${sc.color}33`, color: sc.color }}>
                    {React.cloneElement(sc.icon, { size: 24 })}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 6 }}>{viewApt.service}</div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, backgroundColor: '#fff', color: sc.color, fontWeight: 700, fontSize: 12, padding: '4px 14px', borderRadius: 999, boxShadow: `0 2px 8px ${sc.color}22` }}>
                    {sc.icon} {sc.label}
                  </span>
                </div>

                {/* Reschedule notice banner */}
                {isRescheduled(viewApt) && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, backgroundColor: viewApt.status === 'pending' ? '#fffbeb' : '#f0fdf4', border: `1px solid ${viewApt.status === 'pending' ? '#fcd34d' : '#86efac'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CalendarClock size={16} color={viewApt.status === 'pending' ? '#d97706' : '#16a34a'} style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: viewApt.status === 'pending' ? '#92400e' : '#166534' }}>
                        {viewApt.status === 'pending' ? 'Rescheduled by Admin — Action needed' : 'Reschedule Accepted ✓'}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                        {viewApt.status === 'pending' ? 'Tap Accept below, or Send Note if unavailable.' : 'Appointment confirmed on the new schedule.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Detail rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                    <Calendar size={16} color="#0f172a" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{new Date(viewApt.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                  </div>
                  {/* Time */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                    <Clock size={16} color="#7c3aed" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{viewApt.time}</div>
                    </div>
                  </div>
                  {/* Patient */}
                  {viewApt.name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                      <User size={16} color="#059669" style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient Name</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{viewApt.name}</div>
                      </div>
                    </div>
                  )}
                  {/* Notes / Reschedule History — parsed cleanly */}
                  {viewApt.notes && (() => {
                    const blocks = viewApt.notes.split('\n\n').filter(Boolean);
                    return (
                      <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', backgroundColor: isRescheduled(viewApt) ? '#fffbeb' : '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                          {isRescheduled(viewApt) ? <CalendarClock size={14} color="#d97706" /> : <FileText size={14} color="#f59e0b" />}
                          <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {isRescheduled(viewApt) ? 'History & Notes' : 'Notes / Remarks'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                          {blocks.map((block, i) => {
                            const isReschBlock = /\bRESCHEDULED\b/i.test(block);
                            const isUserNote  = block.includes('[NOTE from');
                            // Clean up the prefix for display
                            const cleaned = block
                              .replace(/^\[RESCHEDULED by ([^\]]+)\]\s*/i, '')
                              .replace(/^\[NOTE from [^\]]+\]\s*/i, '')
                              .trim();
                            const byMatch = block.match(/^\[RESCHEDULED by ([^\]]+)\]/i);
                            const byName  = byMatch ? byMatch[1] : null;
                            return (
                              <div key={i} style={{ padding: '10px 14px', borderBottom: i < blocks.length - 1 ? '1px solid #f3f4f6' : 'none', backgroundColor: isReschBlock ? '#fffdf0' : isUserNote ? '#f1f5f9' : '#fff' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: isReschBlock ? '#d97706' : isUserNote ? '#0f172a' : '#9ca3af', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  {isReschBlock && <><CalendarClock size={10} /> RESCHEDULED{byName ? ` by ${byName}` : ''}</>}
                                  {isUserNote  && <><MessageSquare size={10} /> YOUR NOTE</>}
                                  {!isReschBlock && !isUserNote && 'NOTE'}
                                </div>
                                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{cleaned || block}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                  {/* Booked on */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                    <Clock size={16} color="#6b7280" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booked On</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{new Date(viewApt.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                  </div>
                </div>
              </Modal.Body>

              {/* Sticky footer */}
              <Modal.Footer style={{ padding: '12px 16px', gap: 8, flexWrap: 'wrap', borderTop: '2px solid #f3f4f6', backgroundColor: '#fff', flexShrink: 0 }}>
                {/* Accept Reschedule */}
                {isRescheduled(viewApt) && viewApt.status === 'pending' && (
                  <Button size="sm" className="flex-fill border-0 d-flex align-items-center justify-content-center gap-1"
                    style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontSize: 13, fontWeight: 600, borderRadius: 8, padding: '8px' }}
                    disabled={accepting === viewApt.id}
                    onClick={() => handleAcceptReschedule(viewApt.id)}>
                    {accepting === viewApt.id ? 'Accepting…' : <><CheckCircle size={14} /> Accept Reschedule</>}
                  </Button>
                )}
                {/* Send Note */}
                <Button size="sm" variant="outline-primary" className="flex-fill d-flex align-items-center justify-content-center gap-1"
                  style={{ fontSize: 13, fontWeight: 600, borderRadius: 8, padding: '8px' }}
                  onClick={() => { setShowNoteModal(viewApt); setNoteText(''); setNoteSuccess(''); setViewApt(null); }}>
                  <MessageSquare size={14} /> Send Note
                </Button>
                {/* Cancel — only pending non-rescheduled */}
                {viewApt.status === 'pending' && !isRescheduled(viewApt) && (
                  <Button size="sm" variant="light" className="border flex-fill" style={{ fontSize: 13, color: '#991b1b', fontWeight: 600, borderRadius: 8 }} disabled={cancelling === viewApt.id} onClick={() => { handleCancel(viewApt.id); setViewApt(null); }}>
                    {cancelling === viewApt.id ? 'Cancelling…' : 'Cancel Appointment'}
                  </Button>
                )}
                <Button size="sm" variant="secondary" className="flex-fill" style={{ fontSize: 13, fontWeight: 600, borderRadius: 8 }} onClick={() => setViewApt(null)}>Close</Button>
              </Modal.Footer>
            </>
          );
        })()}
      </Modal>

      {/* Send Note to Admin Modal */}
      <Modal show={!!showNoteModal} onHide={() => setShowNoteModal(null)} centered dialogClassName="bh-apt-modal">
        {showNoteModal && (
          <>
            <Modal.Header closeButton style={{ borderBottom: '3px solid #0f172a', padding: '16px 20px' }}>
              <Modal.Title style={{ fontSize: 15, fontWeight: 700 }}>
                <MessageSquare size={16} className="me-2" style={{ color: '#0f172a' }} />
                Send Note to Admin
              </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: '20px' }}>
              {noteSuccess && (
                <div className="p-3 mb-3 rounded-3 d-flex align-items-center gap-2"
                  style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', fontSize: 13, color: '#16a34a' }}>
                  <CheckCircle size={15} /> {noteSuccess}
                </div>
              )}
              <div className="p-3 mb-3 rounded-3" style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <div style={{ fontSize: 11, color: '#0369a1', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Regarding Appointment</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{showNoteModal.service}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {new Date(showNoteModal.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {showNoteModal.time}
                </div>
              </div>
              <Form onSubmit={handleSendNote}>
                <Form.Group>
                  <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Your Message</Form.Label>
                  <Form.Control as="textarea" rows={4} value={noteText} onChange={(e) => setNoteText(e.target.value)}
                    placeholder="e.g. Hindi ako available sa araw na iyon, pwede ba sa ibang araw?"
                    style={{ fontSize: 13, resize: 'none' }} required />
                </Form.Group>
                <Modal.Footer style={{ padding: '12px 0 0', gap: 8, borderTop: 'none' }}>
                  <Button variant="light" size="sm" className="border" onClick={() => setShowNoteModal(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="border-0 d-flex align-items-center gap-1"
                    style={{ background: '#0f172a', fontSize: 13, fontWeight: 600 }}
                    disabled={sendingNote || !noteText.trim()}>
                    {sendingNote ? 'Sending...' : <><Send size={14} /> Send Note</>}
                  </Button>
                </Modal.Footer>
              </Form>
            </Modal.Body>
          </>
        )}
      </Modal>

      {/* Booking Modal */}
      <Modal show={showBooking} onHide={() => setShowBooking(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }}>
            <Calendar size={18} className="me-2" style={{ color: '#0f172a' }} />
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
                  </Form.Label>
                  <Form.Select size="sm" value={bookingForm.time} onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })} required disabled={!bookingForm.date || !bookingForm.service || slotLoading} style={{ fontSize: 13 }}>
                    <option value="">{slotLoading ? 'Loading...' : (!bookingForm.service ? 'Select a service first' : 'Select a time')}</option>
                    {timeSlots.filter((slot) => (slotLimits[slot] ?? slotLimit) > 0).map((slot) => {
                      const cap    = slotLimits[slot] ?? slotLimit;
                      const booked = slotMap[slot] || 0;
                      const full   = booked >= cap;
                      const left   = cap - booked;
                      return <option key={slot} value={slot} disabled={full}>{slot}{full ? ' — FULL' : ` (${left} slot${left !== 1 ? 's' : ''} left)`}</option>;
                    })}
                  </Form.Select>
                </Form.Group>
              </Col>
              {bookingForm.date && bookingForm.service && !slotLoading && (() => {
                const caps   = timeSlots.map((s) => slotLimits[s] ?? slotLimit);
                const total  = caps.reduce((a, b) => a + b, 0);
                const left   = timeSlots.reduce((sum, s, i) => sum + Math.max(0, caps[i] - (slotMap[s] || 0)), 0);
                const color  = left === 0 ? '#dc2626' : left / (total || 1) <= 0.3 ? '#d97706' : '#16a34a';
                const dayLbl = new Date(`${bookingForm.date}T00:00:00`).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
                return (
                  <Col xs={12}>
                    <div className="p-2 px-3 rounded-3" style={{ backgroundColor: `${color}10`, border: `1px solid ${color}40` }}>
                      <div className="d-flex justify-content-between align-items-center" style={{ fontSize: 12, fontWeight: 600 }}>
                        <span style={{ color }}>
                          {left === 0 ? `Fully booked for ${dayLbl}` : `${left} slot${left !== 1 ? 's' : ''} available for the whole day (${dayLbl})`}
                        </span>
                        <span style={{ color: '#6b7280' }}>{total - left} / {total} booked</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 5, backgroundColor: '#e5e7eb', marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${total ? ((total - left) / total) * 100 : 100}%`, height: '100%', backgroundColor: color }} />
                      </div>
                    </div>
                  </Col>
                );
              })()}
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
            <div className="mt-3 p-3 rounded-3" style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: 12, color: '#0f172a' }}>
              <strong>Note:</strong> Your appointment request will be reviewed by our staff. You will receive a confirmation within 24 hours.
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" size="sm" onClick={() => setShowBooking(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="border-0" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default UserAppointments;