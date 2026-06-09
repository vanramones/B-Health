import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Modal } from 'react-bootstrap';
import {
  Syringe, Calendar, CheckCircle, Clock, AlertTriangle,
  Printer, Eye, Shield, MapPin, User, ChevronRight, Info,
} from 'lucide-react';
import { userApi } from '../../context/UserAuthContext';

const VACCINE_COLORS = {
  'BCG': '#16a34a', 'Measles': '#3b82f6', 'Tetanus': '#a855f7',
  'Flu (Influenza)': '#0ea5e9', 'Pneumococcal': '#f59e0b', 'DPT': '#ec4899',
  'Hepatitis B': '#8b5cf6', 'Polio (OPV)': '#06b6d4', 'COVID-19': '#dc2626',
  'HPV': '#84cc16', 'MMR': '#f97316', 'Varicella': '#14b8a6', 'Rabies': '#64748b',
};

const isOverdue = (nextDue) => nextDue && new Date(nextDue) < new Date();

const getVaxStatus = (v) => {
  if (v.status === 'completed') return { label: 'Completed', bg: '#dcfce7', color: '#14532d', icon: <CheckCircle size={12} /> };
  if (v.status === 'missed')    return { label: 'Missed',    bg: '#fee2e2', color: '#991b1b', icon: <AlertTriangle size={12} /> };
  if (isOverdue(v.next_due))    return { label: 'Overdue',   bg: '#fee2e2', color: '#dc2626', icon: <AlertTriangle size={12} /> };
  return                               { label: 'Scheduled', bg: '#fef3c7', color: '#92400e', icon: <Clock size={12} /> };
};

