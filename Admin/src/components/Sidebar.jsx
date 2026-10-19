import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { Badge } from 'react-bootstrap';
import {
  LayoutDashboard, Calendar, FileText, Heart, HeartPulse,
  Bell, Megaphone, Phone, BarChart3, Settings, Plus,
  LogOut, ShieldCheck, UserCog, Trash2, ChevronRight,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navGroups = [
  {
    label: 'MAIN',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',        path: '/admin/dashboard' },
      { icon: Calendar,        label: 'Appointments',     path: '/admin/appointments' },
      { icon: UserCog,         label: 'Registered Users', path: '/admin/registered-users' },
      { icon: FileText,        label: 'Health Records',   path: '/admin/health-records' },
    ],
  },
  {
    label: 'SERVICES',
    items: [
      { icon: Heart, label: 'Services', path: '/admin/services' },
    ],
  },
  {
    label: 'COMMUNICATION',
    items: [
      { icon: Bell,      label: 'Notifications',      path: '/admin/notifications' },
      { icon: Megaphone, label: 'Announcements',      path: '/admin/announcements' },
      { icon: Phone,     label: 'Emergency Contacts', path: '/admin/emergency-contacts' },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      { icon: BarChart3, label: 'Reports', path: '/admin/reports' },
    ],
  },
  {
    label: 'ADMINISTRATION',
    items: [
      { icon: ShieldCheck, label: 'Admin Accounts', path: '/admin/admin-accounts' },
      { icon: Settings,    label: 'Settings',       path: '/admin/settings' },
      { icon: Trash2,      label: 'Trash',          path: '/admin/trash' },
    ],
  },
];

const USERS_SEEN_KEY = 'bh_admin_users_seen_at';

