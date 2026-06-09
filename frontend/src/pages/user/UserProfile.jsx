import React, { useState } from 'react';
import { Card, Row, Col, Button, Form, Badge, Modal } from 'react-bootstrap';
import {
  User, Mail, Phone, MapPin, Calendar, Heart, Shield,
  Edit3, Save, Camera, AlertTriangle, CheckCircle,
} from 'lucide-react';

const UserProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const [profile, setProfile] = useState({
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria.santos@email.com',
    phone: '09123456789',
    birthdate: '1990-05-15',
    gender: 'Female',
    bloodType: 'O+',
    address: '123 Sampaguita St., Barangay San Juan, City',
    civilStatus: 'Married',
    occupation: 'Teacher',
    philhealthNo: '12-345678901-2',
  });

  const [emergencyContact, setEmergencyContact] = useState({
    name: 'Juan Santos',
    relationship: 'Spouse',
    phone: '09187654321',
  });

  const handleSave = () => {
    setIsEditing(false);
    // In real app, save to API
  };

  const handleEmergencySave = () => {
    setShowEmergencyModal(false);
    // In real app, save to API
  };

  const getAge = (birthdate) => {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: '#111827' }}>My Profile</h4>
          <p className="mb-0" style={{ fontSize: 13, color: '#6b7280' }}>
            Manage your personal information and preferences
          </p>
        </div>
        {!isEditing ? (
          <Button
            className="d-flex align-items-center gap-2 border-0"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', fontSize: 13, fontWeight: 600 }}
            onClick={() => setIsEditing(true)}
          >
            <Edit3 size={16} /> Edit Profile
          </Button>
        ) : (
          <div className="d-flex gap-2">
            <Button
              variant="light"
              className="border"
              style={{ fontSize: 13 }}
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button
              className="d-flex align-items-center gap-2 border-0"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', fontSize: 13, fontWeight: 600 }}
              onClick={handleSave}
            >
              <Save size={16} /> Save Changes
            </Button>
          </div>
        )}
      </div>

      <Row className="g-4">
        {/* Profile Card */}
        <Col xs={12} lg={4}>
          <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-4 text-center">
              <div className="position-relative d-inline-block mb-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold mx-auto"
                  style={{
                    width: 100,
                    height: 100,
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    fontSize: 32,
                  }}
                >
                  {profile.firstName[0]}{profile.lastName[0]}
                </div>
                {isEditing && (
                  <button
                    type="button"
                    className="position-absolute d-flex align-items-center justify-content-center rounded-circle border-0"
                    style={{
                      width: 32,
                      height: 32,
                      backgroundColor: '#fff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      bottom: 0,
                      right: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <Camera size={16} color="#6b7280" />
                  </button>
                )}
              </div>

              <h5 className="fw-bold mb-1" style={{ color: '#111827' }}>
                {profile.firstName} {profile.lastName}
              </h5>
              <p className="mb-3" style={{ fontSize: 13, color: '#6b7280' }}>{profile.email}</p>

              <div className="d-flex justify-content-center gap-2 flex-wrap">
                <Badge style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: 11 }}>
                  {getAge(profile.birthdate)} years old
                </Badge>
                <Badge style={{ backgroundColor: '#fce7f3', color: '#be185d', fontSize: 11 }}>
                  {profile.gender}
                </Badge>
                <Badge style={{ backgroundColor: '#fee2e2', color: '#991b1b', fontSize: 11 }}>
                  <Heart size={10} className="me-1" /> {profile.bloodType}
                </Badge>
              </div>
            </Card.Body>
          </Card>

          {/* Emergency Contact Card */}
          <Card className="border rounded-4 mt-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0" style={{ fontSize: 14, color: '#111827' }}>
                  <AlertTriangle size={16} className="me-2" style={{ color: '#dc2626' }} />
                  Emergency Contact
                </h6>
                <Button
                  size="sm"
                  variant="light"
                  className="border-0"
                  style={{ fontSize: 11 }}
                  onClick={() => setShowEmergencyModal(true)}
                >
                  <Edit3 size={12} />
                </Button>
              </div>

              <div className="d-flex flex-column gap-2">
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>NAME</div>
                  <div style={{ fontSize: 13, color: '#374151' }}>{emergencyContact.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>RELATIONSHIP</div>
                  <div style={{ fontSize: 13, color: '#374151' }}>{emergencyContact.relationship}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>PHONE</div>
                  <div style={{ fontSize: 13, color: '#374151' }}>{emergencyContact.phone}</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Personal Information */}
        <Col xs={12} lg={8}>
          <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-4">
              <h6 className="fw-bold mb-4" style={{ fontSize: 14, color: '#111827' }}>
                <User size={16} className="me-2" style={{ color: '#1d4ed8' }} />
                Personal Information
              </h6>

              <Row className="g-3">
                <Col xs={12} md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>First Name</Form.Label>
                    <Form.Control
                      size="sm"
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      disabled={!isEditing}
                      style={{ fontSize: 13 }}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Last Name</Form.Label>
                    <Form.Control
                      size="sm"
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      disabled={!isEditing}
                      style={{ fontSize: 13 }}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                      <Mail size={12} className="me-1" /> Email Address
                    </Form.Label>
                    <Form.Control
                      type="email"
                      size="sm"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      disabled={!isEditing}
                      style={{ fontSize: 13 }}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                      <Phone size={12} className="me-1" /> Phone Number
                    </Form.Label>
                    <Form.Control
                      size="sm"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      disabled={!isEditing}
                      style={{ fontSize: 13 }}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                      <Calendar size={12} className="me-1" /> Date of Birth
                    </Form.Label>
                    <Form.Control
                      type="date"
                      size="sm"
                      value={profile.birthdate}
                      onChange={(e) => setProfile({ ...profile, birthdate: e.target.value })}
                      disabled={!isEditing}
                      style={{ fontSize: 13 }}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Gender</Form.Label>
                    <Form.Select
                      size="sm"
                      value={profile.gender}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      disabled={!isEditing}
                      style={{ fontSize: 13 }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                      <MapPin size={12} className="me-1" /> Address
                    </Form.Label>
                    <Form.Control
                      size="sm"
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      disabled={!isEditing}
                      style={{ fontSize: 13 }}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Medical Information */}
          <Card className="border rounded-4 mt-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-4">
              <h6 className="fw-bold mb-4" style={{ fontSize: 14, color: '#111827' }}>
                <Heart size={16} className="me-2" style={{ color: '#dc2626' }} />
                Medical Information
              </h6>

              <Row className="g-3">
                <Col xs={12} md={4}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Blood Type</Form.Label>
                    <Form.Select
                      size="sm"
                      value={profile.bloodType}
                      onChange={(e) => setProfile({ ...profile, bloodType: e.target.value })}
                      disabled={!isEditing}
                      style={{ fontSize: 13 }}
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Civil Status</Form.Label>
                    <Form.Select
                      size="sm"
                      value={profile.civilStatus}
                      onChange={(e) => setProfile({ ...profile, civilStatus: e.target.value })}
                      disabled={!isEditing}
                      style={{ fontSize: 13 }}
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Occupation</Form.Label>
                    <Form.Control
                      size="sm"
                      value={profile.occupation}
                      onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
                      disabled={!isEditing}
                      style={{ fontSize: 13 }}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                      <Shield size={12} className="me-1" /> PhilHealth Number
                    </Form.Label>
                    <Form.Control
                      size="sm"
                      value={profile.philhealthNo}
                      onChange={(e) => setProfile({ ...profile, philhealthNo: e.target.value })}
                      disabled={!isEditing}
                      style={{ fontSize: 13 }}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Emergency Contact Modal */}
      <Modal show={showEmergencyModal} onHide={() => setShowEmergencyModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }}>
            <AlertTriangle size={18} className="me-2" style={{ color: '#dc2626' }} />
            Edit Emergency Contact
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col xs={12}>
              <Form.Group>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Contact Name</Form.Label>
                <Form.Control
                  size="sm"
                  value={emergencyContact.name}
                  onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })}
                  style={{ fontSize: 13 }}
                />
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Relationship</Form.Label>
                <Form.Select
                  size="sm"
                  value={emergencyContact.relationship}
                  onChange={(e) => setEmergencyContact({ ...emergencyContact, relationship: e.target.value })}
                  style={{ fontSize: 13 }}
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Child">Child</option>
                  <option value="Relative">Relative</option>
                  <option value="Friend">Friend</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group>
                <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Phone Number</Form.Label>
                <Form.Control
                  size="sm"
                  value={emergencyContact.phone}
                  onChange={(e) => setEmergencyContact({ ...emergencyContact, phone: e.target.value })}
                  style={{ fontSize: 13 }}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setShowEmergencyModal(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="border-0"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            onClick={handleEmergencySave}
          >
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UserProfile;
