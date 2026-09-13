import React, { useState } from 'react';
import { Form, Button, InputGroup, Alert } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HeartPulse, Plus, User as UserIcon, Lock, Eye, EyeOff, Shield,
  Activity, Users, ClipboardList, Bell,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loginRateLimiter } from '../utils/rateLimiter';
import { logAuditEvent, AUDIT_ACTIONS } from '../utils/auditLogger';
import { sanitizeInput } from '../utils/sanitize';

const features = [
  { icon: <Users size={18} />, label: 'Resident Management', desc: 'Manage barangay health records' },
  { icon: <ClipboardList size={18} />, label: 'Appointment Scheduling', desc: 'Track and manage consultations' },
  { icon: <Activity size={18} />, label: 'Health Analytics', desc: 'Monitor community health trends' },
  { icon: <Bell size={18} />, label: 'Announcements', desc: 'Send updates to residents' },
];

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/admin/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const sanitizedUsername = sanitizeInput(username);
    
    const blocked = loginRateLimiter.isBlocked(sanitizedUsername);
    if (blocked && blocked.blocked) {
      setError(`Too many login attempts. Please try again in ${blocked.timeLeft} minutes.`);
      return;
    }
    
    setSubmitting(true);
    try {
      const result = await login(sanitizedUsername, password);
      if (result.ok) {
        loginRateLimiter.reset(sanitizedUsername);
        await logAuditEvent(AUDIT_ACTIONS.LOGIN, { username: sanitizedUsername }, result.user?.id);
        navigate(from, { replace: true });
      } else {
        loginRateLimiter.recordAttempt(sanitizedUsername);
        await logAuditEvent(AUDIT_ACTIONS.FAILED_LOGIN, { username: sanitizedUsername, reason: result.error });
        setError(result.error || 'Login failed');
        setSubmitting(false);
      }
    } catch {
      loginRateLimiter.recordAttempt(sanitizedUsername);
      setError('Server unavailable. Please try again later.');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#f1f5f9' }}>

      {/* ── Left Panel ── */}
      <div
        className="d-none d-lg-flex flex-column justify-content-between"
        style={{
          width: '50%',
          background: 'linear-gradient(160deg, #1e3a8a 0%, #1d4ed8 55%, #2563eb 100%)',
          padding: '48px 52px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorative circles */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 320, height: 320, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />
        <div style={{
          position: 'absolute', bottom: 60, left: -60,
          width: 260, height: 260, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, right: 80,
          width: 180, height: 180, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />

        {/* Logo */}
        <div className="d-flex align-items-center gap-3" style={{ position: 'relative', zIndex: 1 }}>
          <div
            className="d-flex align-items-center justify-content-center rounded-3 position-relative"
            style={{
              width: 48, height: 48,
              background: 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.3)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <HeartPulse size={24} color="#fff" />
            <span
              className="position-absolute d-flex align-items-center justify-content-center rounded-circle"
              style={{
                width: 16, height: 16,
                backgroundColor: '#ef4444',
                border: '2px solid #1d4ed8',
                bottom: -4, right: -4,
              }}
            >
              <Plus size={8} color="#fff" strokeWidth={3} />
            </span>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>B-Health</div>
            <div style={{ fontSize: 12, color: 'rgba(191,219,254,0.85)', fontWeight: 500 }}>Barangay Health Management</div>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            className="d-inline-flex align-items-center gap-2 rounded-pill px-3 py-1 mb-4"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <Shield size={13} color="#93c5fd" />
            <span style={{ fontSize: 12, color: '#93c5fd', fontWeight: 600, letterSpacing: '0.04em' }}>
              ADMIN PORTAL
            </span>
          </div>

          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.03em', marginBottom: 16 }}>
            Manage Health<br />
            <span style={{ color: '#93c5fd' }}>Services</span> with<br />
            Confidence
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(191,219,254,0.85)', lineHeight: 1.7, maxWidth: 340 }}>
            A complete platform for barangay health center administrators to manage residents, appointments, and community health programs.
          </p>

          {/* Feature list */}
          <div className="d-flex flex-column gap-3 mt-4">
            {features.map((f, i) => (
              <div key={i} className="d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0 rounded-2"
                  style={{
                    width: 36, height: 36,
                    background: 'rgba(255,255,255,0.12)',
                    color: '#93c5fd',
                  }}
                >
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{f.label}</div>
                  <div style={{ fontSize: 12, color: 'rgba(191,219,254,0.7)' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom badge */}
        <div
          className="d-flex align-items-center gap-2"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4ade80', display: 'inline-block' }} />
          <span style={{ fontSize: 12, color: 'rgba(191,219,254,0.75)' }}>
            Secure admin access — authorized personnel only
          </span>
        </div>
      </div>

      {/* ── Right Panel (Form) ── */}
      <div
        className="d-flex flex-column align-items-center justify-content-center flex-grow-1"
        style={{ padding: '40px 24px' }}
      >
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Mobile logo */}
          <div className="d-flex d-lg-none align-items-center gap-2 mb-5">
            <div
              className="d-flex align-items-center justify-content-center rounded-3"
              style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
            >
              <HeartPulse size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>B-Health</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Admin Portal</div>
            </div>
          </div>

          {/* Form header */}
          <div className="mb-5">
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', marginBottom: 8 }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              Sign in to your administrator account
            </p>
          </div>

          {error && (
            <Alert
              className="border-0 rounded-3 mb-4 d-flex align-items-center gap-2"
              style={{ fontSize: 13, backgroundColor: '#fef2f2', color: '#991b1b', padding: '12px 16px' }}
            >
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-4">
              <Form.Label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                Username
              </Form.Label>
              <InputGroup>
                <InputGroup.Text
                  style={{
                    backgroundColor: '#fff',
                    borderColor: '#e2e8f0',
                    borderRight: 'none',
                    padding: '0 14px',
                  }}
                >
                  <UserIcon size={17} color="#94a3b8" />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{
                    borderColor: '#e2e8f0',
                    borderLeft: 'none',
                    fontSize: 14,
                    padding: '13px 16px 13px 0',
                    backgroundColor: '#fff',
                    boxShadow: 'none',
                  }}
                />
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-5">
              <Form.Label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                Password
              </Form.Label>
              <InputGroup>
                <InputGroup.Text
                  style={{
                    backgroundColor: '#fff',
                    borderColor: '#e2e8f0',
                    borderRight: 'none',
                    padding: '0 14px',
                  }}
                >
                  <Lock size={17} color="#94a3b8" />
                </InputGroup.Text>
                <Form.Control
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    borderColor: '#e2e8f0',
                    borderLeft: 'none',
                    borderRight: 'none',
                    fontSize: 14,
                    padding: '13px 0',
                    backgroundColor: '#fff',
                    boxShadow: 'none',
                  }}
                />
                <Button
                  type="button"
                  variant="light"
                  onClick={() => setShowPwd((v) => !v)}
                  style={{
                    borderColor: '#e2e8f0',
                    borderLeft: 'none',
                    backgroundColor: '#fff',
                    padding: '0 14px',
                  }}
                >
                  {showPwd ? <EyeOff size={17} color="#94a3b8" /> : <Eye size={17} color="#94a3b8" />}
                </Button>
              </InputGroup>
            </Form.Group>

            <Button
              type="submit"
              disabled={submitting}
              className="w-100 border-0 fw-bold"
              style={{
                background: submitting ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                fontSize: 15,
                padding: '15px',
                borderRadius: 12,
                letterSpacing: '0.01em',
                boxShadow: submitting ? 'none' : '0 4px 20px rgba(37, 99, 235, 0.4)',
                transition: 'all 0.2s',
              }}
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Login;
