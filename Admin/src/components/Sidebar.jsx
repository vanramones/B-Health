import React from 'react';
import { Badge } from 'react-bootstrap';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  Heart,
  HeartPulse,
  Syringe,
  Bell,
  Megaphone,
  Phone,
  BarChart3,
  Settings,
  Plus,
  LogOut,
  ShieldCheck,
  UserCog,
  Trash2,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navGroups = [
  {
    label: 'MAIN',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',     path: '/admin/dashboard' },
      { icon: Calendar,        label: 'Appointments',  path: '/admin/appointments' },
      { icon: Users,           label: 'Residents',         path: '/admin/residents' },
      { icon: UserCog,         label: 'Registered Users',  path: '/admin/registered-users' },
      { icon: FileText,        label: 'Health Records',    path: '/admin/health-records' },
    ],
  },
  {
    label: 'SERVICES',
    items: [
      { icon: Heart,   label: 'Services',    path: '/admin/services' },
      { icon: Syringe, label: 'Vaccination', path: '/admin/vaccination' },
    ],
  },
  {
    label: 'COMMUNICATION',
    items: [
      { icon: Bell,      label: 'Notifications',     path: '/admin/notifications' },
      { icon: Megaphone, label: 'Announcements',     path: '/admin/announcements' },
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

const initialsOf = (name) =>
  (name || '')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'AD';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const displayName = user?.full_name || user?.name || user?.username || 'Admin';
  const userInitials = initialsOf(displayName);
  const userRole = user?.role || 'Administrator';

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  const handleNavClick = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  return (
    <div
      className={`bh-sidebar d-flex flex-column flex-shrink-0 ${isOpen ? 'show' : ''}`}
      style={{ width: 272, minHeight: '100vh', boxShadow: '4px 0 24px rgba(0,0,0,0.15)', position: 'relative', background: 'linear-gradient(180deg, #0f172a 0%, #0e7497 100%)' }}
    >
      {/* Logo */}
      <div className="px-4 pt-4 pb-3 bh-fade-up" style={{ position: 'relative', zIndex: 1 }}>
        <div className="d-flex align-items-center gap-3 mb-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 position-relative"
            style={{ width: 46, height: 46, background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}
          >
            <HeartPulse size={24} color="#0e7497" strokeWidth={2.5} />
            <span
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{
                position: 'absolute',
                bottom: -4, right: -4,
                width: 18, height: 18,
                backgroundColor: '#ef4444',
                border: '2.5px solid #fff',
                boxShadow: '0 3px 8px rgba(239, 68, 68, 0.45)',
              }}
            >
              <Plus size={11} color="#fff" strokeWidth={3.5} />
            </span>
          </div>
          <div>
            <div className="fw-bold text-white" style={{ fontSize: 16, letterSpacing: '-0.01em' }}>B-Health Admin</div>
            <div style={{ fontSize: 11, color: 'rgba(165, 243, 252, 0.85)', fontWeight: 500 }}>Barangay Health System</div>
          </div>
        </div>
      </div>

      {/* Nav Groups */}
      <div
        className="d-flex flex-column flex-grow-1 px-3 pb-3"
        style={{ overflowY: 'auto', position: 'relative', zIndex: 1, minWidth: 0 }}
      >
        {navGroups.map((group, gi) => (
          <div
            key={group.label}
            className="d-flex flex-column mb-3"
            style={{ animation: 'fadeInUp 0.4s ease both', animationDelay: `${gi * 0.08}s` }}
          >
            <div className="px-2 mb-2 d-flex align-items-center gap-2">
              <small
                className="fw-bold text-uppercase"
                style={{ fontSize: 10, color: 'rgba(103, 232, 249, 0.8)', letterSpacing: '0.14em' }}
              >
                {group.label}
              </small>
            </div>
            {group.items.map((item, ii) => {
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  className={`bh-nav-link d-flex align-items-center justify-content-between rounded-3 px-3 py-2 mb-2 border-0 text-start w-100 ${active ? 'active' : ''}`}
                  style={{
                    fontSize: 13.5,
                    fontWeight: active ? 700 : 500,
                    color: active ? '#fff' : 'rgba(207, 250, 254, 0.92)',
                    backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                    cursor: 'pointer',
                    animationDelay: `${ii * 0.04}s`,
                    transition: 'all 0.18s ease',
                    boxShadow: active ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'rgba(207, 250, 254, 0.92)';
                    }
                  }}
                >
                  {active && (
                    <span
                      style={{
                        position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                        width: 4, height: 22, background: '#22d3ee', borderRadius: '0 4px 4px 0',
                      }}
                    />
                  )}
                  <span className="d-flex align-items-center gap-3 text-truncate">
                    <span
                      className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                      style={{
                        width: 32, height: 32,
                        background: active ? 'rgba(34, 211, 238, 0.18)' : 'rgba(255,255,255,0.08)',
                        color: active ? '#22d3ee' : 'rgba(207, 250, 254, 0.92)',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <item.icon className="nav-icon flex-shrink-0" size={18} strokeWidth={active ? 2.5 : 2} />
                    </span>
                    <span className="text-truncate">{item.label}</span>
                  </span>
                  {item.badge && (
                    <Badge pill bg={item.badgeBg} className="flex-shrink-0" style={{ fontSize: 10, fontWeight: 700, padding: '4px 7px' }}>
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* User */}
      <div
        className="bh-fade-up px-3 py-3"
        style={{
          borderTop: '1px solid rgba(34, 211, 238, 0.18)',
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="d-flex align-items-center gap-3 px-3 py-3 rounded-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
            style={{
              width: 42, height: 42,
              background: 'linear-gradient(135deg, #22d3ee, #0ea5e9 60%, #0e7497)',
              boxShadow: '0 3px 12px rgba(14, 165, 233, 0.45)',
            }}
          >
            <span className="text-white fw-bold" style={{ fontSize: 15, letterSpacing: '0.02em' }}>
              {userInitials}
            </span>
          </div>
          <div style={{ minWidth: 0 }} className="flex-grow-1">
            <div className="text-white fw-semibold text-truncate" style={{ fontSize: 14 }}>
              {displayName}
            </div>
            <div className="d-flex align-items-center gap-1 text-truncate" style={{ fontSize: 12, color: 'rgba(165, 243, 252, 0.85)' }}>
              <Heart size={10} fill="#22d3ee" color="#22d3ee" /> {userRole}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            className="border-0 d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{
              width: 36, height: 36,
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#fca5a5',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease, color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
              e.currentTarget.style.color = '#fca5a5';
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
