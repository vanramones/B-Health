import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUserAuth } from '../../context/UserAuthContext';
import {
  HeartPulse, Plus, Lock, Eye, EyeOff, ArrowRight,
  User, Phone, MapPin, ChevronLeft, Check, AlertCircle,
} from 'lucide-react';

const PUROKS = [
  'Purok 1',  'Purok 2',  'Purok 3',  'Purok 4',
  'Purok 5',  'Purok 6',  'Purok 7',  'Purok 8',
  'Purok 9',  'Purok 10', 'Purok 11', 'Purok 12',
  'Purok 13', 'Purok 14', 'Purok 15', 'Purok 16',
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .ur-page {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    height: 100vh; height: 100dvh;
    display: flex; flex-direction: column;
    background: linear-gradient(160deg, #1e3a8a 0%, #1d4ed8 45%, #2563eb 100%);
    overflow: hidden;
  }

  /* ── Mobile Green Header ── */
  .ur-mob-header {
    display: flex; flex-direction: column; align-items: center;
    padding: calc(env(safe-area-inset-top, 8px) + 12px) 24px 14px;
    position: relative; overflow: hidden; flex-shrink: 0;
  }
  .ur-mob-header::before {
    content: '';
    position: absolute; top: -80px; right: -80px;
    width: 240px; height: 240px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.09) 0%, transparent 65%);
    pointer-events: none;
  }
  .ur-mob-logo-wrap {
    position: relative; width: 52px; height: 52px; border-radius: 14px;
    background: rgba(255,255,255,0.16); border: 1.5px solid rgba(255,255,255,0.28);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(12px); box-shadow: 0 8px 28px rgba(0,0,0,0.18);
    margin-bottom: 8px;
  }
  .ur-mob-badge {
    position: absolute; bottom: -5px; right: -5px;
    width: 20px; height: 20px; border-radius: 50%;
    background: #ef4444; border: 2.5px solid #1d4ed8;
    display: flex; align-items: center; justify-content: center;
  }
  .ur-mob-brand {
    font-size: 17px; font-weight: 800; color: #fff;
    letter-spacing: -0.03em; text-align: center;
  }
  .ur-mob-brand span {
    display: block; font-size: 10px; font-weight: 500;
    color: rgba(147,197,253,0.85); letter-spacing: 0.04em; margin-top: 2px;
  }
  @media (min-width: 600px) { .ur-mob-header { display: none; } }

  /* ── Form Sheet ── */
  .ur-right {
    flex: 1; display: flex;
    align-items: flex-start; justify-content: center;
    overflow-y: auto; overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    padding: 12px 20px calc(env(safe-area-inset-bottom, 12px) + 16px);
  }
  .ur-card {
    width: 100%; max-width: 380px;
    background: #fff;
    border-radius: 22px;
    padding: 24px 22px 28px;
    box-shadow: 0 12px 48px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12);
    animation: cardUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
    margin-bottom: 8px;
  }
  @keyframes cardUp {
    from { opacity: 0; transform: translateY(24px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  @media (min-width: 600px) {
    .ur-page {
      flex-direction: row; background: #f1f5f9;
      height: auto; min-height: 100vh; min-height: 100dvh;
      overflow: visible;
    }
    .ur-right {
      background: #f1f5f9; align-items: flex-start;
      padding: 32px 24px; width: 100%;
      overflow-y: visible; min-height: 100vh; min-height: 100dvh;
    }
    .ur-card {
      max-width: 500px; border-radius: 20px;
      padding: 44px 40px 36px;
      box-shadow:
        0 1px 2px rgba(0,0,0,0.04),
        0 6px 20px rgba(0,0,0,0.07),
        0 24px 56px rgba(0,0,0,0.07);
    }
  }
  @media (min-width: 900px) {
    .ur-right { min-height: 100vh; min-height: 100dvh; }
    .ur-card { max-width: 480px; padding: 48px 44px 40px; }
  }

  /* ── Left Branding Panel (desktop) ── */
  .ur-left {
    display: none; width: 45%;
    flex-direction: column; justify-content: center; gap: 32px;
    padding: 52px; position: relative; overflow: hidden; flex-shrink: 0;
    background: linear-gradient(150deg, #1e3a8a 0%, #1d4ed8 40%, #2563eb 100%);
  }
  @media (min-width: 900px) { .ur-left { display: flex; } }
  .ur-left::before {
    content: ''; position: absolute; top: -120px; right: -120px;
    width: 400px; height: 400px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%);
  }
  .ur-left::after {
    content: ''; position: absolute; bottom: -80px; left: -80px;
    width: 320px; height: 320px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 65%);
  }
  .ur-left-logo {
    display: flex; align-items: center; gap: 14px; position: relative; z-index: 1;
  }
  .ur-left-logo-icon {
    width: 52px; height: 52px; border-radius: 14px;
    background: rgba(255,255,255,0.15); border: 1.5px solid rgba(255,255,255,0.25);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(10px);
  }
  .ur-left-brand { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.03em; }
  .ur-left-brand span {
    display: block; font-size: 12px; font-weight: 500;
    color: rgba(147,197,253,0.85); letter-spacing: 0.04em; margin-top: 1px;
  }
  .ur-left-hero { position: relative; z-index: 1; }
  .ur-left-hero h1 {
    font-size: 34px; font-weight: 800; color: #fff;
    line-height: 1.15; letter-spacing: -0.04em; margin-bottom: 14px;
  }
  .ur-left-hero h1 em { font-style: normal; color: #93c5fd; }
  .ur-left-hero p { font-size: 15px; color: rgba(147,197,253,0.8); line-height: 1.65; }
  .ur-steps { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 12px; }
  .ur-step {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 16px; border-radius: 14px;
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
    backdrop-filter: blur(8px);
  }
  .ur-step-num {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    background: rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 800; color: #fff;
  }
  .ur-step-text strong { display: block; font-size: 13px; font-weight: 700; color: #fff; }
  .ur-step-text span { font-size: 12px; color: rgba(147,197,253,0.75); }

  /* ── Tablet logo ── */
  .ur-tab-logo { display: none; }
  @media (min-width: 600px) and (max-width: 899px) {
    .ur-tab-logo {
      display: flex; align-items: center; gap: 10px; margin-bottom: 20px;
    }
  }

  /* ── Card header ── */
  .ur-card-header { margin-bottom: 24px; }
  .ur-card-header h2 {
    font-size: 22px; font-weight: 800; color: #0f172a;
    letter-spacing: -0.04em; margin-bottom: 5px;
  }
  .ur-card-header p { font-size: 13px; color: #64748b; }
  @media (min-width: 600px) { .ur-card-header h2 { font-size: 24px; } }

  .ur-back {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 13px; font-weight: 600; color: #1d4ed8;
    text-decoration: none; margin-bottom: 18px;
    transition: color 0.15s; -webkit-tap-highlight-color: transparent;
  }
  .ur-back:hover { color: #1e3a8a; }

  .ur-divider { height: 1px; background: #e2e8f0; margin-bottom: 22px; }

  /* ── Form row (2-col on tablet+) ── */
  .ur-row { display: flex; flex-direction: column; gap: 0; }
  @media (min-width: 560px) {
    .ur-row { flex-direction: row; gap: 14px; }
    .ur-row .ur-field { flex: 1; min-width: 0; }
  }

  /* ── Fields ── */
  .ur-field { margin-bottom: 16px; }
  .ur-label {
    display: block; font-size: 13px; font-weight: 600;
    color: #374151; margin-bottom: 6px; letter-spacing: 0.01em;
  }
  .ur-input-group {
    display: flex; align-items: stretch;
    border: 1.5px solid #e2e8f0; border-radius: 12px;
    background: #fff; overflow: hidden;
    transition: border-color 0.18s, box-shadow 0.18s;
    min-width: 0; width: 100%;
  }
  .ur-input-group:focus-within {
    border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(29,78,216,0.1);
  }
  .ur-input-group.error { border-color: #ef4444; }
  .ur-input-group.error:focus-within { box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
  .ur-input-prefix {
    display: flex; align-items: center; justify-content: center;
    padding: 0 12px; background: #f8fafc;
    border-right: 1.5px solid #e2e8f0; flex-shrink: 0;
    transition: background 0.18s;
  }
  .ur-input-group:focus-within .ur-input-prefix { background: #eff6ff; }
  .ur-input-prefix-text {
    font-size: 13px; font-weight: 700; color: #1d4ed8;
    letter-spacing: 0.02em; white-space: nowrap;
  }
  .ur-input-field {
    flex: 1; border: none; outline: none; background: transparent;
    font-size: 16px; font-weight: 500; color: #0f172a;
    padding: 13px 14px; font-family: inherit; min-width: 0;
  }
  .ur-input-field::placeholder { color: #9ca3af; font-weight: 400; }
  .ur-input-suffix {
    display: flex; align-items: center; padding: 0 12px;
    cursor: pointer; border: none; background: transparent;
    color: #9ca3af; transition: color 0.18s; flex-shrink: 0;
  }
  .ur-input-suffix:hover { color: #1d4ed8; }

  select.ur-input-field {
    cursor: pointer; -webkit-appearance: none; appearance: none;
    width: 100%; min-width: 0;
  }
  .ur-select-wrap { position: relative; flex: 1; display: flex; min-width: 0; overflow: hidden; }
  .ur-select-wrap select { padding-right: 36px; width: 100%; min-width: 0; }
  .ur-select-arrow {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    pointer-events: none; color: #9ca3af;
  }

  .ur-hint { font-size: 11.5px; color: #94a3b8; margin-top: 5px; }
  .ur-field-error { font-size: 11.5px; color: #ef4444; margin-top: 5px; display: flex; align-items: center; gap: 4px; }

  /* Password strength */
  .ur-strength { margin-top: 8px; }
  .ur-strength-bar {
    height: 4px; border-radius: 4px; background: #e2e8f0; margin-bottom: 5px; overflow: hidden;
  }
  .ur-strength-fill { height: 100%; border-radius: 4px; transition: width 0.3s, background-color 0.3s; }
  .ur-strength-label { font-size: 11px; font-weight: 600; }

  /* ── Submit Button ── */
  .ur-btn {
    width: 100%; margin-top: 20px; padding: 15px 24px;
    border: none; border-radius: 12px; cursor: pointer;
    font-family: inherit; font-size: 16px; font-weight: 700;
    color: #fff; letter-spacing: 0.01em;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    box-shadow: 0 4px 16px rgba(29,78,216,0.32);
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: transform 0.15s, box-shadow 0.15s;
    -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  }
  .ur-btn:hover:not(:disabled) {
    transform: translateY(-1px); box-shadow: 0 8px 24px rgba(29,78,216,0.42);
  }
  .ur-btn:active:not(:disabled) { transform: translateY(0); }
  .ur-btn:disabled { opacity: 0.55; cursor: not-allowed; }

  .ur-spinner {
    width: 18px; height: 18px; border-radius: 50%;
    border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #fff;
    animation: spin 0.7s linear infinite; display: inline-block; flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Error banner ── */
  .ur-error {
    display: flex; align-items: flex-start; gap: 10px;
    background: #fef2f2; border: 1px solid #fecaca;
    border-radius: 10px; padding: 12px 14px; margin-bottom: 16px;
  }
  .ur-error span { font-size: 13px; color: #dc2626; font-weight: 500; }

  /* ── Success overlay ── */
  .ur-success {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; text-align: center; padding: 16px 0 8px;
    animation: cardUp 0.5s cubic-bezier(0.22,1,0.36,1) both;
  }
  .ur-success-icon {
    width: 64px; height: 64px; border-radius: 50%;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 24px rgba(29,78,216,0.35);
    margin-bottom: 18px;
  }
  .ur-success h3 {
    font-size: 20px; font-weight: 800; color: #0f172a;
    letter-spacing: -0.03em; margin-bottom: 8px;
  }
  .ur-success p { font-size: 14px; color: #64748b; line-height: 1.6; max-width: 280px; }

  /* ── Footer ── */
  .ur-footer { margin-top: 20px; text-align: center; }
  .ur-footer p { font-size: 14px; color: #94a3b8; }
  .ur-footer a { color: #1d4ed8; font-weight: 700; text-decoration: none; }
  .ur-footer a:hover { color: #1e3a8a; }

  /* ── Toast Notification ── */
  .ur-toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    color: #fff;
    background: linear-gradient(135deg, #16a34a, #15803d);
    box-shadow: 0 4px 20px rgba(22,163,74,0.35), 0 2px 8px rgba(0,0,0,0.15);
    animation: toastSlide 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
    max-width: 90vw;
    width: fit-content;
    text-align: center;
    line-height: 1.5;
  }
  @keyframes toastSlide {
    from { opacity: 0; transform: translateX(-50%) translateY(-30px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  .ur-toast-icon {
    width: 24px; height: 24px; border-radius: 50%;
    background: rgba(255,255,255,0.25);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
`;

function getStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score === 0 && pwd.length > 0) score = 1;
  return score;
}
const strengthMeta = [
  null,
  { label: 'Weak',      color: '#ef4444', width: '25%' },
  { label: 'Fair',      color: '#f59e0b', width: '50%' },
  { label: 'Good',      color: '#3b82f6', width: '75%' },
  { label: 'Strong',    color: '#1d4ed8', width: '100%' },
];

const UserRegister = () => {
  const navigate = useNavigate();
  const { register } = useUserAuth();

  const [form, setForm] = useState({
    username: '',
    fullName: '',
    phone: '',
    purok: '',
    password: '',
    confirmPassword: '',
  });
  const [showPwd, setShowPwd]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors]           = useState({});
  const [submitting, setSubmitting]   = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [toast, setToast]             = useState(null);

  useEffect(() => {
    const handleFocus = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
        setTimeout(() => {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 320);
      }
    };
    document.addEventListener('focusin', handleFocus, true);
    return () => document.removeEventListener('focusin', handleFocus, true);
  }, []);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((err) => ({ ...err, [key]: '' }));
    setGlobalError('');
  };

  const validate = () => {
    const e = {};
    if (!form.username.trim())          e.username = 'Username is required.';
    else if (form.username.trim().length < 3) e.username = 'Username must be at least 3 characters.';
    else if (/\s/.test(form.username))  e.username = 'Username cannot contain spaces.';
    if (!form.fullName.trim())          e.fullName = 'Full name is required.';
    if (!form.phone.trim())             e.phone = 'Phone number is required.';
    else if (!/^\d{10}$/.test(form.phone.replace(/\s/g, '')))
                                        e.phone = 'Enter a valid 10-digit number.';
    if (!form.purok)                    e.purok = 'Please select your purok.';
    if (!form.password)                 e.password = 'Password is required.';
    else if (form.password.length < 8)  e.password = 'Must be at least 8 characters.';
    if (!form.confirmPassword)          e.confirmPassword = 'Please confirm your password.';
    else if (form.password !== form.confirmPassword)
                                        e.confirmPassword = 'Passwords do not match.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e_ = validate();
    if (Object.keys(e_).length) { setErrors(e_); return; }

    setSubmitting(true);
    setGlobalError('');
    const result = await register({
      username: form.username.trim().toLowerCase(),
      password: form.password,
      full_name: form.fullName.trim(),
      phone: form.phone.trim(),
      purok: form.purok,
    });
    setSubmitting(false);
    if (result.ok) {
      setToast({ type: 'success', message: `Welcome, ${form.fullName}! Your account has been created successfully.` });
      setTimeout(() => navigate('/login', { replace: true, state: { registrationSuccess: true, userName: form.fullName } }), 500);
    } else {
      setGlobalError(result.error || 'Registration failed. Please try again.');
    }
  };

  const pwdStrength = getStrength(form.password);
  const sm = strengthMeta[pwdStrength];

  return (
    <>
      <style>{styles}</style>

      {/* Toast Notification */}
      {toast && (
        <div className="ur-toast">
          <div className="ur-toast-icon">
            <Check size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="ur-page">

        {/* ── Left Panel (desktop) ── */}
        <div className="ur-left">
          <div className="ur-left-logo" style={{ position: 'relative', zIndex: 1 }}>
            <div className="ur-left-logo-icon">
              <HeartPulse size={26} color="#fff" strokeWidth={1.8} />
            </div>
            <div className="ur-left-brand">
              B-Health
              <span>Barangay Health Center Digital System</span>
            </div>
          </div>

          <div className="ur-left-hero">
            <h1>Join your<br /><em>community</em><br />health network.</h1>
            <p>
              Create your account to access health services, book appointments,
              and manage your records — right from your device.
            </p>
          </div>

          <div className="ur-steps">
            {[
              { n: '1', title: 'Fill in your details',   sub: 'Name, phone, and location' },
              { n: '2', title: 'Set a secure password',  sub: 'Keep your account protected' },
              { n: '3', title: 'Access your portal',     sub: 'Health records & appointments' },
            ].map((s) => (
              <div className="ur-step" key={s.n}>
                <div className="ur-step-num">{s.n}</div>
                <div className="ur-step-text">
                  <strong>{s.title}</strong>
                  <span>{s.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Mobile Green Header ── */}
        <div className="ur-mob-header">
          <div className="ur-mob-logo-wrap">
            <HeartPulse size={24} color="#fff" strokeWidth={1.8} />
            <div className="ur-mob-badge">
              <Plus size={9} color="#fff" strokeWidth={3} />
            </div>
          </div>
          <div className="ur-mob-brand">
            B-Health
            <span>Barangay Health Center Digital System</span>
          </div>
        </div>

        {/* ── Form Panel ── */}
        <div className="ur-right">
          <div className="ur-card">

            {/* Tablet logo */}
            <div className="ur-tab-logo">
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(29,78,216,0.3)',
              }}>
                <HeartPulse size={18} color="#fff" strokeWidth={2} />
              </div>
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>B-Health</div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Barangay Health Center Digital System</div>
              </div>
            </div>

            <>
              <Link to="/login" className="ur-back">
                <ChevronLeft size={15} /> Back to Sign In
              </Link>

                <div className="ur-card-header">
                  <h2>Create Account</h2>
                  <p>Fill in your information to get started.</p>
                </div>

                <div className="ur-divider" />

                {globalError && (
                  <div className="ur-error">
                    <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{globalError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>

                  {/* Username */}
                  <div className="ur-field">
                    <label className="ur-label">Username</label>
                    <div className={`ur-input-group${errors.username ? ' error' : ''}`}>
                      <div className="ur-input-prefix">
                        <User size={15} color={errors.username ? '#ef4444' : '#1d4ed8'} />
                      </div>
                      <input
                        className="ur-input-field"
                        type="text"
                        placeholder="e.g. juan_delacruz"
                        value={form.username}
                        onChange={set('username')}
                        autoComplete="username"
                      />
                    </div>
                    {errors.username && (
                      <div className="ur-field-error">
                        <AlertCircle size={11} />{errors.username}
                      </div>
                    )}
                  </div>

                  {/* Full Name */}
                  <div className="ur-field">
                    <label className="ur-label">Full Name</label>
                    <div className={`ur-input-group${errors.fullName ? ' error' : ''}`}>
                      <div className="ur-input-prefix">
                        <User size={15} color={errors.fullName ? '#ef4444' : '#9ca3af'} />
                      </div>
                      <input
                        className="ur-input-field"
                        type="text"
                        placeholder="Juan Dela Cruz"
                        value={form.fullName}
                        onChange={set('fullName')}
                        autoComplete="name"
                      />
                    </div>
                    {errors.fullName && (
                      <div className="ur-field-error">
                        <AlertCircle size={11} />{errors.fullName}
                      </div>
                    )}
                  </div>

                  {/* Phone + Purok row */}
                  <div className="ur-row">
                    <div className="ur-field">
                      <label className="ur-label">Phone Number</label>
                      <div className={`ur-input-group${errors.phone ? ' error' : ''}`}>
                        <div className="ur-input-prefix">
                          <span className="ur-input-prefix-text">🇵🇭 +63</span>
                        </div>
                        <input
                          className="ur-input-field"
                          type="tel"
                          placeholder="9XX XXX XXXX"
                          value={form.phone}
                          onChange={set('phone')}
                          autoComplete="tel"
                          inputMode="numeric"
                          maxLength={10}
                        />
                      </div>
                      {errors.phone && (
                        <div className="ur-field-error">
                          <AlertCircle size={11} />{errors.phone}
                        </div>
                      )}
                    </div>

                    <div className="ur-field">
                      <label className="ur-label">Purok</label>
                      <div className={`ur-input-group${errors.purok ? ' error' : ''}`}>
                        <div className="ur-input-prefix">
                          <MapPin size={15} color={errors.purok ? '#ef4444' : '#9ca3af'} />
                        </div>
                        <div className="ur-select-wrap">
                          <select
                            className="ur-input-field"
                            value={form.purok}
                            onChange={set('purok')}
                          >
                            <option value="">Select Purok</option>
                            {PUROKS.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                          <span className="ur-select-arrow">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </span>
                        </div>
                      </div>
                      {errors.purok && (
                        <div className="ur-field-error">
                          <AlertCircle size={11} />{errors.purok}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Password */}
                  <div className="ur-field">
                    <label className="ur-label">Password</label>
                    <div className={`ur-input-group${errors.password ? ' error' : ''}`}>
                      <div className="ur-input-prefix" style={{ borderRight: 'none', paddingRight: 0 }}>
                        <Lock size={15} color={errors.password ? '#ef4444' : '#9ca3af'} />
                      </div>
                      <input
                        className="ur-input-field"
                        type={showPwd ? 'text' : 'password'}
                        placeholder="Min. 8 characters"
                        value={form.password}
                        onChange={set('password')}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="ur-input-suffix"
                        onClick={() => setShowPwd((v) => !v)}
                        tabIndex={-1}
                      >
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {form.password && sm && (
                      <div className="ur-strength">
                        <div className="ur-strength-bar">
                          <div className="ur-strength-fill" style={{ width: sm.width, backgroundColor: sm.color }} />
                        </div>
                        <span className="ur-strength-label" style={{ color: sm.color }}>{sm.label} password</span>
                      </div>
                    )}
                    {errors.password && (
                      <div className="ur-field-error">
                        <AlertCircle size={11} />{errors.password}
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="ur-field">
                    <label className="ur-label">Confirm Password</label>
                    <div className={`ur-input-group${errors.confirmPassword ? ' error' : ''}`}>
                      <div className="ur-input-prefix" style={{ borderRight: 'none', paddingRight: 0 }}>
                        <Lock size={15} color={errors.confirmPassword ? '#ef4444' : '#9ca3af'} />
                      </div>
                      <input
                        className="ur-input-field"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Re-enter your password"
                        value={form.confirmPassword}
                        onChange={set('confirmPassword')}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="ur-input-suffix"
                        onClick={() => setShowConfirm((v) => !v)}
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {form.confirmPassword && form.password === form.confirmPassword && !errors.confirmPassword && (
                      <div className="ur-hint" style={{ color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Check size={11} /> Passwords match
                      </div>
                    )}
                    {errors.confirmPassword && (
                      <div className="ur-field-error">
                        <AlertCircle size={11} />{errors.confirmPassword}
                      </div>
                    )}
                  </div>

                  <button type="submit" className="ur-btn" disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="ur-spinner" />
                        Creating account…
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                <div className="ur-footer">
                  <p>
                    Already have an account?{' '}
                    <Link to="/login">Sign in</Link>
                  </p>
                </div>
              </>
          </div>
        </div>

      </div>
    </>
  );
};

export default UserRegister;
