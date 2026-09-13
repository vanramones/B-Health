import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar, Form, Button, InputGroup } from 'react-bootstrap';
import { Search, Bell, Settings, Stethoscope, MapPin, Menu, CheckCheck, Calendar, Syringe, AlertTriangle, Clock, Info } from 'lucide-react';
import api from '../utils/api';

const typeIcon = {
  'Appointment':  <Calendar  size={13} color="#1d4ed8" />,
  'Vaccination':  <Syringe   size={13} color="#0d9488" />,
  'Health Alert': <AlertTriangle size={13} color="#dc2626" />,
  'Reminder':     <Clock     size={13} color="#b45309" />,
  'System':       <Info      size={13} color="#6b7280" />,
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen]           = useState(false);
  const [items, setItems]         = useState([]);
  const [vaxAlerts, setVaxAlerts] = useState([]);
  const [loading, setLoading]     = useState(false);
  const dropdownRef               = useRef(null);

  const unreadCount = items.filter((n) => !n.is_read).length + vaxAlerts.length;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [data, vax] = await Promise.all([
        api.get('/notifications'),
        api.get('/vaccinations/due-soon'),
      ]);
      setItems(Array.isArray(data) ? data.slice(0, 15) : []);
      setVaxAlerts(Array.isArray(vax) ? vax : []);
    } catch { setItems([]); setVaxAlerts([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all', {});
      setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch { /* ignore */ }
  };

  return (
    <div className="position-relative" ref={dropdownRef}>
      <Button
        variant="light" size="sm"
        className="position-relative border-0 p-2 rounded-3"
        style={{ backgroundColor: '#f0fdfa' }}
        onClick={() => { setOpen((v) => !v); if (!open) fetchNotifications(); }}
      >
        <Bell size={17} color="#0d9488" />
        {unreadCount > 0 && (
          <span
            className="position-absolute d-flex align-items-center justify-content-center rounded-circle"
            style={{ minWidth: 16, height: 16, top: 3, right: 3, backgroundColor: '#dc2626', border: '1.5px solid #fff', fontSize: 9, fontWeight: 700, color: '#fff', padding: '0 3px' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 9999,
            width: 320, backgroundColor: '#fff',
            borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            border: '1px solid #e5e7eb', overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div className="d-flex align-items-center justify-content-between px-3 py-2" style={{ borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{ marginLeft: 6, backgroundColor: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '1px 6px' }}>
                  {unreadCount}
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#0d9488', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {loading ? (
              <div className="text-center py-4" style={{ fontSize: 13, color: '#9ca3af' }}>Loading…</div>
            ) : (items.length === 0 && vaxAlerts.length === 0) ? (
              <div className="text-center py-4" style={{ fontSize: 13, color: '#9ca3af' }}>No notifications</div>
            ) : (
              <>
                {/* Vaccine reminder section */}
                {vaxAlerts.length > 0 && (
                  <>
                    <div style={{ padding: '6px 14px 4px', backgroundColor: '#fef2f2', borderBottom: '1px solid #fee2e2', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Syringe size={11} color="#dc2626" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Vaccine Reminders</span>
                      <span style={{ marginLeft: 'auto', backgroundColor: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 999, padding: '1px 6px' }}>{vaxAlerts.length}</span>
                    </div>
                    {vaxAlerts.slice(0, 5).map((v) => {
                      const isOverdue  = v.overdue || v.status === 'missed';
                      const isMissed   = v.status === 'missed';
                      const label      = isMissed ? 'Missed' : isOverdue ? 'Overdue' : v.daysAway === 0 ? 'Due Today' : `Due in ${v.daysAway}d`;
                      const labelColor = isOverdue || isMissed ? '#dc2626' : v.daysAway <= 3 ? '#b45309' : '#0d9488';
                      return (
                        <div key={`vax_${v.id}`}
                          style={{ padding: '8px 14px', borderBottom: '1px solid #fef2f2', backgroundColor: isOverdue ? '#fff5f5' : '#fffbeb', cursor: 'pointer' }}
                          onClick={() => { setOpen(false); navigate('/admin/vaccination'); }}
                        >
                          <div className="d-flex align-items-start gap-2">
                            <div className="mt-1 flex-shrink-0"><Syringe size={12} color={labelColor} /></div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {v.vaccine} — {v.patient}
                              </div>
                              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                                {v.dose} &nbsp;•&nbsp; {v.age ? `${v.age} y/o` : 'Age N/A'}
                              </div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: labelColor, whiteSpace: 'nowrap', flexShrink: 0 }}>{label}</span>
                          </div>
                        </div>
                      );
                    })}
                    {vaxAlerts.length > 5 && (
                      <div style={{ padding: '6px 14px', textAlign: 'center', backgroundColor: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
                        <button onClick={() => { setOpen(false); navigate('/admin/vaccination'); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                          +{vaxAlerts.length - 5} more vaccine alerts →
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Regular notifications */}
                {items.map((n) => (
                  <div key={n.id}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid #f9fafb',
                      backgroundColor: n.is_read ? '#fff' : '#f0fdf4',
                      cursor: 'pointer',
                    }}
                    onClick={() => { setOpen(false); navigate('/admin/notifications'); }}
                  >
                    <div className="d-flex align-items-start gap-2">
                      <div className="mt-1 flex-shrink-0">{typeIcon[n.type] || typeIcon.System}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: n.is_read ? 500 : 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.message}
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>
                          {timeAgo(n.created_at)}
                        </div>
                      </div>
                      {!n.is_read && (
                        <div className="flex-shrink-0 rounded-circle" style={{ width: 7, height: 7, backgroundColor: '#dc2626', marginTop: 5 }} />
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #f3f4f6', padding: '8px 14px', textAlign: 'center' }}>
            <button onClick={() => { setOpen(false); navigate('/admin/notifications'); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#0d9488', fontWeight: 600 }}>
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const Header = ({ title, onMenuClick }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);

  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const [users, appointments, records] = await Promise.all([
        api.get(`/user/search?q=${encodeURIComponent(query)}`).catch(() => []),
        api.get(`/appointments/search?q=${encodeURIComponent(query)}`).catch(() => []),
        api.get(`/health-records/search?q=${encodeURIComponent(query)}`).catch(() => []),
      ]);

      const results = [
        ...(Array.isArray(users) ? users.map(u => ({ type: 'user', ...u })) : []),
        ...(Array.isArray(appointments) ? appointments.map(a => ({ type: 'appointment', ...a })) : []),
        ...(Array.isArray(records) ? records.map(r => ({ type: 'record', ...r })) : []),
      ];

      setSearchResults(results.slice(0, 10));
      setShowSearchResults(true);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    }
  }, []);

  useEffect(() => {
    if (!showSearchResults) return;
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSearchResults]);

  const handleResultClick = (result) => {
    setShowSearchResults(false);
    setSearchQuery('');
    
    if (result.type === 'user') {
      navigate(`/admin/registered-users?id=${result.id}`);
    } else if (result.type === 'appointment') {
      navigate(`/admin/appointments?id=${result.id}`);
    } else if (result.type === 'record') {
      navigate(`/admin/health-records?id=${result.id}`);
    }
  };

  return (
    <Navbar
      bg="white"
      className="px-3 px-lg-4 flex-shrink-0"
      style={{
        height: 60,
        borderBottom: '1px solid #ccfbf1',
        boxShadow: '0 1px 4px rgba(15, 118, 110, 0.04)',
      }}
    >
      <div className="d-flex align-items-center gap-2 gap-lg-3">
        {/* Mobile menu button */}
        <Button
          variant="light"
          size="sm"
          className="d-lg-none border-0 p-2 rounded-3"
          style={{ backgroundColor: '#f0fdfa' }}
          onClick={onMenuClick}
        >
          <Menu size={20} color="#0d9488" />
        </Button>

        <Navbar.Brand className="fw-bold mb-0 d-flex align-items-center gap-2" style={{ fontSize: 16, color: '#0f766e' }}>
          <span
            className="d-none d-sm-flex align-items-center justify-content-center rounded-2"
            style={{ width: 28, height: 28, backgroundColor: '#ccfbf1', color: '#0f766e' }}
          >
            <Stethoscope size={15} strokeWidth={2.5} />
          </span>
          <span style={{ color: '#111827' }}>{title}</span>
        </Navbar.Brand>

        {/* Clinic pill */}
        <span
          className="d-none d-xl-inline-flex align-items-center gap-1"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#0f766e',
            backgroundColor: '#f0fdfa',
            border: '1px solid #99f6e4',
            padding: '4px 10px',
            borderRadius: 999,
          }}
        >
          <MapPin size={11} /> Brgy. Health Center
        </span>
      </div>

      <div className="d-flex align-items-center gap-2 ms-auto">
        {/* Search - hide on mobile */}
        <div className="d-none d-md-flex position-relative" ref={searchRef} style={{ width: 350 }}>
          <InputGroup size="sm">
            <InputGroup.Text
              className="border-end-0"
              style={{ borderColor: '#ccfbf1', backgroundColor: '#f0fdfa' }}
            >
              <Search size={14} color="#0d9488" />
            </InputGroup.Text>
            <Form.Control
              placeholder="Search users, appointments..."
              className="border-start-0"
              style={{ borderColor: '#ccfbf1', backgroundColor: '#f0fdfa', fontSize: 13 }}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
            />
          </InputGroup>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                backgroundColor: '#fff',
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                border: '1px solid #e5e7eb',
                zIndex: 9999,
                maxHeight: 300,
                overflowY: 'auto',
              }}
            >
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  onClick={() => handleResultClick(result)}
                  style={{
                    padding: '10px 12px',
                    borderBottom: idx < searchResults.length - 1 ? '1px solid #f3f4f6' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
                    {result.type === 'user' && `${result.full_name || result.name}`}
                    {result.type === 'appointment' && `Appointment - ${result.patient_name || result.user_name}`}
                    {result.type === 'record' && `Health Record - ${result.patient_name || result.user_name}`}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    {result.type === 'user' && result.email}
                    {result.type === 'appointment' && `${result.appointment_date || 'N/A'}`}
                    {result.type === 'record' && `${result.record_type || 'N/A'}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {showSearchResults && searchQuery && searchResults.length === 0 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                backgroundColor: '#fff',
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                border: '1px solid #e5e7eb',
                zIndex: 9999,
                padding: '12px',
                textAlign: 'center',
                fontSize: 12,
                color: '#9ca3af',
              }}
            >
              No results found
            </div>
          )}
        </div>

        {/* Bell */}
        <NotificationBell />
      </div>
    </Navbar>
  );
};

export default Header;
