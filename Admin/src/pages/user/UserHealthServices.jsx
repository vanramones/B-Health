import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Badge, Modal } from 'react-bootstrap';
import {
  Activity, Heart, Stethoscope, Baby, Syringe, Pill, Eye, Bone,
  Calendar, Clock, MapPin, Phone, ChevronRight, CheckCircle,
} from 'lucide-react';
import { userApi } from '../../context/UserAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../config/supabase';
import { TIME_SLOTS, todayISO } from '../../utils/timeSlots';

const slotColor = (left, cap) => (cap === 0 || left === 0 ? '#dc2626' : left / cap <= 0.3 ? '#d97706' : '#16a34a');

const iconMap = {
  heart: Heart,
  baby: Baby,
  syringe: Syringe,
  users: Activity,
  stethoscope: Stethoscope,
  bug: Eye,
  'hand-heart': Pill,
  accessibility: Activity,
  activity: Activity,
  sparkles: Activity,
};

const accentPalette = [
  '#16a34a', '#0f172a', '#ec4899', '#f472b6', '#a855f7', '#0ea5e9',
  '#84cc16', '#f59e0b', '#8b5cf6', '#dc2626', '#06b6d4',
];

const UserHealthServices = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [slotDate, setSlotDate] = useState(todayISO());
  const [avail, setAvail] = useState({});

  // Remaining slots per service for the chosen date; refreshes live on any booking change
  useEffect(() => {
    const load = () => userApi.get(`/user/availability?date=${slotDate}`).then(setAvail).catch(() => setAvail({}));
    load();
    const channel = supabase
      .channel(`service-slots-${slotDate}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [slotDate]);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const data = await userApi.get('/services');
        const formatted = Array.isArray(data) ? data.filter((s) => s.is_active !== false).map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category || 'General',
          description: s.description || 'Service description',
          icon: iconMap[s.icon] || Heart,
          color: s.accent || '#0f172a',
          bgColor: `${s.accent || '#0f172a'}1a`,
          availability: s.schedule || 'By Appointment',
          location: s.location || 'Barangay Health Center',
          staff: s.staff || 'Health Center Staff',
          fee: 'Free',
        })) : [];
        setServices(formatted);
      } catch {
        setServices([]);
      }
      setLoading(false);
    };
    fetchServices();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: '#111827' }}>{t('healthServices')}</h4>
          <p className="mb-0" style={{ fontSize: 13, color: '#6b7280' }}>
            {t('availableServices')}
          </p>
        </div>
      </div>

      {/* Services Info Card */}
      <Card
        className="border-0 rounded-4 mb-4"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.3)',
        }}
      >
        <Card.Body className="p-4">
          <Row className="align-items-center">
            <Col md={8}>
              <div style={{ color: '#ffffff' }}>
                <h5 className="fw-bold mb-2" style={{ color: '#ffffff' }}>Barangay Health Center</h5>
                <div className="d-flex flex-column gap-1" style={{ fontSize: 13, color: '#e5e7eb' }}>
                  <div className="d-flex align-items-center gap-2">
                    <MapPin size={14} /> 123 Barangay Main St., Manila
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Clock size={14} /> Open: Monday - Saturday, 8:00 AM - 5:00 PM
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Phone size={14} /> (02) 8123-4567
                  </div>
                </div>
              </div>
            </Col>
            <Col md={4} className="text-md-end mt-3 mt-md-0">
              <Button
                variant="light"
                className="fw-semibold d-flex align-items-center gap-2 ms-md-auto"
                style={{ fontSize: 13 }}
                onClick={() => navigate('/user/appointments')}
              >
                <Calendar size={16} /> Book Appointment
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Services Grid */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h6 className="fw-bold mb-0" style={{ fontSize: 14, color: '#111827' }}>
          <Activity size={16} className="me-2" style={{ color: '#0f172a' }} />
          {t('availableServices')}
        </h6>
        <div className="d-flex align-items-center gap-2" style={{ fontSize: 12, color: '#6b7280' }}>
          Slots for
          <input type="date" value={slotDate} min={todayISO()} onChange={(e) => e.target.value && setSlotDate(e.target.value)}
            style={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px 8px' }} />
        </div>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
          {t('loading')}
        </div>
      ) : services.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
          {t('noData')}
        </div>
      ) : (
      <Row className="g-3">
        {services.map((service) => {
          const IconComponent = service.icon;
          return (
            <Col key={service.id} xs={12} sm={6} lg={4}>
              <Card
                className="border rounded-4 h-100"
                style={{
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => setSelectedService(service)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Card.Body className="p-4">
                  <div className="d-flex align-items-start justify-content-between mb-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3"
                      style={{ width: 48, height: 48, backgroundColor: service.bgColor, color: service.color }}
                    >
                      <IconComponent size={24} />
                    </div>
                    <ChevronRight size={18} style={{ color: '#9ca3af' }} />
                  </div>
                  <h6 className="fw-bold mb-1" style={{ fontSize: 14, color: '#111827' }}>{service.name}</h6>
                  <span className="d-inline-block mb-2" style={{
                    fontSize: 10, fontWeight: 700, color: service.color, backgroundColor: service.bgColor,
                    padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {service.category}
                  </span>
                  <p className="mb-3" style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                    {service.description}
                  </p>
                  <div className="d-flex flex-column gap-1 mb-3 p-2 rounded-3" style={{ backgroundColor: '#f9fafb', fontSize: 12, color: '#374151' }}>
                    <div className="d-flex align-items-start gap-2"><Clock size={13} className="flex-shrink-0 mt-1" style={{ color: service.color }} /><span><strong>Schedule:</strong> {service.availability}</span></div>
                    <div className="d-flex align-items-start gap-2"><MapPin size={13} className="flex-shrink-0 mt-1" style={{ color: service.color }} /><span><strong>Location:</strong> {service.location}</span></div>
                    <div className="d-flex align-items-start gap-2"><Stethoscope size={13} className="flex-shrink-0 mt-1" style={{ color: service.color }} /><span><strong>Staff:</strong> {service.staff}</span></div>
                  </div>
                  {avail[service.name] && (() => {
                    const a = avail[service.name];
                    const c = slotColor(a.left, a.capacity);
                    return (
                      <div className="mb-3">
                        <div className="d-flex justify-content-between" style={{ fontSize: 11, fontWeight: 600 }}>
                          <span style={{ color: c }}>{a.left === 0 ? 'Fully booked (whole day)' : `${a.left} slot${a.left !== 1 ? 's' : ''} left (whole day)`}</span>
                          <span style={{ color: '#9ca3af' }}>{a.booked} / {a.capacity} booked</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 5, backgroundColor: '#f1f5f9', marginTop: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${a.capacity ? (a.booked / a.capacity) * 100 : 100}%`, height: '100%', backgroundColor: c }} />
                        </div>
                      </div>
                    );
                  })()}
                  <div className="d-flex align-items-center justify-content-between">
                    <Badge
                      style={{
                        backgroundColor: service.fee === 'Free' ? '#f1f5f9' : '#fef3c7',
                        color: service.fee === 'Free' ? '#0f172a' : '#92400e',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {service.fee}
                    </Badge>
                    <span style={{ fontSize: 11, color: service.color, fontWeight: 600 }}>
                      Tap for time slots <ChevronRight size={12} />
                    </span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
      )}

      {/* Service Detail Modal */}
      <Modal show={!!selectedService} onHide={() => setSelectedService(null)} centered>
        {selectedService && (
          <>
            <Modal.Header closeButton>
              <Modal.Title style={{ fontSize: 16 }}>
                <selectedService.icon size={18} className="me-2" style={{ color: selectedService.color }} />
                {selectedService.name}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="text-center mb-4">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                  style={{ width: 64, height: 64, backgroundColor: selectedService.bgColor, color: selectedService.color }}
                >
                  <selectedService.icon size={28} />
                </div>
              </div>

              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, textAlign: 'center' }}>
                {selectedService.description}
              </p>

              <div className="rounded-3 p-3 mt-3" style={{ backgroundColor: '#f9fafb' }}>
                <Row className="g-3">
                  <Col xs={6}>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>AVAILABILITY</div>
                    <div className="d-flex align-items-center gap-1" style={{ fontSize: 13, color: '#374151' }}>
                      <Clock size={14} /> {selectedService.availability}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>FEE</div>
                    <div className="d-flex align-items-center gap-1" style={{ fontSize: 13, color: '#374151' }}>
                      <CheckCircle size={14} style={{ color: '#22c55e' }} /> {selectedService.fee}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>LOCATION</div>
                    <div className="d-flex align-items-center gap-1" style={{ fontSize: 13, color: '#374151' }}>
                      <MapPin size={14} /> {selectedService.location}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>STAFF</div>
                    <div className="d-flex align-items-center gap-1" style={{ fontSize: 13, color: '#374151' }}>
                      <Stethoscope size={14} /> {selectedService.staff}
                    </div>
                  </Col>
                  <Col xs={12}>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>CATEGORY</div>
                    <div style={{ fontSize: 13, color: '#374151' }}>{selectedService.category}</div>
                  </Col>
                </Row>
              </div>

              {avail[selectedService.name] && (
                <div className="mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-2 p-2 px-3 rounded-3"
                    style={{ backgroundColor: `${slotColor(avail[selectedService.name].left, avail[selectedService.name].capacity)}10` }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: slotColor(avail[selectedService.name].left, avail[selectedService.name].capacity) }}>
                      Whole day: {avail[selectedService.name].left} of {avail[selectedService.name].capacity} slots available
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 6 }}>
                    SLOTS LEFT PER TIME · {new Date(`${slotDate}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="d-flex flex-wrap gap-1">
                    {TIME_SLOTS.filter((tm) => avail[selectedService.name].times[tm].cap > 0).map((tm) => {
                      const x = avail[selectedService.name].times[tm];
                      const c = slotColor(x.left, x.cap);
                      return (
                        <span key={tm} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 999, border: `1px solid ${c}55`, color: c, backgroundColor: `${c}10`, fontWeight: 600 }}>
                          {tm} · {x.left === 0 ? 'Full' : `${x.left}/${x.cap}`}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                className="w-100 border-0"
                style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', fontSize: 13, color: '#fff' }}
                onClick={() => navigate('/user/appointments')}
              >
                <Calendar size={16} className="me-2" /> Book Appointment
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </div>
  );
};

export default UserHealthServices;
