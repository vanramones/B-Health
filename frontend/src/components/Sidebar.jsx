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

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

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
      style={{ width: 260, minHeight: '100vh', boxShadow: '2px 0 16px rgba(0,0,0,0.12)', position: 'relative' }}
    >
      {/* Logo */}
      <div className="px-4 pt-4 pb-3 bh-fade-up" style={{ position: 'relative', zIndex: 1 }}>
        <div className="d-flex align-items-center gap-2 mb-3">
          <div
            className="bh-logo-glow d-flex align-items-center justify-content-center bg-white rounded-3 position-relative"
            style={{ width: 44, height: 44 }}
          >
            <HeartPulse size={22} color="#0f766e" strokeWidth={2.5} />
            <span
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{
                position: 'absolute',
                bottom: -4, right: -4,
                width: 16, height: 16,
                backgroundColor: '#dc2626',
                border: '2px solid #fff',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.5)',
              }}
            >
              <Plus size={10} color="#fff" strokeWidth={3.5} />
            </span>
          </div>
          <div>
            <div className="fw-bold text-white" style={{ fontSize: 15, letterSpacing: '-0.01em' }}>B-Health Admin</div>
            <div style={{ fontSize: 11, color: 'rgba(204, 251, 241, 0.75)' }}>Barangay Health System</div>
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
                style={{ fontSize: 10, color: 'rgba(153, 246, 228, 0.7)', letterSpacing: '0.12em' }}
              >
                {group.label}
              </small>
              <hr className="flex-grow-1 m-0" style={{ borderColor: 'rgba(94, 234, 212, 0.18)' }} />
            </div>
            {group.items.map((item, ii) => {
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  className={`bh-nav-link d-flex align-items-center justify-content-between rounded-3 px-3 py-2 mb-1 border-0 text-start w-100 ${active ? 'active' : ''}`}
                  style={{
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    color: active ? '#0f766e' : 'rgba(204, 251, 241, 0.92)',
                    backgroundColor: active ? '#fff' : 'transparent',
                    cursor: 'pointer',
                    animationDelay: `${ii * 0.04}s`,
                  }}
                >
                  <span className="d-flex align-items-center gap-2 text-truncate">
                    <item.icon className="nav-icon flex-shrink-0" size={17} strokeWidth={active ? 2.5 : 2} />
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
          borderTop: '1px solid rgba(94, 234, 212, 0.18)',
          backgroundColor: 'rgba(30, 58, 138, 0.4)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="d-flex align-items-center gap-2 px-2 py-2 rounded-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
            style={{
              width: 40, height: 40,
              background: 'linear-gradient(135deg, #5eead4, #14b8a6 60%, #0f766e)',
              boxShadow: '0 2px 10px rgba(20, 184, 166, 0.45)',
            }}
          >
            <span className="text-white fw-bold" style={{ fontSize: 14, letterSpacing: '0.02em' }}>
              {user?.initials || 'MR'}
            </span>
          </div>
          <div style={{ minWidth: 0 }} className="flex-grow-1">
            <div className="text-white fw-semibold text-truncate" style={{ fontSize: 13 }}>
              {user?.name || 'Marlo Reyes'}
            </div>
            <div className="d-flex align-items-center gap-1 text-truncate" style={{ fontSize: 11, color: 'rgba(204, 251, 241, 0.78)' }}>
              <Heart size={10} fill="#f87171" color="#f87171" /> {user?.role || 'Health Administrator'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            className="border-0 d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{
              width: 34, height: 34,
              backgroundColor: 'rgba(248, 113, 113, 0.12)',
              color: '#fca5a5',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease, color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(248, 113, 113, 0.25)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(248, 113, 113, 0.12)';
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
