import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Form, InputGroup, Button, Modal } from 'react-bootstrap';
import {
  Search, Phone, PhoneCall, Copy, Check, MapPin, Mail, Star, Building2,
  Ambulance, Shield, Flame, Stethoscope, Landmark, AlertTriangle, Heart, RefreshCw,
} from 'lucide-react';
import { userApi } from '../../context/UserAuthContext';

const categoryStyle = {
  'Hospital':  { color: '#dc2626', bg: '#fee2e2', icon: <Building2 size={14} /> },
  'Ambulance': { color: '#b91c1c', bg: '#fecaca', icon: <Ambulance size={14} /> },
  'Police':    { color: '#0f172a', bg: '#e2e8f0', icon: <Shield size={14} /> },
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
      style={{ backgroundColor: s.bg, color: s.color, fontWeight: 600, fontSize: 11, padding: '3px 10px', borderRadius: 999 }}
    >
      {s.icon} {category}
    </span>
  );
};

const telHref = (num) => `tel:${(num || '').replace(/[^\d+]/g, '')}`;

const UserEmergencyContact = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [showView, setShowView] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [personal, setPersonal] = useState(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userApi.get('/emergency-contacts');
      setItems((Array.isArray(data) ? data : [])
        .map((c) => ({ ...c, altPhone: c.alt_phone || '', active: !!c.is_active, favorite: !!c.is_favorite }))
        .filter((c) => c.active));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
    userApi.get('/auth/user/me').then(setPersonal).catch(() => setPersonal(null));
  }, [fetchContacts]);

  const categories = useMemo(
    () => ['all', ...Object.keys(categoryStyle).filter((c) => items.some((i) => i.category === c))],
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((c) => (category === 'all' || c.category === category) && (!q
        || [c.name, c.category, c.phone, c.altPhone, c.email, c.address].some((v) => (v || '').toLowerCase().includes(q))))
      .sort((a, b) => (a.favorite !== b.favorite ? (a.favorite ? -1 : 1) : a.name.localeCompare(b.name)));
  }, [items, category, query]);

  const copyPhone = async (c) => {
    try {
      await navigator.clipboard.writeText(c.phone);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4 gap-3">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: '#111827' }}>Emergency Contacts</h4>
          <p className="mb-0" style={{ fontSize: 13, color: '#6b7280' }}>
            Official contact numbers from your Barangay Health Center
          </p>
        </div>
        <Button size="sm" variant="light" className="d-flex align-items-center gap-2 border flex-shrink-0" style={{ fontSize: 12 }} onClick={fetchContacts} disabled={loading}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Emergency Alert Banner */}
      <Card className="border-0 rounded-4 mb-4" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' }}>
        <Card.Body className="p-3 p-md-4">
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Phone size={24} color="#fff" />
            </div>
            <div style={{ color: '#fff', minWidth: 0 }}>
              <div className="fw-bold" style={{ fontSize: 16 }}>In case of emergency, call 911</div>
              <div style={{ fontSize: 12, color: '#fee2e2' }}>For life-threatening emergencies, call immediately</div>
            </div>
            <Button variant="light" className="ms-auto d-flex align-items-center gap-2 fw-semibold flex-shrink-0" style={{ fontSize: 13 }} href="tel:911">
              <PhoneCall size={16} /> Call
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Toolbar */}
      <Card className="border rounded-4 mb-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <Card.Body className="p-3">
          <InputGroup size="sm" className="mb-2">
            <InputGroup.Text className="bg-light border-end-0"><Search size={14} color="#9ca3af" /></InputGroup.Text>
            <Form.Control className="bg-light border-start-0" placeholder="Search contacts..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ fontSize: 13 }} />
          </InputGroup>
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
                  style={{ backgroundColor: active ? '#0f172a' : '#f3f4f6', color: active ? '#fff' : '#374151', fontWeight: 600, fontSize: 12 }}
                >
                  {c === 'all' ? 'All' : c} <span style={{ opacity: 0.8 }}>({n})</span>
                </Button>
              );
            })}
          </div>
        </Card.Body>
      </Card>

      {/* Contacts grid */}
      {loading ? (
        <Card className="border rounded-4 mb-4"><Card.Body className="p-5 text-center" style={{ color: '#9ca3af', fontSize: 14 }}>Loading...</Card.Body></Card>
      ) : filtered.length === 0 ? (
        <Card className="border rounded-4 mb-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Card.Body className="p-5 text-center" style={{ color: '#9ca3af' }}>
            <Phone size={32} className="mb-2" />
            <div style={{ fontSize: 14 }}>No contacts found.</div>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-2 g-md-3 mb-4">
          {filtered.map((c) => {
            const s = categoryStyle[c.category] || categoryStyle.Other;
            return (
              <Col key={c.id} xs={12} md={6} xl={4}>
                <Card
                  className="border rounded-4 h-100 bh-card-hover"
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowView(c)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowView(c); } }}
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `4px solid ${s.color}`, cursor: 'pointer' }}
                >
                  <Card.Body className="p-3 d-flex flex-column">
                    <div className="d-flex align-items-start gap-2 mb-2">
                      <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 44, height: 44, backgroundColor: s.bg, color: s.color }}>
                        {React.cloneElement(s.icon, { size: 22 })}
                      </div>
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="mb-1"><CategoryPill category={c.category} /></div>
                        <div className="fw-bold text-truncate" style={{ fontSize: 14, color: '#111827', lineHeight: 1.25 }} title={c.name}>{c.name}</div>
                      </div>
                      {c.favorite && <Star size={16} fill="#f59e0b" color="#f59e0b" className="flex-shrink-0" />}
                    </div>

                    <div className="d-flex flex-column gap-1 mb-2" style={{ fontSize: 13 }}>
                      <div className="d-flex align-items-center gap-2">
                        <Phone size={13} color={s.color} />
                        <a href={telHref(c.phone)} onClick={(e) => e.stopPropagation()} className="fw-bold text-decoration-none" style={{ color: '#111827' }}>{c.phone}</a>
                        <button type="button" onClick={(e) => { e.stopPropagation(); copyPhone(c); }} className="border-0 bg-transparent ms-auto" title="Copy number" style={{ padding: 2, lineHeight: 0 }}>
                          {copiedId === c.id ? <Check size={13} color="#16a34a" /> : <Copy size={13} color="#9ca3af" />}
                        </button>
                      </div>
                      {c.altPhone && (
                        <div className="d-flex align-items-center gap-2" style={{ fontSize: 12, color: '#6b7280' }}>
                          <Phone size={11} /> <a href={telHref(c.altPhone)} onClick={(e) => e.stopPropagation()} className="text-decoration-none" style={{ color: '#6b7280' }}>{c.altPhone}</a> <span style={{ opacity: 0.7 }}>(alt)</span>
                        </div>
                      )}
                      {c.address && (
                        <div className="d-flex align-items-center gap-2" style={{ fontSize: 12, color: '#6b7280' }}>
                          <MapPin size={11} className="flex-shrink-0" /> <span className="text-truncate">{c.address}</span>
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
                        onClick={(e) => e.stopPropagation()}
                        size="sm"
                        className="border-0 fw-semibold flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                        style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', fontSize: 12 }}
                      >
                        <PhoneCall size={13} /> Call
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Personal Emergency Contact (from profile) */}
      <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <Card.Body className="p-3 p-md-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold mb-0 d-flex align-items-center gap-2" style={{ fontSize: 14, color: '#111827' }}>
              <Heart size={16} style={{ color: '#ec4899' }} /> My Emergency Contact
            </h6>
            <Button size="sm" variant="light" className="border" style={{ fontSize: 12 }} onClick={() => navigate('/user/profile')}>
              {personal?.emergency_name ? 'Edit' : '+ Add'}
            </Button>
          </div>
          {personal?.emergency_name ? (
            <div className="d-flex align-items-center justify-content-between p-3 rounded-3" style={{ backgroundColor: '#f9fafb' }}>
              <div className="d-flex align-items-center gap-3" style={{ minWidth: 0 }}>
                <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', fontSize: 14, fontWeight: 600 }}>
                  {personal.emergency_name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="fw-semibold text-truncate" style={{ fontSize: 14, color: '#111827' }}>{personal.emergency_name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {[personal.emergency_relationship, personal.emergency_phone].filter(Boolean).join(' • ')}
                  </div>
                </div>
              </div>
              {personal.emergency_phone && (
                <Button size="sm" variant="light" className="border-0" href={telHref(personal.emergency_phone)}>
                  <Phone size={14} />
                </Button>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#9ca3af' }}>No personal emergency contact yet. Add one in your profile.</div>
          )}
        </Card.Body>
      </Card>

      {/* View Modal */}
      <Modal show={!!showView} onHide={() => setShowView(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }}>Emergency Contact</Modal.Title>
        </Modal.Header>
        {showView && (() => {
          const s = categoryStyle[showView.category] || categoryStyle.Other;
          return (
            <Modal.Body>
              <div className="d-flex align-items-center gap-3 mb-3">
                <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 56, height: 56, backgroundColor: s.bg, color: s.color }}>
                  {React.cloneElement(s.icon, { size: 28 })}
                </div>
                <div className="flex-grow-1">
                  <h5 className="fw-bold mb-1" style={{ color: '#111827' }}>{showView.name}</h5>
                  <CategoryPill category={showView.category} />
                </div>
              </div>
              <hr />
              <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
                <div className="d-flex align-items-center gap-2">
                  <Phone size={14} color="#6b7280" /> <strong>Primary:</strong>
                  <a href={telHref(showView.phone)} className="fw-bold text-decoration-none" style={{ color: '#0f766e' }}>{showView.phone}</a>
                </div>
                {showView.altPhone && (
                  <div className="d-flex align-items-center gap-2">
                    <Phone size={14} color="#6b7280" /> <strong>Alternate:</strong>
                    <a href={telHref(showView.altPhone)} className="text-decoration-none" style={{ color: '#0f766e' }}>{showView.altPhone}</a>
                  </div>
                )}
                {showView.email && (
                  <div className="d-flex align-items-center gap-2">
                    <Mail size={14} color="#6b7280" /> <strong>Email:</strong>
                    <a href={`mailto:${showView.email}`} className="text-decoration-none" style={{ color: '#0f766e' }}>{showView.email}</a>
                  </div>
                )}
                {showView.address && <div className="d-flex align-items-center gap-2"><MapPin size={14} color="#6b7280" /> <strong>Address:</strong> {showView.address}</div>}
                {showView.available && <div className="d-flex align-items-center gap-2"><PhoneCall size={14} color="#6b7280" /> <strong>Available:</strong> {showView.available}</div>}
                {showView.notes && (
                  <div className="mt-2 p-2 rounded-3" style={{ backgroundColor: '#f9fafb', color: '#374151', lineHeight: 1.5 }}>{showView.notes}</div>
                )}
              </div>
            </Modal.Body>
          );
        })()}
        <Modal.Footer>
          {showView && (
            <Button as="a" href={telHref(showView.phone)} size="sm" className="border-0 d-flex align-items-center gap-1" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff' }}>
              <PhoneCall size={14} /> Call {showView.phone}
            </Button>
          )}
          <Button variant="light" size="sm" onClick={() => setShowView(null)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UserEmergencyContact;
