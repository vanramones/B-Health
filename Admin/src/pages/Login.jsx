import React, { useState, useEffect } from 'react';
import { Form, Button, InputGroup, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HeartPulse, User as UserIcon, Lock, Eye, EyeOff,
  ShieldCheck, Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loginRateLimiter } from '../utils/rateLimiter';
import { logAuditEvent, AUDIT_ACTIONS } from '../utils/auditLogger';
import { sanitizeInput } from '../utils/sanitize';

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
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const sanitizedUsername = sanitizeInput(username);
    const blocked = loginRateLimiter.isBlocked(sanitizedUsername);
    if (blocked && blocked.blocked) {
      setError('Too many login attempts. Please try again in ' + blocked.timeLeft + ' minutes.');
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

  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      <div style={{ backgroundColor: '#0f172a', color: '#cbd5e1', fontSize: 11, padding: '7px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '0.02em' }}>
        <div className="d-flex align-items-center gap-2">
          <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
          <span>SYSTEM ONLINE</span>
          <span style={{ color: '#475569' }}>.</span>
          <span className="d-none d-sm-inline">B-HEALTH MANAGEMENT INFORMATION SYSTEM</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Clock size={11} color="#64748b" />
          <span className="d-none d-md-inline">{dateStr}</span>
          <span style={{ color: '#475569' }}>.</span>
          <span>{timeStr} PHT</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex' }}>
        <div className="d-none d-lg-flex flex-column justify-content-between" style={{ width: '46%', backgroundColor: '#0f172a', padding: '56px 56px 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '40px 40px', maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)' }} />
          <div style={{ position: 'absolute', top: '20%', right: '-15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)' }} />

          <div className="d-flex align-items-center gap-3" style={{ position: 'relative', zIndex: 1 }}>
            <div className="d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, backgroundColor: '#052e16', border: '1px solid #166534', borderRadius: 8 }}>
              <HeartPulse size={22} color="#34d399" />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>B-Health</div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Management Information System</div>
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1, maxWidth: 380 }}>
            <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 18, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
              Administrative Console
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 700, color: '#f8fafc', lineHeight: 1.3, letterSpacing: '-0.02em', marginBottom: 18 }}>
              Barangay Health Center<br />
              <span style={{ color: '#34d399' }}>Operations Dashboard</span>
            </h1>
            <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>
              Secure access portal for health center administrators. Manage appointments, health records, vaccinations, and community health programs in one place.
            </p>
            <div className="d-flex align-items-start gap-2 mt-5 p-3 rounded" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid #1e293b' }}>
              <ShieldCheck size={15} color="#34d399" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
                <strong style={{ color: '#cbd5e1' }}>Authorized personnel only.</strong>{' '}
                All access attempts are logged and monitored. Unauthorized access is prohibited under Republic Act No. 10173 (Data Privacy Act of 2012).
              </div>
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ height: 1, backgroundColor: '#1e293b', marginBottom: 16 }} />
            <div className="d-flex align-items-center justify-content-between">
              <span style={{ fontSize: 11, color: '#475569' }}>v2.4.1 . Build 2026.09.14</span>
              <span style={{ fontSize: 11, color: '#475569' }}>2026 B-Health MIS</span>
            </div>
          </div>
        </div>

        <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1" style={{ padding: '40px 24px', backgroundColor: '#f8fafc' }}>
          <div style={{ width: '100%', maxWidth: 380 }}>
            <div className="d-flex d-lg-none align-items-center gap-2 mb-5">
              <div className="d-flex align-items-center justify-content-center" style={{ width: 38, height: 38, backgroundColor: '#052e16', border: '1px solid #166534', borderRadius: 8 }}>
                <HeartPulse size={19} color="#34d399" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>B-Health</div>
                <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Admin Console</div>
              </div>
            </div>

            <div className="mb-4">
              <div style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Sign In</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 6 }}>Administrator Login</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Enter your credentials to access the dashboard.</p>
            </div>

            {error && (
              <Alert className="d-flex align-items-center gap-2 mb-3" style={{ fontSize: 13, backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, padding: '11px 14px' }}>
                <ShieldCheck size={15} style={{ flexShrink: 0 }} />
                {error}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 7, letterSpacing: '0.01em' }}>Username</Form.Label>
                <InputGroup>
                  <InputGroup.Text style={{ backgroundColor: '#fff', borderColor: '#cbd5e1', borderRight: 'none', padding: '0 13px', borderRadius: '8px 0 0 8px' }}>
                    <UserIcon size={16} color="#94a3b8" />
                  </InputGroup.Text>
                  <Form.Control placeholder="Enter username" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" style={{ borderColor: '#cbd5e1', borderLeft: 'none', borderRight: 'none', fontSize: 14, padding: '11px 14px 11px 0', backgroundColor: '#fff', boxShadow: 'none', height: 44 }} />
                  <div style={{ width: 8, backgroundColor: '#fff', border: '1px solid #cbd5e1', borderLeft: 'none', borderRadius: '0 8px 8px 0' }} />
                </InputGroup>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 7, letterSpacing: '0.01em' }}>Password</Form.Label>
                <InputGroup>
                  <InputGroup.Text style={{ backgroundColor: '#fff', borderColor: '#cbd5e1', borderRight: 'none', padding: '0 13px', borderRadius: '8px 0 0 8px' }}>
                    <Lock size={16} color="#94a3b8" />
                  </InputGroup.Text>
                  <Form.Control type={showPwd ? 'text' : 'password'} placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" style={{ borderColor: '#cbd5e1', borderLeft: 'none', borderRight: 'none', fontSize: 14, padding: '11px 0', backgroundColor: '#fff', boxShadow: 'none', height: 44 }} />
                  <Button type="button" variant="light" onClick={() => setShowPwd((v) => !v)} style={{ borderColor: '#cbd5e1', borderLeft: 'none', backgroundColor: '#fff', padding: '0 13px', borderRadius: '0 8px 8px 0', boxShadow: 'none' }}>
                    {showPwd ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
                  </Button>
                </InputGroup>
              </Form.Group>

              <Button type="submit" disabled={submitting} className="w-100 border-0 d-flex align-items-center justify-content-center gap-2" style={{ backgroundColor: submitting ? '#64748b' : '#0f172a', fontSize: 14, fontWeight: 600, padding: '13px', borderRadius: 8, letterSpacing: '0.01em', transition: 'all 0.15s', height: 46 }}>
                {submitting ? (
                  <><Spinner size="sm" animation="border" /><span>Authenticating...</span></>
                ) : (
                  <><Lock size={15} /><span>Sign In Securely</span></>
                )}
              </Button>
            </Form>

            <div className="mt-5 pt-4" style={{ borderTop: '1px solid #e2e8f0' }}>
              <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                <ShieldCheck size={13} color="#94a3b8" />
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Protected by 256-bit SSL encryption</span>
              </div>
              <div style={{ fontSize: 10, color: '#cbd5e1', textAlign: 'center', lineHeight: 1.6 }}>
                For technical support, contact the system administrator.<br />
                This session is being recorded for security purposes.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
