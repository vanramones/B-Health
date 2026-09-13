import React from 'react';
import { Card, Row, Col, Button } from 'react-bootstrap';
import {
  Phone, MapPin, Clock, AlertTriangle, Ambulance, Hospital,
  Shield, Heart, Copy, ExternalLink,
} from 'lucide-react';

const emergencyContacts = [
  {
    id: 1,
    name: 'Barangay Health Center',
    type: 'Primary Health',
    phone: '(02) 8123-4567',
    mobile: '+63 917 123 4567',
    address: '123 Barangay Main St., Manila',
    hours: '24/7',
    icon: Hospital,
    color: '#1d4ed8',
    bgColor: '#dbeafe',
  },
  {
    id: 2,
    name: 'Emergency Hotline',
    type: 'Emergency Services',
    phone: '911',
    mobile: '911',
    address: 'National Emergency',
    hours: '24/7',
    icon: AlertTriangle,
    color: '#dc2626',
    bgColor: '#fee2e2',
  },
  {
    id: 3,
    name: 'Ambulance Services',
    type: 'Medical Transport',
    phone: '(02) 8117-1111',
    mobile: '+63 917 117 1111',
    address: 'Nearest Hospital Dispatch',
    hours: '24/7',
    icon: Ambulance,
    color: '#ea580c',
    bgColor: '#ffedd5',
  },
  {
    id: 4,
    name: 'Philippine Red Cross',
    type: 'Humanitarian Aid',
    phone: '143',
    mobile: '(02) 8790-2300',
    address: '37 EDSA, Mandaluyong City',
    hours: '24/7',
    icon: Heart,
    color: '#dc2626',
    bgColor: '#fee2e2',
  },
];

const personalEmergencyContacts = [
  { id: 1, name: 'Juan Santos', relationship: 'Spouse', phone: '+63 917 555 1234' },
  { id: 2, name: 'Ana Santos', relationship: 'Daughter', phone: '+63 918 555 5678' },
];

const UserEmergencyContact = () => {
  const handleCopyNumber = (number) => {
    navigator.clipboard.writeText(number.replace(/[^0-9+]/g, ''));
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: '#111827' }}>Emergency Contacts</h4>
          <p className="mb-0" style={{ fontSize: 13, color: '#6b7280' }}>
            Important contact numbers for emergencies and health services
          </p>
        </div>
      </div>

      {/* Emergency Alert Banner */}
      <Card
        className="border-0 rounded-4 mb-4"
        style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
        }}
      >
        <Card.Body className="p-4">
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
              style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <Phone size={28} color="#fff" />
            </div>
            <div className="text-white">
              <h5 className="fw-bold mb-1">In case of emergency, call 911</h5>
              <p className="mb-0" style={{ fontSize: 13, opacity: 0.9 }}>
                For life-threatening emergencies, call immediately
              </p>
            </div>
            <Button
              variant="light"
              className="ms-auto d-flex align-items-center gap-2 fw-semibold"
              style={{ fontSize: 14 }}
              href="tel:911"
            >
              <Phone size={18} /> Call Now
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Emergency Services Grid */}
      <h6 className="fw-bold mb-3" style={{ fontSize: 14, color: '#111827' }}>
        <Shield size={16} className="me-2" style={{ color: '#1d4ed8' }} />
        Emergency Services
      </h6>
      <Row className="g-3 mb-4">
        {emergencyContacts.map((contact) => {
          const IconComponent = contact.icon;
          return (
            <Col key={contact.id} xs={12} md={6}>
              <Card className="border rounded-4 h-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <Card.Body className="p-4">
                  <div className="d-flex align-items-start gap-3 mb-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                      style={{ width: 48, height: 48, backgroundColor: contact.bgColor, color: contact.color }}
                    >
                      <IconComponent size={24} />
                    </div>
                    <div>
                      <h6 className="fw-bold mb-0" style={{ fontSize: 15, color: '#111827' }}>{contact.name}</h6>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{contact.type}</span>
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-2 mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <Phone size={14} style={{ color: '#6b7280' }} />
                      <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{contact.phone}</span>
                      <Button
                        size="sm"
                        variant="light"
                        className="border-0 p-1 ms-auto"
                        onClick={() => handleCopyNumber(contact.phone)}
                        title="Copy number"
                      >
                        <Copy size={14} />
                      </Button>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <MapPin size={14} style={{ color: '#6b7280' }} />
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{contact.address}</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <Clock size={14} style={{ color: '#6b7280' }} />
                      <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 500 }}>{contact.hours}</span>
                    </div>
                  </div>

                  <Button
                    variant="light"
                    className="w-100 d-flex align-items-center justify-content-center gap-2 border"
                    style={{ fontSize: 13 }}
                    href={`tel:${contact.mobile.replace(/[^0-9+]/g, '')}`}
                  >
                    <Phone size={16} /> Call
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Personal Emergency Contacts */}
      <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold mb-0" style={{ fontSize: 14, color: '#111827' }}>
              <Heart size={16} className="me-2" style={{ color: '#ec4899' }} />
              My Emergency Contacts
            </h6>
            <Button size="sm" variant="light" className="border" style={{ fontSize: 12 }}>
              + Add Contact
            </Button>
          </div>

          <div className="d-flex flex-column gap-2">
            {personalEmergencyContacts.map((contact) => (
              <div
                key={contact.id}
                className="d-flex align-items-center justify-content-between p-3 rounded-3"
                style={{ backgroundColor: '#f9fafb' }}
              >
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: 40,
                      height: 40,
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {contact.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="fw-semibold" style={{ fontSize: 14, color: '#111827' }}>{contact.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{contact.relationship} • {contact.phone}</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="light"
                  className="border-0 d-flex align-items-center gap-1"
                  style={{ fontSize: 12 }}
                  href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                >
                  <Phone size={14} />
                </Button>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default UserEmergencyContact;