const UserVaccinations = () => {
  const navigate                    = useNavigate();
  const [allVax, setAllVax]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showView, setShowView]     = useState(null);
  const fetchVax = useCallback(() => {
    setLoading(true);
    userApi.get('/user/vaccinations')
      .then((data) => setAllVax(Array.isArray(data) ? data : []))
      .catch(() => setAllVax([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchVax(); }, [fetchVax]);

  const completed  = useMemo(() => allVax.filter((v) => v.status === 'completed'), [allVax]);
  const upcoming   = useMemo(() => allVax.filter((v) => v.status !== 'completed'), [allVax]);
  const overdueCount = useMemo(() => upcoming.filter((v) => isOverdue(v.next_due) || v.status === 'missed').length, [upcoming]);

  const vaccineProgress = useMemo(() => {
    const grouped = {};
    allVax.forEach((v) => {
      if (!grouped[v.vaccine]) grouped[v.vaccine] = { completed: 0, total: 0, color: VACCINE_COLORS[v.vaccine] || '#6b7280' };
      grouped[v.vaccine].total += 1;
      if (v.status === 'completed') grouped[v.vaccine].completed += 1;
    });
    return Object.entries(grouped).map(([name, val]) => ({ name, ...val }));
  }, [allVax]);

  const printVaccineCard = () => {
    const win = window.open('', '_blank');
    const rows = allVax.map((v) => `
      <tr>
        <td>${v.vaccine}</td>
        <td>${v.dose}</td>
        <td>${v.date ? new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
        <td>${v.next_due ? new Date(v.next_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
        <td>${v.administered_by || '—'}</td>
        <td><span style="padding:2px 8px;border-radius:999px;background:${v.status === 'completed' ? '#dcfce7' : v.status === 'missed' ? '#fee2e2' : '#fef3c7'};color:${v.status === 'completed' ? '#14532d' : v.status === 'missed' ? '#991b1b' : '#92400e'};font-weight:700;font-size:11px">${v.status}</span></td>
      </tr>`).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Vaccine Card</title>
      <style>body{font-family:Arial,sans-serif;padding:30px;color:#111}
      h2{color:#16a34a;margin-bottom:4px}p{color:#6b7280;font-size:13px;margin:0 0 20px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#f0fdf4;padding:8px 12px;text-align:left;border-bottom:2px solid #bbf7d0;font-size:11px;text-transform:uppercase;color:#6b7280}
      td{padding:8px 12px;border-bottom:1px solid #f3f4f6}
      @media print{body{padding:10px}}</style>
      </head><body>
      <h2>🩺 Vaccination Record Card</h2>
      <p>Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <table><thead><tr><th>Vaccine</th><th>Dose</th><th>Date Given</th><th>Next Due</th><th>Given By</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.onload=()=>{window.print();}<\/script></body></html>`);
    win.document.close();
  };

  const statCards = [
    { label: 'Total Vaccines', value: allVax.length,  icon: <Syringe size={18} />,     bg: '#dbeafe', color: '#1d4ed8' },
    { label: 'Completed',      value: completed.length, icon: <CheckCircle size={18} />, bg: '#dcfce7', color: '#14532d' },
    { label: 'Upcoming',       value: upcoming.filter((v) => !isOverdue(v.next_due) && v.status !== 'missed').length, icon: <Clock size={18} />, bg: '#fef3c7', color: '#92400e' },
    { label: 'Overdue/Missed', value: overdueCount,   icon: <AlertTriangle size={18} />, bg: '#fee2e2', color: '#dc2626' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: '#111827' }}>My Vaccinations</h4>
          <p className="mb-0" style={{ fontSize: 13, color: '#6b7280' }}>
            Track your vaccination history, schedules, and upcoming doses
          </p>
        </div>
        <Button variant="light" className="d-flex align-items-center gap-2 border"
          style={{ fontSize: 13, fontWeight: 600 }} onClick={printVaccineCard}>
          <Printer size={15} /> Print Vaccine Card
        </Button>
      </div>

      {/* Stat cards */}
      {!loading && (
        <Row className="g-3 mb-4">
          {statCards.map((c, i) => (
            <Col key={i} xs={6} lg={3}>
              <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <Card.Body className="p-3 d-flex justify-content-between align-items-center">
                  <div>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{c.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>{c.value}</div>
                  </div>
                  <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {c.icon}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div className="d-flex align-items-center gap-2 p-3 rounded-3 mb-4"
          style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', fontSize: 13 }}>
          <AlertTriangle size={16} color="#dc2626" />
          <span style={{ color: '#7f1d1d', fontWeight: 600 }}>
            You have {overdueCount} overdue or missed vaccination{overdueCount > 1 ? 's' : ''}.
          </span>
          <Button size="sm" className="ms-auto border-0"
            style={{ backgroundColor: '#dc2626', fontSize: 12 }}
            onClick={() => navigate('/user/appointments')}>
            Schedule Now
          </Button>
        </div>
      )}

      {/* Vaccine progress */}
      {vaccineProgress.length > 0 && (
        <Card className="border rounded-4 mb-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Card.Body className="p-4">
            <h6 className="fw-bold mb-3" style={{ fontSize: 14, color: '#111827' }}>
              <Shield size={15} className="me-2" style={{ color: '#1d4ed8' }} />
              Vaccine Completion Progress
            </h6>
            <Row className="g-3">
              {vaccineProgress.map((vp, i) => (
                <Col key={i} xs={12} md={6} lg={4}>
                  <div className="p-3 rounded-3" style={{ backgroundColor: '#f9fafb' }}>
                    <div className="d-flex justify-content-between mb-2">
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{vp.name}</span>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{vp.completed}/{vp.total}</span>
                    </div>
                    <div style={{ height: 8, backgroundColor: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(vp.completed / vp.total) * 100}%`, backgroundColor: vp.color, borderRadius: 999, transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                      {vp.completed === vp.total ? '✅ Complete' : `${vp.total - vp.completed} dose(s) remaining`}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>
      )}

      <Row className="g-4">
        {/* Upcoming / Scheduled */}
        <Col xs={12} lg={5}>
          <Card className="border rounded-4 h-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-4">
              <h6 className="fw-bold mb-3" style={{ fontSize: 14, color: '#111827' }}>
                <Clock size={15} className="me-2" style={{ color: '#f59e0b' }} />
                Upcoming & Scheduled
              </h6>
              {loading ? (
                <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '30px 0' }}>Loading…</div>
              ) : upcoming.length === 0 ? (
                <div className="text-center py-4" style={{ color: '#9ca3af' }}>
                  <Syringe size={32} className="mb-2" />
                  <div style={{ fontSize: 13 }}>No upcoming vaccinations</div>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {upcoming.map((vax) => {
                    const sc     = getVaxStatus(vax);
                    const overdue = isOverdue(vax.next_due) && vax.status !== 'missed';
                    return (
                      <div key={vax.id} className="p-3 rounded-3"
                        style={{ backgroundColor: overdue ? '#fef2f2' : vax.status === 'missed' ? '#fef2f2' : '#f9fafb',
                          border: `1px solid ${overdue || vax.status === 'missed' ? '#fecaca' : '#f3f4f6'}` }}>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{vax.vaccine}</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>{vax.dose}</div>
                          </div>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: sc.bg, color: sc.color, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>
                            {sc.icon} {sc.label}
                          </span>
                        </div>
                        {vax.next_due && (
                          <div style={{ fontSize: 12, color: overdue ? '#dc2626' : '#374151', fontWeight: overdue ? 700 : 400, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={12} />
                            {overdue ? 'Was due: ' : 'Due: '}
                            {new Date(vax.next_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}
                        <Button size="sm" className="w-100 border-0"
                          style={{ background: overdue ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', fontSize: 12, fontWeight: 600 }}
                          onClick={() => navigate('/user/appointments')}>
                          {overdue ? '⚠ Schedule Immediately' : 'Schedule Appointment'} <ChevronRight size={13} />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* History */}
        <Col xs={12} lg={7}>
          <Card className="border rounded-4 h-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-4">
              <h6 className="fw-bold mb-3" style={{ fontSize: 14, color: '#111827' }}>
                <CheckCircle size={15} className="me-2" style={{ color: '#22c55e' }} />
                Vaccination History ({completed.length} completed)
              </h6>
              {loading ? (
                <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '30px 0' }}>Loading…</div>
              ) : completed.length === 0 ? (
                <div className="text-center py-4" style={{ color: '#9ca3af' }}>
                  <CheckCircle size={32} className="mb-2" />
                  <div style={{ fontSize: 13 }}>No completed vaccinations yet</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Ask your health center to record your vaccines.</div>
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {completed.map((vax) => {
                    const vc = VACCINE_COLORS[vax.vaccine] || '#6b7280';
                    return (
                      <div key={vax.id}
                        className="d-flex align-items-center justify-content-between p-3 rounded-3"
                        style={{ backgroundColor: '#f9fafb', cursor: 'pointer', borderLeft: `4px solid ${vc}` }}
                        onClick={() => setShowView(vax)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}>
                        <div className="d-flex align-items-center gap-3">
                          <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: `${vc}22`, color: vc, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Syringe size={16} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{vax.vaccine}</div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>
                              {vax.dose} &nbsp;•&nbsp;
                              {vax.date ? new Date(vax.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </div>
                            {vax.administered_by && (
                              <div style={{ fontSize: 11, color: '#9ca3af' }}>Given by: {vax.administered_by}</div>
                            )}
                          </div>
                        </div>
                        <Eye size={14} color="#9ca3af" />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* View Detail Modal */}
      <Modal show={!!showView} onHide={() => setShowView(null)} centered>
        {showView && (() => {
          const vc = VACCINE_COLORS[showView.vaccine] || '#6b7280';
          const sc = getVaxStatus(showView);
          return (
            <>
              <Modal.Header closeButton style={{ borderBottom: `3px solid ${vc}` }}>
                <Modal.Title style={{ fontSize: 15, fontWeight: 700 }}>
                  <Syringe size={16} className="me-2" style={{ color: vc }} />
                  Vaccination Details
                </Modal.Title>
              </Modal.Header>
              <Modal.Body className="p-0">
                <div style={{ background: `linear-gradient(135deg, ${vc}18, ${vc}08)`, padding: '20px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: `${vc}22`, color: vc, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <Syringe size={28} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>{showView.vaccine}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{showView.dose}</div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: sc.bg, color: sc.color, fontWeight: 700, fontSize: 11, padding: '4px 14px', borderRadius: 999 }}>
                    {sc.icon} {sc.label}
                  </span>
                </div>
                <div className="p-4 d-flex flex-column gap-3">
                  {[
                    { icon: <Calendar size={16} color="#1d4ed8" />, label: 'Date Administered',
                      value: showView.date ? new Date(showView.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '—' },
                    showView.next_due && { icon: <Clock size={16} color="#f59e0b" />, label: 'Next Due',
                      value: new Date(showView.next_due).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) },
                    { icon: <User size={16} color="#7c3aed" />, label: 'Administered By', value: showView.administered_by || '—' },
                    { icon: <MapPin size={16} color="#dc2626" />, label: 'Injection Site', value: showView.site || '—' },
                    showView.notes && { icon: <Info size={16} color="#6b7280" />, label: 'Remarks', value: showView.notes },
                  ].filter(Boolean).map((row, i) => (
                    <div key={i} style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flexShrink: 0, marginTop: 2 }}>{row.icon}</div>
                      <div>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{row.label}</div>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{row.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button size="sm" variant="light" className="border d-flex align-items-center gap-1"
                  onClick={printVaccineCard} style={{ fontSize: 12 }}>
                  <Printer size={13} /> Print Card
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setShowView(null)}>Close</Button>
              </Modal.Footer>
            </>
          );
        })()}
      </Modal>
    </div>
  );
};

export default UserVaccinations;
