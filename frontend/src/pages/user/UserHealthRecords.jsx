import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Button, Badge, Form, Modal, Nav } from 'react-bootstrap';
import {
  FileText, Calendar, User, Download, Eye, Search, RefreshCw,
  Stethoscope, FlaskConical, Pill, Baby, ClipboardList,
} from 'lucide-react';
import { userApi } from '../../context/UserAuthContext';

const typeConfig = {
  Consultation: { icon: <Stethoscope size={16} />, bg: '#dbeafe', color: '#1e40af' },
  'Lab Result': { icon: <FlaskConical size={16} />, bg: '#dbeafe', color: '#1d4ed8' },
  Prenatal: { icon: <Baby size={16} />, bg: '#fce7f3', color: '#be185d' },
  Prescription: { icon: <Pill size={16} />, bg: '#fef3c7', color: '#b45309' },
  Vaccination: { icon: <ClipboardList size={16} />, bg: '#ede9fe', color: '#7c3aed' },
};

const UserHealthRecords = () => {
  const [records, setRecords]   = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [showView, setShowView] = useState(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userApi.get('/user/health-records');
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await userApi.get('/user/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchNotifications();
    // Auto-refresh every 10 seconds to show newly added records and notifications
    const interval = setInterval(() => {
      fetchRecords();
      fetchNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchRecords, fetchNotifications]);

  const types = ['all', ...Object.keys(typeConfig)];

  const filteredRecords = records.filter((r) => {
    const matchesFilter = filter === 'all' || r.type === filter;
    const matchesSearch =
      r.diagnosis.toLowerCase().includes(search.toLowerCase()) ||
      r.doctor.toLowerCase().includes(search.toLowerCase()) ||
      (r.notes || '').toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Filter notifications for health records
  const healthRecordNotifications = notifications.filter((n) => n.type === 'health_record');

  return (
    <div>
      {/* Notifications Alert */}
      {healthRecordNotifications.length > 0 && (
        <Card className="border rounded-4 mb-4" style={{ 
          backgroundColor: '#eff6ff', 
          borderColor: '#bfdbfe',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)' 
        }}>
          <Card.Body className="p-3">
            <div style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 500 }}>
              📢 You have {healthRecordNotifications.length} new health record notification{healthRecordNotifications.length !== 1 ? 's' : ''}
            </div>
            {healthRecordNotifications.slice(0, 3).map((notif) => (
              <div key={notif.id} style={{ 
                fontSize: 12, 
                color: '#1e40af', 
                marginTop: 8,
                paddingLeft: 8,
                borderLeft: '3px solid #3b82f6'
              }}>
                <strong>{notif.title}</strong>
                <div style={{ color: '#6b7280', marginTop: 2 }}>{notif.message}</div>
              </div>
            ))}
          </Card.Body>
        </Card>
      )}

      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: '#111827' }}>My Health Records</h4>
          <p className="mb-0" style={{ fontSize: 13, color: '#6b7280' }}>
            View your medical history and health documents
          </p>
        </div>
        <Button
          size="sm"
          variant="light"
          className="d-flex align-items-center gap-2 border"
          style={{ fontSize: 12 }}
          onClick={() => {
            fetchRecords();
            fetchNotifications();
          }}
          disabled={loading}
        >
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Filter & Search */}
      <Card className="border rounded-4 mb-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <Card.Body className="p-3">
          <Row className="g-3 align-items-center">
            <Col xs={12} md={8}>
              <div className="d-flex flex-wrap gap-2">
                {types.map((t) => {
                  const tc = typeConfig[t];
                  return (
                    <Button
                      key={t}
                      size="sm"
                      onClick={() => setFilter(t)}
                      className="d-flex align-items-center gap-1 border-0"
                      style={{
                        backgroundColor: filter === t ? (tc?.bg || '#dbeafe') : '#f3f4f6',
                        color: filter === t ? (tc?.color || '#1d4ed8') : '#374151',
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      {tc?.icon}
                      {t === 'all' ? 'All Records' : t}
                    </Button>
                  );
                })}
              </div>
            </Col>
            <Col xs={12} md={4}>
              <Form.Control
                size="sm"
                placeholder="Search records..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ fontSize: 13 }}
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Records List */}
      {loading ? (
        <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Card.Body className="p-5 text-center" style={{ color: '#9ca3af' }}>
            <div style={{ fontSize: 14 }}>Loading health records…</div>
          </Card.Body>
        </Card>
      ) : filteredRecords.length === 0 ? (
        <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Card.Body className="p-5 text-center" style={{ color: '#9ca3af' }}>
            <FileText size={40} className="mb-3" />
            <div style={{ fontSize: 14 }}>No health records found</div>
          </Card.Body>
        </Card>
      ) : (
        <div className="d-flex flex-column gap-3">
          {filteredRecords.map((record) => {
            const tc = typeConfig[record.type] || typeConfig.Consultation;
            return (
              <Card
                key={record.id}
                className="border rounded-4 bh-card-hover"
                style={{ 
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                }}
                onClick={() => setShowView(record)}
              >
                <Card.Body className="p-4">
                  <Row className="align-items-center">
                    <Col xs={12} md={8}>
                      <div className="d-flex align-items-start gap-3">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                          style={{ width: 44, height: 44, backgroundColor: tc.bg, color: tc.color }}
                        >
                          {tc.icon}
                        </div>
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <Badge style={{ backgroundColor: tc.bg, color: tc.color, fontSize: 10 }}>
                              {record.type}
                            </Badge>
                            {record.prescription && (
                              <Badge style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: 10 }}>
                                <Pill size={10} className="me-1" /> Has Prescription
                              </Badge>
                            )}
                          </div>
                          <h6 className="fw-bold mb-1" style={{ fontSize: 14, color: '#111827' }}>
                            {record.diagnosis}
                          </h6>
                          <div className="d-flex flex-wrap gap-3" style={{ fontSize: 12, color: '#6b7280' }}>
                            <span className="d-flex align-items-center gap-1">
                              <User size={12} /> {record.doctor}
                            </span>
                            <span className="d-flex align-items-center gap-1">
                              <Calendar size={12} /> {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Col>
                    <Col xs={12} md={4} className="mt-3 mt-md-0">
                      <div className="d-flex gap-2 justify-content-md-end">
                        <Button
                          size="sm"
                          variant="light"
                          className="d-flex align-items-center gap-1 border"
                          style={{ fontSize: 12 }}
                          onClick={(e) => { e.stopPropagation(); setShowView(record); }}
                        >
                          <Eye size={14} /> View
                        </Button>
                        <Button
                          size="sm"
                          variant="light"
                          className="d-flex align-items-center gap-1 border"
                          style={{ fontSize: 12 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={14} /> Download
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            );
          })}
        </div>
      )}

      {/* View Modal */}
      <Modal show={!!showView} onHide={() => setShowView(null)} centered size="lg">
        {showView && (
          <>
            <Modal.Header closeButton>
              <Modal.Title style={{ fontSize: 16 }}>
                <FileText size={18} className="me-2" style={{ color: '#1d4ed8' }} />
                Health Record Details
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="d-flex align-items-center gap-2 mb-4">
                {(() => {
                  const tc = typeConfig[showView.type] || typeConfig.Consultation;
                  return (
                    <>
                      <Badge style={{ backgroundColor: tc.bg, color: tc.color, fontSize: 11 }}>
                        {tc.icon} {showView.type}
                      </Badge>
                      {showView.prescription && (
                        <Badge style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: 11 }}>
                          <Pill size={12} className="me-1" /> Has Prescription
                        </Badge>
                      )}
                    </>
                  );
                })()}
              </div>

              <Row className="g-4">
                <Col xs={12}>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>DIAGNOSIS / DESCRIPTION</div>
                  <div className="fw-bold" style={{ fontSize: 18, color: '#111827' }}>{showView.diagnosis}</div>
                </Col>
                <Col xs={12} md={6}>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>ATTENDING PHYSICIAN</div>
                  <div style={{ fontSize: 14, color: '#374151' }}>{showView.doctor}</div>
                </Col>
                <Col xs={12} md={6}>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>DATE</div>
                  <div style={{ fontSize: 14, color: '#374151' }}>
                    {new Date(showView.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </Col>
                <Col xs={12}>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>NOTES / REMARKS</div>
                  <div
                    className="p-3 rounded-3"
                    style={{ backgroundColor: '#f9fafb', fontSize: 13, color: '#374151' }}
                  >
                    {showView.notes || 'No additional notes.'}
                  </div>
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <Button
                size="sm"
                variant="light"
                className="d-flex align-items-center gap-1 border"
                style={{ fontSize: 12 }}
              >
                <Download size={14} /> Download PDF
              </Button>
              <Button size="sm" variant="light" onClick={() => setShowView(null)}>
                Close
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </div>
  );
};

export default UserHealthRecords;
