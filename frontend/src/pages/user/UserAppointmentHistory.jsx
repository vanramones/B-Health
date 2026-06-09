import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Badge, Modal, Form } from 'react-bootstrap';
import {
  History, Calendar, Clock, CheckCircle, XCircle, AlertCircle,
  User, Stethoscope, FileText, Filter, Search, Eye,
} from 'lucide-react';
import { userApi } from '../../context/UserAuthContext';

const statusConfig = {
  pending:   { bg: '#fef3c7', color: '#92400e', icon: <AlertCircle size={14} />, label: 'Pending'   },
  approved:  { bg: '#dbeafe', color: '#1d4ed8', icon: <CheckCircle size={14} />, label: 'Approved'  },
  completed: { bg: '#dcfce7', color: '#14532d', icon: <CheckCircle size={14} />, label: 'Completed' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', icon: <XCircle size={14} />,     label: 'Cancelled' },
  rejected:  { bg: '#fee2e2', color: '#dc2626', icon: <XCircle size={14} />,     label: 'Rejected'  },
  'no-show': { bg: '#fef3c7', color: '#92400e', icon: <AlertCircle size={14} />, label: 'No Show'   },
};

const UserAppointmentHistory = () => {
  const [history, setHistory]                       = useState([]);
  const [loading, setLoading]                       = useState(true);
  const [filterStatus, setFilterStatus]             = useState('all');
  const [searchTerm, setSearchTerm]                 = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    userApi.get('/user/appointments')
      .then((data) => {
        const allAppointments = (Array.isArray(data) ? data : [])
          .filter((a) => !a.deleted_at);
        setHistory(allAppointments);
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredHistory = history.filter((apt) => {
    const matchesStatus = filterStatus === 'all' || apt.status === filterStatus;
    const matchesSearch = apt.service.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total:     history.length,
    pending:   history.filter((a) => a.status === 'pending').length,
    approved:  history.filter((a) => a.status === 'approved').length,
    completed: history.filter((a) => a.status === 'completed').length,
    cancelled: history.filter((a) => a.status === 'cancelled' || a.status === 'rejected').length,
    noShow:    history.filter((a) => a.status === 'no-show').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: '#111827' }}>Appointment History</h4>
          <p className="mb-0" style={{ fontSize: 13, color: '#6b7280' }}>
            View your past appointments and medical visits
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={2}>
          <Card className="border rounded-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-3 text-center">
              <div className="fw-bold" style={{ fontSize: 24, color: '#111827' }}>{stats.total}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Total</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={2}>
          <Card className="border rounded-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-3 text-center">
              <div className="fw-bold" style={{ fontSize: 24, color: '#92400e' }}>{stats.pending}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Pending</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={2}>
          <Card className="border rounded-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-3 text-center">
              <div className="fw-bold" style={{ fontSize: 24, color: '#1d4ed8' }}>{stats.approved}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Approved</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={2}>
          <Card className="border rounded-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-3 text-center">
              <div className="fw-bold" style={{ fontSize: 24, color: '#22c55e' }}>{stats.completed}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Completed</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={2}>
          <Card className="border rounded-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-3 text-center">
              <div className="fw-bold" style={{ fontSize: 24, color: '#dc2626' }}>{stats.cancelled}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Cancelled/Rejected</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="border rounded-4 mb-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <Card.Body className="p-3">
          <Row className="g-2 align-items-center">
            <Col xs={12} md={6}>
              <div className="position-relative">
                <Search
                  size={16}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
                />
                <Form.Control
                  type="text"
                  placeholder="Search by service or doctor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: 36, fontSize: 13, borderRadius: 8 }}
                />
              </div>
            </Col>
            <Col xs={12} md={6}>
              <div className="d-flex gap-2 justify-content-md-end">
                <Button
                  size="sm"
                  variant={filterStatus === 'all' ? 'primary' : 'light'}
                  onClick={() => setFilterStatus('all')}
                  style={{
                    fontSize: 12,
                    backgroundColor: filterStatus === 'all' ? '#1d4ed8' : undefined,
                    borderColor: filterStatus === 'all' ? '#1d4ed8' : undefined,
                  }}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === 'pending' ? 'warning' : 'light'}
                  onClick={() => setFilterStatus('pending')}
                  style={{ fontSize: 12 }}
                >
                  Pending
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === 'approved' ? 'primary' : 'light'}
                  onClick={() => setFilterStatus('approved')}
                  style={{ fontSize: 12, backgroundColor: filterStatus === 'approved' ? '#1d4ed8' : undefined, borderColor: filterStatus === 'approved' ? '#1d4ed8' : undefined }}
                >
                  Approved
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === 'completed' ? 'success' : 'light'}
                  onClick={() => setFilterStatus('completed')}
                  style={{ fontSize: 12 }}
                >
                  Completed
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === 'cancelled' ? 'danger' : 'light'}
                  onClick={() => setFilterStatus('cancelled')}
                  style={{ fontSize: 12 }}
                >
                  Cancelled
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === 'rejected' ? 'danger' : 'light'}
                  onClick={() => setFilterStatus('rejected')}
                  style={{ fontSize: 12 }}
                >
                  Rejected
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Appointment List */}
      <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <Card.Body className="p-4">
          <h6 className="fw-bold mb-3" style={{ fontSize: 14, color: '#111827' }}>
            <History size={16} className="me-2" style={{ color: '#1d4ed8' }} />
            Past Appointments ({filteredHistory.length})
          </h6>

          {loading ? (
            <div className="text-center py-5" style={{ color: '#9ca3af' }}>
              <div style={{ fontSize: 14 }}>Loading history…</div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-5" style={{ color: '#9ca3af' }}>
              <History size={48} className="mb-3" />
              <div style={{ fontSize: 14 }}>No appointment history yet</div>
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {filteredHistory.map((apt) => {
                const sc = statusConfig[apt.status] || { bg: '#f3f4f6', color: '#6b7280', icon: <Clock size={14} />, label: apt.status };
                return (
                  <div
                    key={apt.id}
                    onClick={() => setSelectedAppointment(apt)}
                    style={{
                      backgroundColor: '#f9fafb',
                      border: `1px solid ${sc.bg}`,
                      borderLeft: `4px solid ${sc.color}`,
                      borderRadius: 12,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      transition: 'box-shadow 0.15s, background 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.10)'; e.currentTarget.style.backgroundColor = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                        style={{ width: 46, height: 46, backgroundColor: sc.bg, color: sc.color }}
                      >
                        {sc.icon}
                      </div>
                      <div>
                        <div className="fw-bold" style={{ fontSize: 14, color: '#111827' }}>{apt.service}</div>
                        <div className="d-flex flex-wrap align-items-center gap-2 mt-1" style={{ fontSize: 12, color: '#6b7280' }}>
                          <span className="d-flex align-items-center gap-1">
                            <Calendar size={11} />
                            {new Date(apt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span>·</span>
                          <span className="d-flex align-items-center gap-1">
                            <Clock size={11} /> {apt.time}
                          </span>
                        </div>
                        <div className="mt-1">
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 10px',
                            borderRadius: 999, backgroundColor: sc.bg, color: sc.color,
                          }}>
                            {sc.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Eye size={16} color="#9ca3af" style={{ flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Appointment Detail Modal */}
      <Modal show={!!selectedAppointment} onHide={() => setSelectedAppointment(null)} centered>
        {selectedAppointment && (() => {
          const sc = statusConfig[selectedAppointment.status] || { bg: '#f3f4f6', color: '#6b7280', icon: <Clock size={20} />, label: selectedAppointment.status };
          return (
            <>
              <Modal.Header closeButton style={{ borderBottom: `3px solid ${sc.color}` }}>
                <Modal.Title style={{ fontSize: 16 }}>
                  <FileText size={17} className="me-2" style={{ color: '#1d4ed8' }} />
                  Appointment Details
                </Modal.Title>
              </Modal.Header>
              <Modal.Body className="p-4">
                {/* Status hero */}
                <div className="text-center mb-4">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                    style={{ width: 68, height: 68, backgroundColor: sc.bg, color: sc.color }}
                  >
                    {sc.icon}
                  </div>
                  <h5 className="fw-bold mb-2" style={{ color: '#111827' }}>{selectedAppointment.service}</h5>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    backgroundColor: sc.bg, color: sc.color,
                    fontWeight: 700, fontSize: 12,
                    padding: '4px 14px', borderRadius: 999,
                  }}>
                    {sc.icon} {sc.label}
                  </span>
                </div>

                {/* Detail rows */}
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ backgroundColor: '#f9fafb' }}>
                    <Calendar size={18} color="#1d4ed8" />
                    <div>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Date</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                        {new Date(selectedAppointment.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ backgroundColor: '#f9fafb' }}>
                    <Clock size={18} color="#7c3aed" />
                    <div>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Time</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{selectedAppointment.time}</div>
                    </div>
                  </div>

                  {selectedAppointment.name && (
                    <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ backgroundColor: '#f9fafb' }}>
                      <User size={18} color="#059669" />
                      <div>
                        <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Patient Name</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{selectedAppointment.name}</div>
                      </div>
                    </div>
                  )}

                  {selectedAppointment.notes && (
                    <div className="d-flex align-items-start gap-3 p-3 rounded-3" style={{ backgroundColor: '#f9fafb' }}>
                      <FileText size={18} color="#f59e0b" />
                      <div>
                        <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Notes / Remarks</div>
                        <div style={{ fontSize: 14, color: '#374151', marginTop: 2 }}>{selectedAppointment.notes}</div>
                      </div>
                    </div>
                  )}

                  <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ backgroundColor: '#eef2ff', border: '1px solid #c7d2fe' }}>
                    <User size={18} color="#7c3aed" />
                    <div>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>
                        {selectedAppointment.status === 'rejected' ? 'Rejected By' : selectedAppointment.status === 'completed' ? 'Completed By' : 'Approved By'}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#4c1d95' }}>{selectedAppointment.handled_by || 'Admin'}</div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ backgroundColor: '#f9fafb' }}>
                    <History size={18} color="#6b7280" />
                    <div>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Booked On</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                        {new Date(selectedAppointment.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button size="sm" variant="light" className="border" onClick={() => setSelectedAppointment(null)}>
                  Close
                </Button>
              </Modal.Footer>
            </>
          );
        })()}
      </Modal>
    </div>
  );
};

export default UserAppointmentHistory;
