import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Badge, Modal } from 'react-bootstrap';
import {
  Activity, Heart, Stethoscope, Baby, Syringe, Pill, Eye, Bone,
  Calendar, Clock, MapPin, Phone, ChevronRight, CheckCircle,
} from 'lucide-react';
import { userApi } from '../../context/UserAuthContext';

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
  '#16a34a', '#3b82f6', '#ec4899', '#f472b6', '#a855f7', '#0ea5e9',
  '#84cc16', '#f59e0b', '#8b5cf6', '#dc2626', '#06b6d4',
];

const UserHealthServices = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const data = await userApi.get('/services');
        const formatted = Array.isArray(data) ? data.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description || 'Service description',
          icon: iconMap[s.icon] || Heart,
          color: s.accent || '#1d4ed8',
          bgColor: `${s.accent || '#1d4ed8'}1a`,
          availability: s.schedule || 'By Appointment',
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
          <h4 className="fw-bold mb-1" style={{ color: '#111827' }}>Health Services</h4>
          <p className="mb-0" style={{ fontSize: 13, color: '#6b7280' }}>
            Available health services at Barangay Health Center
          </p>
        </div>
      </div>

      {/* Services Info Card */}
      <Card
        className="border-0 rounded-4 mb-4"
        style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          boxShadow: '0 4px 20px rgba(29, 78, 216, 0.3)',
        }}
      >
        <Card.Body className="p-4">
          <Row className="align-items-center">
            <Col md={8}>
              <div className="text-white">
                <h5 className="fw-bold mb-2">Barangay Health Center</h5>
                <div className="d-flex flex-column gap-1" style={{ fontSize: 13, opacity: 0.9 }}>
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
      <h6 className="fw-bold mb-3" style={{ fontSize: 14, color: '#111827' }}>
        <Activity size={16} className="me-2" style={{ color: '#1d4ed8' }} />
        Available Services
      </h6>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
          Loading services...
        </div>
      ) : services.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
          No services available at the moment.
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
                  <h6 className="fw-bold mb-2" style={{ fontSize: 14, color: '#111827' }}>{service.name}</h6>
                  <p className="mb-3" style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                    {service.description}
                  </p>
                  <div className="d-flex align-items-center justify-content-between">
                    <Badge
                      style={{
                        backgroundColor: service.fee === 'Free' ? '#dbeafe' : '#fef3c7',
                        color: service.fee === 'Free' ? '#1e40af' : '#92400e',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {service.fee}
                    </Badge>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                      <Clock size={12} className="me-1" />
                      {service.availability}
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
                </Row>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                className="w-100 border-0"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', fontSize: 13, color: '#fff' }}
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
