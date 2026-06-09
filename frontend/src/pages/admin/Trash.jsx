import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { Card, Row, Col, Button, Badge } from 'react-bootstrap';
import { Trash2, RotateCcw, X, Calendar, Users, Syringe, Megaphone, FileText, Heart, Bell, Phone } from 'lucide-react';

const CATEGORIES = [
  { key: 'appointments',     label: 'Appointments',      icon: <Calendar  size={15} />, endpoint: '/appointments',     nameKey: 'name',    subKey: 'service'   },
  { key: 'residents',        label: 'Residents',         icon: <Users     size={15} />, endpoint: '/residents',        nameKey: 'name',    subKey: 'condition' },
  { key: 'health-records',   label: 'Health Records',    icon: <FileText  size={15} />, endpoint: '/health-records',   nameKey: 'patient', subKey: 'diagnosis' },
  { key: 'vaccinations',     label: 'Vaccinations',      icon: <Syringe   size={15} />, endpoint: '/vaccinations',     nameKey: 'patient', subKey: 'vaccine'   },
  { key: 'announcements',    label: 'Announcements',     icon: <Megaphone size={15} />, endpoint: '/announcements',    nameKey: 'title',   subKey: 'category'  },
  { key: 'notifications',    label: 'Notifications',     icon: <Bell      size={15} />, endpoint: '/notifications',    nameKey: 'title',   subKey: 'type'      },
  { key: 'emergency-contacts',label: 'Emergency Contacts',icon: <Phone    size={15} />, endpoint: '/emergency-contacts',nameKey: 'name',   subKey: 'category'  },
  { key: 'services',         label: 'Services',          icon: <Heart     size={15} />, endpoint: '/services',         nameKey: 'name',    subKey: 'category'  },
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const Trash = () => {
  const [active, setActive]     = useState('appointments');
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [acting, setActing]     = useState(null);
  const [counts, setCounts]     = useState({});

  const cat = CATEGORIES.find((c) => c.key === active);

  const loadCounts = useCallback(async () => {
    const results = await Promise.allSettled(
      CATEGORIES.map((c) => api.get(`${c.endpoint}/trash`))
    );
    const map = {};
    CATEGORIES.forEach((c, i) => {
      const r = results[i];
      map[c.key] = r.status === 'fulfilled' && Array.isArray(r.value) ? r.value.length : 0;
    });
    setCounts(map);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`${cat.endpoint}/trash`);
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    setLoading(false);
  }, [cat]);

  useEffect(() => { loadCounts(); }, [loadCounts]);
  useEffect(() => { load(); }, [load]);

  const restore = async (id) => {
    setActing(id);
    try {
      await api.patch(`${cat.endpoint}/trash/${id}/restore`);
      await load();
      await loadCounts();
    } catch { /* ignore */ }
    setActing(null);
  };

  const purge = async (id) => {
    if (!window.confirm('Permanently delete this record? This cannot be undone.')) return;
    setActing(id);
    try {
      await api.delete(`${cat.endpoint}/trash/${id}/purge`);
      await load();
      await loadCounts();
    } catch { /* ignore */ }
    setActing(null);
  };

  const totalInTrash = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div className="p-3 p-md-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="d-flex align-items-center justify-content-center rounded-3"
          style={{ width: 40, height: 40, backgroundColor: '#fee2e2' }}>
          <Trash2 size={20} color="#dc2626" />
        </div>
        <div>
          <h5 className="fw-bold mb-0" style={{ color: '#111827' }}>
            Trash
            {totalInTrash > 0 && (
              <Badge pill className="ms-2" style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: 12 }}>
                {totalInTrash}
              </Badge>
            )}
          </h5>
          <p className="mb-0" style={{ fontSize: 12, color: '#6b7280' }}>
            Deleted records — restore or permanently delete them
          </p>
        </div>
      </div>

      {/* Category stat cards */}
      <Row className="g-2 g-md-3 mb-3">
        {CATEGORIES.map((c) => {
          const cnt   = counts[c.key] || 0;
          const isAct = active === c.key;
          return (
            <Col key={c.key} xs={6} sm={4} md={3}>
              <Card
                className="border rounded-4 bh-card-hover"
                onClick={() => setActive(c.key)}
                style={{
                  boxShadow: isAct ? '0 0 0 2px #dc2626' : '0 1px 4px rgba(0,0,0,0.06)',
                  backgroundColor: isAct ? '#fff5f5' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Card.Body className="p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center justify-content-center rounded-3"
                      style={{ width: 34, height: 34, backgroundColor: isAct ? '#fee2e2' : '#f3f4f6', color: isAct ? '#dc2626' : '#6b7280' }}>
                      {c.icon}
                    </div>
                    {cnt > 0 && (
                      <span style={{
                        backgroundColor: '#dc2626', color: '#fff',
                        fontSize: 11, fontWeight: 700, borderRadius: 999,
                        padding: '2px 8px',
                      }}>
                        {cnt}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: isAct ? '#dc2626' : '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {c.label}
                  </div>
                  <div className="fw-bold" style={{ fontSize: 22, color: isAct ? '#dc2626' : '#111827', lineHeight: 1.1 }}>
                    {cnt}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Items */}
      <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <Card.Body className="p-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="fw-semibold" style={{ fontSize: 14, color: '#111827' }}>
              {cat.label} in Trash
              {items.length > 0 && (
                <Badge pill className="ms-2" style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontSize: 11 }}>
                  {items.length}
                </Badge>
              )}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-5" style={{ color: '#9ca3af', fontSize: 14 }}>Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-5">
              <Trash2 size={36} color="#d1d5db" className="mb-2" />
              <div style={{ fontSize: 14, color: '#9ca3af' }}>No deleted {cat.label.toLowerCase()}</div>
            </div>
          ) : (
            <Row className="g-2">
              {items.map((item) => (
                <Col key={item.id} xs={12} md={6} lg={4}>
                  <div className="p-3 rounded-3 d-flex align-items-start gap-3"
                    style={{ backgroundColor: '#fff5f5', border: '1px solid #fecaca' }}>
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="fw-semibold text-truncate" style={{ fontSize: 13, color: '#111827' }}>
                        {item[cat.nameKey] || '—'}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{item[cat.subKey] || '—'}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                        Deleted {timeAgo(item.deleted_at)}
                      </div>
                    </div>
                    <div className="d-flex flex-column gap-1 flex-shrink-0">
                      <Button size="sm" variant="light" className="border-0 d-flex align-items-center gap-1 px-2"
                        style={{ fontSize: 11, color: '#16a34a', backgroundColor: '#dcfce7' }}
                        disabled={acting === item.id}
                        onClick={() => restore(item.id)}>
                        <RotateCcw size={12} /> Restore
                      </Button>
                      <Button size="sm" variant="light" className="border-0 d-flex align-items-center gap-1 px-2"
                        style={{ fontSize: 11, color: '#dc2626', backgroundColor: '#fee2e2' }}
                        disabled={acting === item.id}
                        onClick={() => purge(item.id)}>
                        <X size={12} /> Delete
                      </Button>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default Trash;
