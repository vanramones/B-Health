import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUserAuth } from '../../context/UserAuthContext';
import { HeartPulse, Plus, Lock, Eye, EyeOff, ArrowRight, Shield, Clock, Users, User } from 'lucide-react';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ═══════════════════════════════════════
     PAGE SHELL
  ═══════════════════════════════════════ */
  .ul-page {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    height: 100vh; height: 100dvh;
    display: flex; flex-direction: column;
    background: linear-gradient(160deg, #1e3a8a 0%, #1d4ed8 45%, #2563eb 100%);
    overflow: hidden;
  }

  /* ═══════════════════════════════════════
     MOBILE TOP HEADER  (< 600 px)
  ═══════════════════════════════════════ */
  .ul-mob-header {
    display: flex; flex-direction: column; align-items: center;
    padding: calc(env(safe-area-inset-top, 8px) + 20px) 24px 16px;
    position: relative; overflow: hidden; flex-shrink: 0;
  }
  .ul-mob-header::before {
    content: '';
    position: absolute; top: -80px; right: -80px;
    width: 260px; height: 260px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.09) 0%, transparent 65%);
    pointer-events: none;
  }
  .ul-mob-logo-wrap {
    position: relative;
    width: 56px; height: 56px; border-radius: 16px;
    background: rgba(255,255,255,0.16);
    border: 1.5px solid rgba(255,255,255,0.28);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 28px rgba(0,0,0,0.18);
    margin-bottom: 10px;
  }
  .ul-mob-badge {
    position: absolute; bottom: -5px; right: -5px;
    width: 22px; height: 22px; border-radius: 50%;
    background: #ef4444; border: 2.5px solid #1d4ed8;
    display: flex; align-items: center; justify-content: center;
  }
  .ul-mob-brand {
    font-size: 18px; font-weight: 800; color: #fff;
    letter-spacing: -0.03em; text-align: center;
  }
  .ul-mob-brand span {
    display: block; font-size: 10px; font-weight: 500;
    color: rgba(147,197,253,0.85); letter-spacing: 0.04em; margin-top: 2px;
  }

  @media (min-width: 781px) { .ul-mob-header { display: none; } }

  /* ─── MOBILE: centered floating card ─── */
  .ul-right {
    flex: 1; display: flex;
    align-items: center; justify-content: center;
    padding: 12px 20px calc(env(safe-area-inset-bottom, 12px) + 12px);
    overflow-y: auto; -webkit-overflow-scrolling: touch;
  }
  .ul-card {
    width: 100%; max-width: 360px;
    background: #fff;
    border-radius: 22px;
    padding: 28px 22px 24px;
    box-shadow: 0 12px 48px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12);
    animation: cardUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes cardUp {
    from { opacity: 0; transform: translateY(24px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
  }

  /* ─── DESKTOP (781px+): split panel ─── */
  @media (min-width: 781px) {
    .ul-page { flex-direction: row; background: #f1f5f9; height: auto; min-height: 100vh; min-height: 100dvh; overflow: visible; }
    .ul-right {
      background: #f1f5f9; overflow-y: visible;
      padding: 32px 24px; min-height: 100vh; min-height: 100dvh;
    }
    .ul-card {
      max-width: 440px; border-radius: 20px; padding: 44px 40px 36px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.07), 0 24px 56px rgba(0,0,0,0.07);
    }
  }

  /* ═══════════════════════════════════════
     LEFT BRANDING PANEL  (desktop only)
  ═══════════════════════════════════════ */
  .ul-left {
    display: none;
    width: 45%;
    flex-direction: column;
    justify-content: space-between;
    padding: 52px;
    background: linear-gradient(150deg, #1e3a8a 0%, #1d4ed8 40%, #2563eb 100%);
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
  }
  @media (min-width: 781px) { .ul-left { display: flex; } }

  .ul-left::before {
    content: '';
    position: absolute; top: -120px; right: -120px;
    width: 400px; height: 400px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%);
  }
  .ul-left::after {
    content: '';
    position: absolute; bottom: -80px; left: -80px;
    width: 320px; height: 320px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 65%);
  }

  .ul-left-logo {
    display: flex; align-items: center; gap: 14px;
    position: relative; z-index: 1;
  }
  .ul-left-logo-icon {
    width: 52px; height: 52px; border-radius: 14px;
    background: rgba(255,255,255,0.15);
    border: 1.5px solid rgba(255,255,255,0.25);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(10px);
  }
  .ul-left-brand { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.03em; }
  .ul-left-brand span {
    display: block; font-size: 12px; font-weight: 500;
    color: rgba(147,197,253,0.85); letter-spacing: 0.04em; margin-top: 1px;
  }

  .ul-left-hero { position: relative; z-index: 1; }
  .ul-left-hero h1 {
    font-size: 36px; font-weight: 800; color: #fff;
    line-height: 1.15; letter-spacing: -0.04em; margin-bottom: 16px;
  }
  .ul-left-hero h1 em { font-style: normal; color: #93c5fd; }
  .ul-left-hero p { font-size: 15px; color: rgba(147,197,253,0.8); line-height: 1.65; }

  .ul-features { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 12px; }
  .ul-feature-item {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 16px; border-radius: 14px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
    backdrop-filter: blur(8px);
  }
  .ul-feature-icon {
    width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
    background: rgba(255,255,255,0.12);
    display: flex; align-items: center; justify-content: center;
  }
  .ul-feature-text strong { display: block; font-size: 13px; font-weight: 700; color: #fff; }
  .ul-feature-text span { font-size: 12px; color: rgba(147,197,253,0.75); }

  /* ═══════════════════════════════════════
     CARD INNER HEADER — always visible
  ═══════════════════════════════════════ */
  .ul-desk-header {
    display: block;
    margin-bottom: 28px;
  }
  .ul-desk-header h2 {
    font-size: 20px; font-weight: 800; color: #0f172a;
    letter-spacing: -0.04em; margin-bottom: 5px;
  }
  .ul-desk-header p { font-size: 14px; color: #64748b; }
  @media (min-width: 480px) and (max-width: 780px) {
    .ul-desk-header h2 { font-size: 22px; }
    .ul-desk-header { margin-bottom: 24px; }
  }
  @media (min-width: 781px) {
    .ul-desk-header h2 { font-size: 24px; }
  }

  /* Card logo: only when there's no left panel and no mob-header (not needed in new layout) */
  .ul-mob-card-logo { display: none; }

  .ul-divider { height: 1px; background: #e2e8f0; margin-bottom: 24px; }
  @media (min-width: 600px) { .ul-divider { margin-bottom: 28px; } }

  /* ═══════════════════════════════════════
     FORM FIELDS
  ═══════════════════════════════════════ */
  .ul-field { margin-bottom: 18px; }
  @media (min-width: 600px) { .ul-field { margin-bottom: 20px; } }

  .ul-label {
    display: block; font-size: 13px; font-weight: 600;
    color: #374151; margin-bottom: 7px; letter-spacing: 0.01em;
  }

  .ul-input-group {
    display: flex; align-items: stretch;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px; background: #fff;
    overflow: hidden;
    transition: border-color 0.18s, box-shadow 0.18s;
  }
  .ul-input-group:focus-within {
    border-color: #1d4ed8;
    box-shadow: 0 0 0 3px rgba(29,78,216,0.1);
  }
  .ul-input-prefix {
    display: flex; align-items: center; justify-content: center;
    padding: 0 12px;
    background: #f8fafc; border-right: 1.5px solid #e2e8f0;
    flex-shrink: 0; transition: background 0.18s;
  }
  .ul-input-group:focus-within .ul-input-prefix { background: #eff6ff; }

  .ul-input-field {
    flex: 1; border: none; outline: none; background: transparent;
    font-size: 16px; font-weight: 500; color: #0f172a;
    padding: 14px 14px;
    font-family: inherit;
    min-width: 0;
  }
  /* 16px prevents iOS zoom on focus */
  .ul-input-field::placeholder { color: #9ca3af; font-weight: 400; }

  .ul-input-suffix {
    display: flex; align-items: center;
    padding: 0 14px; cursor: pointer;
    border: none; background: transparent;
    color: #9ca3af; transition: color 0.18s; flex-shrink: 0;
  }
  .ul-input-suffix:hover { color: #1d4ed8; }

  .ul-forgot {
    display: block; text-align: right;
    font-size: 13px; font-weight: 600; color: #1d4ed8;
    text-decoration: none; margin-top: 8px;
    transition: color 0.15s;
  }
  .ul-forgot:hover { color: #1e3a8a; }

  /* ═══════════════════════════════════════
     ERROR BANNER
  ═══════════════════════════════════════ */
  .ul-error {
    display: flex; align-items: center; gap: 10px;
    background: #fef2f2; border: 1px solid #fecaca;
    border-radius: 10px; padding: 12px 14px; margin-bottom: 18px;
  }
  .ul-error-dot { width: 7px; height: 7px; border-radius: 50%; background: #ef4444; flex-shrink: 0; }
  .ul-error span { font-size: 13px; color: #dc2626; font-weight: 500; }

  /* ═══════════════════════════════════════
     SIGN IN BUTTON
  ═══════════════════════════════════════ */
  .ul-btn {
    width: 100%; margin-top: 24px;
    padding: 15px 24px;
    border: none; border-radius: 12px; cursor: pointer;
    font-family: inherit; font-size: 16px; font-weight: 700;
    color: #fff; letter-spacing: 0.01em;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    box-shadow: 0 4px 16px rgba(29,78,216,0.32);
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .ul-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(29,78,216,0.42);
  }
  .ul-btn:active:not(:disabled) { transform: translateY(0); }
  .ul-btn:disabled { opacity: 0.65; cursor: not-allowed; }

  .ul-spinner {
    width: 18px; height: 18px; border-radius: 50%;
    border: 2.5px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    animation: spin 0.7s linear infinite;
    display: inline-block; flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ═══════════════════════════════════════
     FOOTER
  ═══════════════════════════════════════ */
  .ul-footer { margin-top: 24px; text-align: center; }
  .ul-footer p { font-size: 14px; color: #94a3b8; }
  .ul-footer a { color: #1d4ed8; font-weight: 700; text-decoration: none; }
  .ul-footer a:hover { color: #1e3a8a; }
  .ul-admin-link {
    margin-top: 14px; padding-top: 14px;
    border-top: 1px solid #f1f5f9;
  }
  .ul-admin-link a {
    font-size: 12px; color: #cbd5e1; font-weight: 500;
    text-decoration: none; transition: color 0.15s;
  }
  .ul-admin-link a:hover { color: #94a3b8; }
`;

const UserLogin = () => {
  const navigate = useNavigate();
  const { login } = useUserAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(username.trim(), password);
    if (result.ok) {
      navigate('/user', { replace: true });
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="ul-page">

        {/* ── Left Branding Panel (desktop only) ── */}
        <div className="ul-left">
          <div className="ul-left-logo">
            <div className="ul-left-logo-icon">
              <HeartPulse size={26} color="#fff" strokeWidth={1.8} />
            </div>
            <div className="ul-left-brand">
              B-Health
              <span>Barangay Health Center Digital System</span>
            </div>
          </div>

          <div className="ul-left-hero">
            <h1>Your Health,<br />Our <em>Priority</em>.</h1>
            <p>
              Manage your health records, book appointments, and stay informed
              about community health services — all in one secure platform.
            </p>
          </div>

          <div className="ul-features">
            <div className="ul-feature-item">
              <div className="ul-feature-icon"><Shield size={18} color="rgba(167,243,208,0.9)" /></div>
              <div className="ul-feature-text">
                <strong>Secure & Private</strong>
                <span>Your medical data is fully protected</span>
              </div>
            </div>
            <div className="ul-feature-item">
              <div className="ul-feature-icon"><Clock size={18} color="rgba(167,243,208,0.9)" /></div>
              <div className="ul-feature-text">
                <strong>24/7 Access</strong>
                <span>View your records anytime, anywhere</span>
              </div>
            </div>
            <div className="ul-feature-item">
              <div className="ul-feature-icon"><Users size={18} color="rgba(167,243,208,0.9)" /></div>
              <div className="ul-feature-text">
                <strong>Community Care</strong>
                <span>Connected to your local health center</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile Green Header (< 600px only) ── */}
        <div className="ul-mob-header">
          <div className="ul-mob-logo-wrap">
            <HeartPulse size={26} color="#fff" strokeWidth={1.8} />
            <div className="ul-mob-badge">
              <Plus size={10} color="#fff" strokeWidth={3} />
            </div>
          </div>
          <div className="ul-mob-brand">
            B-Health
            <span>Barangay Health Center Digital System</span>
          </div>
        </div>

        {/* ── Right Form Panel ── */}
        <div className="ul-right">
          <div className="ul-card">

            {/* Tablet-only logo inside card (600–899px) */}
            <div className="ul-mob-card-logo">
              <div style={{
                width: 40, height: 40, borderRadius: 11,
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(29,78,216,0.3)',
              }}>
                <HeartPulse size={20} color="#fff" strokeWidth={2} />
              </div>
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>B-Health</div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Barangay Health Center Digital System</div>
              </div>
            </div>

            <div className="ul-desk-header">
              <h2>Welcome back</h2>
              <p>Sign in to access your health records and services.</p>
            </div>

            <div className="ul-divider" />

            {error && (
              <div className="ul-error">
                <div className="ul-error-dot" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="ul-field">
                <label className="ul-label">Username</label>
                <div className="ul-input-group">
                  <div className="ul-input-prefix">
                    <User size={16} color="#1d4ed8" />
                  </div>
                  <input
                    className="ul-input-field"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="ul-field">
                <label className="ul-label">Password</label>
                <div className="ul-input-group">
                  <div className="ul-input-prefix" style={{ borderRight: 'none', paddingRight: 0 }}>
                    <Lock size={16} color="#9ca3af" />
                  </div>
                  <input
                    className="ul-input-field"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="ul-input-suffix"
                    onClick={() => setShowPwd((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <a href="#" className="ul-forgot">Forgot password?</a>
              </div>

              <button type="submit" className="ul-btn" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="ul-spinner" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="ul-footer">
              <p>
                Don't have an account?{' '}
                <Link to="/register">Create account</Link>
              </p>
              <div className="ul-admin-link">
                <a href="/admin/login">Staff / Admin Portal →</a>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default UserLogin;
