import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Nav, Modal, Alert, Badge } from 'react-bootstrap';
import {
  Settings as SettingsIcon, User, Building2, Bell, Shield, Palette, Database,
  Save, Check, X, Eye, EyeOff, Camera, Mail, Phone, MapPin, Clock, Globe,
  Sun, Moon, Monitor, Lock, Key, RefreshCw, Download, Upload, Trash2, Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SETTINGS_KEY = 'bh_system_settings';

const defaultSettings = {
  clinic: {
    name: 'Barangay Health Center',
    address: '123 Barangay Street, City, Province',
    phone: '(02) 8123-4567',
    email: 'healthcenter@barangay.gov.ph',
    hours: '8:00 AM - 5:00 PM',
    days: 'Monday - Friday',
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: false,
    appointmentReminders: true,
    vaccinationAlerts: true,
    systemAlerts: true,
    weeklyReports: false,
  },
  display: {
    theme: 'light',
    compactMode: false,
    showAnimations: true,
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  },
  security: {
    sessionTimeout: 30,
    requirePasswordChange: false,
    twoFactorAuth: false,
    loginAttempts: 5,
  },
  data: {
    autoBackup: true,
    backupFrequency: 'daily',
    retentionDays: 90,
  },
};

const loadSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
};

const Settings = () => {
  const { user, updateAdmin, admins } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState(loadSettings);
  const [toast, setToast] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Profile form
  const currentAdmin = admins.find((a) => a.id === user?.id);
  const [profileForm, setProfileForm] = useState({
    name: currentAdmin?.name || '',
    email: currentAdmin?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (currentAdmin) {
      setProfileForm((prev) => ({
        ...prev,
        name: currentAdmin.name,
        email: currentAdmin.email,
      }));
    }
  }, [currentAdmin]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      showToast('danger', 'Name is required.');
      return;
    }

    // Check password change
    if (profileForm.newPassword) {
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        showToast('danger', 'New passwords do not match.');
        return;
      }
      if (profileForm.newPassword.length < 6) {
        showToast('danger', 'Password must be at least 6 characters.');
        return;
      }
      if (!profileForm.currentPassword) {
        showToast('danger', 'Current password is required to change password.');
        return;
      }
      if (currentAdmin && profileForm.currentPassword !== currentAdmin.password) {
        showToast('danger', 'Current password is incorrect.');
        return;
      }
    }

    const payload = {
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
    };
    if (profileForm.newPassword) {
      payload.password = profileForm.newPassword;
    }

    const result = updateAdmin(user.id, payload);
    if (result.ok) {
      showToast('success', 'Profile updated successfully!');
      setProfileForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } else {
      showToast('danger', result.error);
    }
  };

  const handleSettingChange = (category, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const handleResetSettings = () => {
    setSettings(defaultSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
    setShowConfirmReset(false);
    showToast('success', 'Settings reset to defaults.');
  };

  const handleExportData = () => {
    const data = {
      settings,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bhealth-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Settings exported successfully!');
  };

  const tabs = [
    { key: 'profile', label: 'My Profile', icon: <User size={16} /> },
    { key: 'clinic', label: 'Clinic Info', icon: <Building2 size={16} /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { key: 'display', label: 'Display', icon: <Palette size={16} /> },
    { key: 'security', label: 'Security', icon: <Shield size={16} /> },
    { key: 'data', label: 'Data & Backup', icon: <Database size={16} /> },
  ];

  return (
    <div className="p-3 p-md-4" style={{ backgroundColor: '#f8fafc' }}>
      {/* Toast */}
      {toast && (
        <Alert
          variant={toast.type}
          onClose={() => setToast(null)}
          dismissible
          className="position-fixed border-0 rounded-3 shadow-sm"
          style={{ top: 80, right: 20, zIndex: 1050, fontSize: 13, maxWidth: 350 }}
        >
          {toast.msg}
        </Alert>
      )}

      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6b7280, #4b5563)' }}
        >
          <SettingsIcon size={24} color="#fff" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold" style={{ color: '#111827' }}>Settings</h4>
          <p className="mb-0" style={{ fontSize: 13, color: '#6b7280' }}>
            Manage your profile and system preferences
          </p>
        </div>
      </div>

      <Row className="g-3">
        {/* Sidebar Navigation */}
        <Col xs={12} md={3}>
          <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-2">
              <Nav className="flex-column gap-1">
                {tabs.map((t) => (
                  <Nav.Link
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className="d-flex align-items-center gap-2 rounded-3 px-3 py-2"
                    style={{
                      fontSize: 13,
                      fontWeight: activeTab === t.key ? 600 : 500,
                      color: activeTab === t.key ? '#0f766e' : '#374151',
                      backgroundColor: activeTab === t.key ? '#ccfbf1' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {t.icon} {t.label}
                  </Nav.Link>
                ))}
              </Nav>
            </Card.Body>
          </Card>
        </Col>

        {/* Main Content */}
        <Col xs={12} md={9}>
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-4" style={{ fontSize: 16, color: '#111827' }}>
                  <User size={18} className="me-2" style={{ color: '#0f766e' }} />
                  My Profile
                </h5>

                {/* Avatar Section */}
                <div className="d-flex align-items-center gap-4 mb-4 pb-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold position-relative"
                    style={{
                      width: 80,
                      height: 80,
                      background: 'linear-gradient(135deg, #14b8a6, #0f766e)',
                      fontSize: 24,
                    }}
                  >
                    {user?.initials || 'AD'}
                    <button
                      type="button"
                      className="position-absolute d-flex align-items-center justify-content-center rounded-circle border-0"
                      style={{
                        width: 28,
                        height: 28,
                        backgroundColor: '#fff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        bottom: 0,
                        right: 0,
                        cursor: 'pointer',
                      }}
                      title="Change avatar"
                    >
                      <Camera size={14} color="#6b7280" />
                    </button>
                  </div>
                  <div>
                    <div className="fw-bold" style={{ fontSize: 18, color: '#111827' }}>{user?.name}</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>@{user?.username}</div>
                    <Badge
                      className="mt-1"
                      style={{
                        backgroundColor: user?.owner ? '#fef3c7' : '#dbeafe',
                        color: user?.owner ? '#92400e' : '#1d4ed8',
                        fontWeight: 600,
                        fontSize: 11,
                      }}
                    >
                      {user?.role}
                    </Badge>
                  </div>
                </div>

                <Form onSubmit={handleProfileSave}>
                  <Row className="g-3 mb-4">
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                          Full Name
                        </Form.Label>
                        <Form.Control
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          style={{ fontSize: 13 }}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                          Email Address
                        </Form.Label>
                        <Form.Control
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          style={{ fontSize: 13 }}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <h6 className="fw-bold mb-3" style={{ fontSize: 14, color: '#111827' }}>
                    <Lock size={14} className="me-2" />
                    Change Password
                  </h6>
                  <Row className="g-3 mb-4">
                    <Col xs={12} md={4}>
                      <Form.Group>
                        <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                          Current Password
                        </Form.Label>
                        <div className="position-relative">
                          <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            value={profileForm.currentPassword}
                            onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                            style={{ fontSize: 13, paddingRight: 40 }}
                            placeholder="Enter current"
                          />
                          <button
                            type="button"
                            className="position-absolute border-0 bg-transparent"
                            style={{ right: 10, top: '50%', transform: 'translateY(-50%)' }}
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff size={16} color="#9ca3af" /> : <Eye size={16} color="#9ca3af" />}
                          </button>
                        </div>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Group>
                        <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                          New Password
                        </Form.Label>
                        <Form.Control
                          type={showPassword ? 'text' : 'password'}
                          value={profileForm.newPassword}
                          onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                          style={{ fontSize: 13 }}
                          placeholder="Enter new"
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Group>
                        <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                          Confirm Password
                        </Form.Label>
                        <Form.Control
                          type={showPassword ? 'text' : 'password'}
                          value={profileForm.confirmPassword}
                          onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                          style={{ fontSize: 13 }}
                          placeholder="Confirm new"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="d-flex justify-content-end">
                    <Button
                      type="submit"
                      className="d-flex align-items-center gap-2 border-0"
                      style={{ background: 'linear-gradient(135deg, #14b8a6, #0f766e)', fontSize: 13, fontWeight: 600 }}
                    >
                      <Save size={14} /> Save Changes
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          )}

          {/* Clinic Info Tab */}
          {activeTab === 'clinic' && (
            <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-4" style={{ fontSize: 16, color: '#111827' }}>
                  <Building2 size={18} className="me-2" style={{ color: '#0f766e' }} />
                  Clinic Information
                </h5>

                <Row className="g-3 mb-4">
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        <Building2 size={12} className="me-1" /> Clinic Name
                      </Form.Label>
                      <Form.Control
                        value={settings.clinic.name}
                        onChange={(e) => handleSettingChange('clinic', 'name', e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        <MapPin size={12} className="me-1" /> Address
                      </Form.Label>
                      <Form.Control
                        value={settings.clinic.address}
                        onChange={(e) => handleSettingChange('clinic', 'address', e.target.value)}
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
                        value={settings.clinic.phone}
                        onChange={(e) => handleSettingChange('clinic', 'phone', e.target.value)}
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
                        value={settings.clinic.email}
                        onChange={(e) => handleSettingChange('clinic', 'email', e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        <Clock size={12} className="me-1" /> Operating Hours
                      </Form.Label>
                      <Form.Control
                        value={settings.clinic.hours}
                        onChange={(e) => handleSettingChange('clinic', 'hours', e.target.value)}
                        style={{ fontSize: 13 }}
                        placeholder="e.g., 8:00 AM - 5:00 PM"
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        <Clock size={12} className="me-1" /> Operating Days
                      </Form.Label>
                      <Form.Control
                        value={settings.clinic.days}
                        onChange={(e) => handleSettingChange('clinic', 'days', e.target.value)}
                        style={{ fontSize: 13 }}
                        placeholder="e.g., Monday - Friday"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex justify-content-end">
                  <Button
                    className="d-flex align-items-center gap-2 border-0"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #0f766e)', fontSize: 13, fontWeight: 600 }}
                    onClick={() => showToast('success', 'Clinic information saved!')}
                  >
                    <Save size={14} /> Save Changes
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-4" style={{ fontSize: 16, color: '#111827' }}>
                  <Bell size={18} className="me-2" style={{ color: '#0f766e' }} />
                  Notification Preferences
                </h5>

                <div className="d-flex flex-column gap-3">
                  {[
                    { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
                    { key: 'smsNotifications', label: 'SMS Notifications', desc: 'Receive notifications via SMS' },
                    { key: 'appointmentReminders', label: 'Appointment Reminders', desc: 'Get reminders for upcoming appointments' },
                    { key: 'vaccinationAlerts', label: 'Vaccination Alerts', desc: 'Alerts for due vaccinations' },
                    { key: 'systemAlerts', label: 'System Alerts', desc: 'Important system notifications' },
                    { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Receive weekly summary reports' },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="d-flex align-items-center justify-content-between p-3 rounded-3"
                      style={{ backgroundColor: '#f9fafb' }}
                    >
                      <div>
                        <div className="fw-semibold" style={{ fontSize: 13, color: '#111827' }}>{item.label}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{item.desc}</div>
                      </div>
                      <Form.Check
                        type="switch"
                        checked={settings.notifications[item.key]}
                        onChange={(e) => handleSettingChange('notifications', item.key, e.target.checked)}
                      />
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Display Tab */}
          {activeTab === 'display' && (
            <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-4" style={{ fontSize: 16, color: '#111827' }}>
                  <Palette size={18} className="me-2" style={{ color: '#0f766e' }} />
                  Display Settings
                </h5>

                <Row className="g-4">
                  <Col xs={12}>
                    <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Theme</Form.Label>
                    <div className="d-flex gap-2">
                      {[
                        { value: 'light', icon: <Sun size={16} />, label: 'Light' },
                        { value: 'dark', icon: <Moon size={16} />, label: 'Dark' },
                        { value: 'system', icon: <Monitor size={16} />, label: 'System' },
                      ].map((t) => (
                        <Button
                          key={t.value}
                          variant="light"
                          className="d-flex align-items-center gap-2 border"
                          style={{
                            fontSize: 12,
                            fontWeight: settings.display.theme === t.value ? 600 : 500,
                            backgroundColor: settings.display.theme === t.value ? '#ccfbf1' : '#fff',
                            borderColor: settings.display.theme === t.value ? '#14b8a6' : '#e5e7eb',
                            color: settings.display.theme === t.value ? '#0f766e' : '#374151',
                          }}
                          onClick={() => handleSettingChange('display', 'theme', t.value)}
                        >
                          {t.icon} {t.label}
                        </Button>
                      ))}
                    </div>
                  </Col>

                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        <Globe size={12} className="me-1" /> Language
                      </Form.Label>
                      <Form.Select
                        value={settings.display.language}
                        onChange={(e) => handleSettingChange('display', 'language', e.target.value)}
                        style={{ fontSize: 13 }}
                      >
                        <option value="en">English</option>
                        <option value="fil">Filipino</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        Date Format
                      </Form.Label>
                      <Form.Select
                        value={settings.display.dateFormat}
                        onChange={(e) => handleSettingChange('display', 'dateFormat', e.target.value)}
                        style={{ fontSize: 13 }}
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        Time Format
                      </Form.Label>
                      <Form.Select
                        value={settings.display.timeFormat}
                        onChange={(e) => handleSettingChange('display', 'timeFormat', e.target.value)}
                        style={{ fontSize: 13 }}
                      >
                        <option value="12h">12-hour (AM/PM)</option>
                        <option value="24h">24-hour</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col xs={12}>
                    <div className="d-flex flex-column gap-3">
                      <div
                        className="d-flex align-items-center justify-content-between p-3 rounded-3"
                        style={{ backgroundColor: '#f9fafb' }}
                      >
                        <div>
                          <div className="fw-semibold" style={{ fontSize: 13, color: '#111827' }}>Compact Mode</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>Reduce spacing and padding</div>
                        </div>
                        <Form.Check
                          type="switch"
                          checked={settings.display.compactMode}
                          onChange={(e) => handleSettingChange('display', 'compactMode', e.target.checked)}
                        />
                      </div>
                      <div
                        className="d-flex align-items-center justify-content-between p-3 rounded-3"
                        style={{ backgroundColor: '#f9fafb' }}
                      >
                        <div>
                          <div className="fw-semibold" style={{ fontSize: 13, color: '#111827' }}>Animations</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>Enable UI animations and transitions</div>
                        </div>
                        <Form.Check
                          type="switch"
                          checked={settings.display.showAnimations}
                          onChange={(e) => handleSettingChange('display', 'showAnimations', e.target.checked)}
                        />
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-4" style={{ fontSize: 16, color: '#111827' }}>
                  <Shield size={18} className="me-2" style={{ color: '#0f766e' }} />
                  Security Settings
                </h5>

                <Row className="g-4">
                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        <Clock size={12} className="me-1" /> Session Timeout (minutes)
                      </Form.Label>
                      <Form.Select
                        value={settings.security.sessionTimeout}
                        onChange={(e) => handleSettingChange('security', 'sessionTimeout', Number(e.target.value))}
                        style={{ fontSize: 13 }}
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={120}>2 hours</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        <Key size={12} className="me-1" /> Max Login Attempts
                      </Form.Label>
                      <Form.Select
                        value={settings.security.loginAttempts}
                        onChange={(e) => handleSettingChange('security', 'loginAttempts', Number(e.target.value))}
                        style={{ fontSize: 13 }}
                      >
                        <option value={3}>3 attempts</option>
                        <option value={5}>5 attempts</option>
                        <option value={10}>10 attempts</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col xs={12}>
                    <div className="d-flex flex-column gap-3">
                      <div
                        className="d-flex align-items-center justify-content-between p-3 rounded-3"
                        style={{ backgroundColor: '#f9fafb' }}
                      >
                        <div>
                          <div className="fw-semibold" style={{ fontSize: 13, color: '#111827' }}>
                            Two-Factor Authentication
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>
                            Add an extra layer of security
                          </div>
                        </div>
                        <Form.Check
                          type="switch"
                          checked={settings.security.twoFactorAuth}
                          onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
                        />
                      </div>
                      <div
                        className="d-flex align-items-center justify-content-between p-3 rounded-3"
                        style={{ backgroundColor: '#f9fafb' }}
                      >
                        <div>
                          <div className="fw-semibold" style={{ fontSize: 13, color: '#111827' }}>
                            Require Password Change
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>
                            Force users to change password periodically
                          </div>
                        </div>
                        <Form.Check
                          type="switch"
                          checked={settings.security.requirePasswordChange}
                          onChange={(e) => handleSettingChange('security', 'requirePasswordChange', e.target.checked)}
                        />
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* Data & Backup Tab */}
          {activeTab === 'data' && (
            <Card className="border rounded-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-4" style={{ fontSize: 16, color: '#111827' }}>
                  <Database size={18} className="me-2" style={{ color: '#0f766e' }} />
                  Data & Backup
                </h5>

                <Row className="g-4 mb-4">
                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        Backup Frequency
                      </Form.Label>
                      <Form.Select
                        value={settings.data.backupFrequency}
                        onChange={(e) => handleSettingChange('data', 'backupFrequency', e.target.value)}
                        style={{ fontSize: 13 }}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        Data Retention (days)
                      </Form.Label>
                      <Form.Select
                        value={settings.data.retentionDays}
                        onChange={(e) => handleSettingChange('data', 'retentionDays', Number(e.target.value))}
                        style={{ fontSize: 13 }}
                      >
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                        <option value={90}>90 days</option>
                        <option value={180}>180 days</option>
                        <option value={365}>1 year</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col xs={12}>
                    <div
                      className="d-flex align-items-center justify-content-between p-3 rounded-3"
                      style={{ backgroundColor: '#f9fafb' }}
                    >
                      <div>
                        <div className="fw-semibold" style={{ fontSize: 13, color: '#111827' }}>
                          Automatic Backup
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          Automatically backup data on schedule
                        </div>
                      </div>
                      <Form.Check
                        type="switch"
                        checked={settings.data.autoBackup}
                        onChange={(e) => handleSettingChange('data', 'autoBackup', e.target.checked)}
                      />
                    </div>
                  </Col>
                </Row>

                <h6 className="fw-bold mb-3" style={{ fontSize: 14, color: '#111827' }}>
                  Data Actions
                </h6>
                <div className="d-flex flex-wrap gap-2">
                  <Button
                    variant="light"
                    className="d-flex align-items-center gap-2 border"
                    style={{ fontSize: 12, fontWeight: 500 }}
                    onClick={handleExportData}
                  >
                    <Download size={14} /> Export Settings
                  </Button>
                  <Button
                    variant="light"
                    className="d-flex align-items-center gap-2 border"
                    style={{ fontSize: 12, fontWeight: 500 }}
                  >
                    <Upload size={14} /> Import Settings
                  </Button>
                  <Button
                    variant="light"
                    className="d-flex align-items-center gap-2 border"
                    style={{ fontSize: 12, fontWeight: 500, color: '#dc2626' }}
                    onClick={() => setShowConfirmReset(true)}
                  >
                    <RefreshCw size={14} /> Reset to Defaults
                  </Button>
                </div>

                <div
                  className="mt-4 p-3 rounded-3 d-flex align-items-start gap-2"
                  style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d' }}
                >
                  <Info size={16} color="#92400e" className="flex-shrink-0 mt-1" />
                  <div style={{ fontSize: 12, color: '#92400e' }}>
                    <strong>Note:</strong> Exported data includes your settings and preferences.
                    Patient data is stored separately and requires admin access to export.
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      {/* Reset Confirmation Modal */}
      <Modal show={showConfirmReset} onHide={() => setShowConfirmReset(false)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 15 }}>Reset Settings?</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ fontSize: 13 }}>
          This will reset all settings to their default values. This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setShowConfirmReset(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="border-0"
            style={{ backgroundColor: '#dc2626' }}
            onClick={handleResetSettings}
          >
            Reset Settings
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Settings;