// Pending appointments (need action) + residents registered since the admin last opened Registered Users
const useSidebarBadges = (pathname) => {
  const [counts, setCounts] = useState({ appointments: 0, users: 0 });

  const load = useCallback(async () => {
    const seenAt = localStorage.getItem(USERS_SEEN_KEY) || new Date(0).toISOString();
    const [{ count: pending }, { count: newUsers }] = await Promise.all([
      supabase.from('appointments').select('id', { count: 'exact', head: true })
        .eq('status', 'pending').is('deleted_at', null),
      supabase.from('users').select('id', { count: 'exact', head: true }).gt('created_at', seenAt),
    ]);
    setCounts({ appointments: pending || 0, users: newUsers || 0 });
  }, []);

  useEffect(() => {
    if (pathname === '/admin/registered-users') localStorage.setItem(USERS_SEEN_KEY, new Date().toISOString());
    load();
  }, [pathname, load]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-sidebar-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return { '/admin/appointments': counts.appointments, '/admin/registered-users': counts.users };
};

const initialsOf = (name) =>
  (name || '').split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'AD';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const badges = useSidebarBadges(location.pathname);

  const displayName = user?.full_name || user?.name || user?.username || 'Admin';
  const userInitials = initialsOf(displayName);
  const userRole = user?.role || 'Administrator';

  const handleLogout = () => { logout(); navigate('/admin/login', { replace: true }); };
  const handleNavClick = (path) => { navigate(path); if (onClose) onClose(); };

  return (
    <div className="bh-sidebar-rail">
    <div
      className={`bh-sidebar d-flex flex-column flex-shrink-0 ${isOpen ? 'show' : ''}`}
      style={{ minHeight: '100vh' }}
    >
      {/* ── Logo ── */}
      <div className="pt-4 pb-3" style={{ position: 'relative', zIndex: 1, paddingLeft: 17, paddingRight: 17 }}>
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center justify-content-center rounded-3 position-relative"
            style={{
              width: 42, height: 42,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
            }}>
            <HeartPulse size={22} color="#fff" strokeWidth={2.5} />
          </div>
          <div className="bh-sb-label">
            <div className="fw-bold text-white" style={{ fontSize: 15, letterSpacing: '-0.02em' }}>B-Health Admin</div>
            <div style={{ fontSize: 10.5, color: 'rgba(148, 163, 184, 0.9)', fontWeight: 500 }}>Barangay Health System</div>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-4 mb-2" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

      {/* ── Navigation ── */}
      <div className="d-flex flex-column flex-grow-1 px-2 pb-3"
        style={{ overflowY: 'auto', overflowX: 'hidden', position: 'relative', zIndex: 1, minWidth: 0 }}>
        {navGroups.map((group, gi) => (
          <div key={group.label} className="mb-1">
            <div className="px-3 mb-1 mt-2 bh-sb-group">
              <span className="bh-sb-group-dot" />
              <small className="fw-bold text-uppercase bh-sb-label"
                style={{ fontSize: 10, color: 'rgba(148, 163, 184, 0.5)', letterSpacing: '0.12em' }}>
                {group.label}
              </small>
            </div>
            {group.items.map((item) => {
              const active = location.pathname === item.path;
              const count = badges[item.path] || 0;
              const countText = count > 99 ? '99+' : count;
              return (
                <button key={item.path} type="button"
                  title={count ? `${item.label} (${count} ${item.path === '/admin/appointments' ? 'pending' : 'new'})` : item.label}
                  onClick={() => handleNavClick(item.path)}
                  className={`bh-nav-link d-flex align-items-center gap-3 rounded-3 py-2 mb-0.5 border-0 text-start w-100 ${active ? 'active' : ''}`}
                  style={{
                    paddingLeft: 15, paddingRight: 12,
                    fontSize: 13, fontWeight: active ? 600 : 450,
                    color: active ? '#fff' : 'rgba(203, 213, 225, 0.85)',
                    backgroundColor: active ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#e2e8f0'; }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(203, 213, 225, 0.85)'; }
                  }}
                >
                  {active && (
                    <span style={{
                      position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                      width: 3, height: 20, background: '#10b981', borderRadius: '0 3px 3px 0',
                    }} />
                  )}
                  <span className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                    style={{
                      position: 'relative',
                      width: 30, height: 30,
                      background: active ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                      color: active ? '#10b981' : 'rgba(148, 163, 184, 0.7)',
                      transition: 'all 0.2s ease',
                    }}>
                    <item.icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                    {count > 0 && <span className="bh-sb-badge-dot">{countText}</span>}
                  </span>
                  <span className="text-truncate flex-grow-1 bh-sb-label">{item.label}</span>
                  {count > 0 && (
                    <Badge pill bg="" className="flex-shrink-0 bh-sb-label bh-sb-badge-pill"
                      style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px' }}>
                      {countText}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── User Card ── */}
      <div className="px-2 py-3" style={{ position: 'relative', zIndex: 1 }}>
        <div className="mx-1 mb-3" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
        <div className="d-flex align-items-center gap-3 py-2 rounded-3 bh-sb-user"
          style={{ paddingLeft: 11, paddingRight: 11 }}>
          <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
            style={{
              width: 38, height: 38,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            }}>
            <span className="text-white fw-bold" style={{ fontSize: 13 }}>{userInitials}</span>
          </div>
          <div style={{ minWidth: 0 }} className="flex-grow-1 bh-sb-label">
            <div className="text-white fw-semibold text-truncate" style={{ fontSize: 13 }}>{displayName}</div>
            <div className="text-truncate" style={{ fontSize: 11, color: 'rgba(148, 163, 184, 0.7)' }}>{userRole}</div>
          </div>
          <button type="button" onClick={handleLogout} title="Sign out"
            className="border-0 d-flex align-items-center justify-content-center rounded-2 flex-shrink-0 bh-sb-label"
            style={{
              width: 32, height: 32,
              backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgba(248, 113, 113, 0.8)',
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = 'rgba(248, 113, 113, 0.8)'; }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
    </div>
  );
};

export default Sidebar;
