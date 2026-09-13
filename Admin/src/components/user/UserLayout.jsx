import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  IonApp, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonMenu, IonList, IonItem, IonIcon, IonLabel, IonMenuToggle,
  IonButton, IonAvatar, IonBadge, IonItemGroup, IonItemDivider,
  IonButtons, IonMenuButton, IonPage, IonTabBar, IonTabButton,
} from '@ionic/react';
import {
  homeOutline, home, calendarOutline, calendar, documentTextOutline, documentText,
  medkitOutline, medkit, personOutline, person, logOutOutline, megaphoneOutline,
  megaphone, timeOutline, time, shieldCheckmarkOutline, shieldCheckmark,
  callOutline, call, notificationsOutline, notifications,
} from 'ionicons/icons';
import {
  HeartPulse, Plus, CheckCheck, Megaphone, Calendar, Syringe,
} from 'lucide-react';
import { useUserAuth, userApi } from '../../context/UserAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import vaccinationReminderService from '../../services/vaccinationReminderService';
import pushNotificationService from '../../services/pushNotificationService';

const SEEN_KEY = 'bh_seen_notifs_v2';

function getSeenIds() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveSeenIds(set) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const aptStatus = {
  approved:  { bg: '#dbeafe', color: '#1d4ed8' },
  rejected:  { bg: '#fee2e2', color: '#dc2626' },
  completed: { bg: '#dcfce7', color: '#16a34a' },
  cancelled: { bg: '#f3f4f6', color: '#6b7280' },
};

function UserNotificationBell({ navigate }) {
  const [open, setOpen]       = useState(false);
  const [items, setItems]     = useState([]);
  const [seenIds, setSeenIds] = useState(getSeenIds);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter]   = useState('all');
  const bellRef               = useRef(null);
  const dropRef               = useRef(null);

  const unreadCount = items.filter((n) => !seenIds.has(n.id)).length;
  const displayed   = filter === 'unread' ? items.filter((n) => !seenIds.has(n.id)) : items;

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userApi.get('/user/notifications');
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target) &&
        bellRef.current && !bellRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAllSeen = () => {
    const newSet = new Set(items.map((n) => n.id));
    saveSeenIds(newSet);
    setSeenIds(newSet);
  };

  const handleItemClick = (n) => {
    const newSet = new Set([...seenIds, n.id]);
    saveSeenIds(newSet);
    setSeenIds(newSet);
    setOpen(false);
    navigate(n.navigateTo);
  };

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open) fetchNotifs();
  };

  return (
    <div style={{ position: 'relative' }} ref={bellRef}>
      {/* Bell button */}
      <div
        style={{
          width: 40, height: 40, borderRadius: '50%', cursor: 'pointer',
          backgroundColor: open ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', transition: 'background 0.15s',
        }}
        onClick={handleOpen}
      >
        <IonIcon icon={notificationsOutline} style={{ fontSize: 22, color: '#fff' }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            minWidth: 16, height: 16, borderRadius: 999,
            backgroundColor: '#e53935', border: '2px solid #1e40af',
            fontSize: 9, fontWeight: 800, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      {/* Facebook-style dropdown */}
      {open && ReactDOM.createPortal(
        <>
          <style>{`
            @keyframes bh-fb-drop {
              from { opacity: 0; transform: scale(0.95) translateY(-8px); }
              to   { opacity: 1; transform: scale(1)    translateY(0); }
            }
            .bh-notif-row { transition: background 0.12s; }
            .bh-notif-row:hover { background: #f0f2f5 !important; }
            .bh-notif-row:active { background: #e4e6ea !important; }
          `}</style>

          {/* invisible backdrop */}
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />

          {/* Dropdown panel */}
          <div ref={dropRef} style={{
            position: 'fixed',
            ...(() => {
              const vw = window.innerWidth;
              const r = bellRef.current?.getBoundingClientRect();
              const width = Math.min(vw - 16, 380);
              let right = r ? vw - r.right : 8;
              // keep the panel fully on-screen (no left overflow on small phones)
              right = Math.max(8, Math.min(right, vw - width - 8));
              return { top: r ? r.bottom + 8 : 60, right, width };
            })(),
            backgroundColor: '#fff',
            borderRadius: 12,
            boxShadow: '0 8px 40px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
            zIndex: 9999,
            display: 'flex', flexDirection: 'column',
            maxHeight: '80vh',
            animation: 'bh-fb-drop 0.18s cubic-bezier(0.22,1,0.36,1) both',
            transformOrigin: 'top right',
          }}>

            {/* Header */}
            <div style={{ padding: '16px 16px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#050505', letterSpacing: '-0.5px' }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button onClick={markAllSeen} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: '#1877f2', fontWeight: 600, padding: '4px 8px',
                    borderRadius: 6,
                  }}>
                    Mark all as read
                  </button>
                )}
              </div>
              {unreadCount > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <span
                    onClick={() => setFilter('all')}
                    style={{
                      fontSize: 13, fontWeight: filter === 'all' ? 700 : 600,
                      color: filter === 'all' ? '#050505' : '#65676b',
                      padding: '4px 12px', borderRadius: 20,
                      backgroundColor: filter === 'all' ? '#e7f3ff' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >All</span>
                  <span
                    onClick={() => setFilter('unread')}
                    style={{
                      fontSize: 13, fontWeight: filter === 'unread' ? 700 : 600,
                      color: filter === 'unread' ? '#050505' : '#65676b',
                      padding: '4px 12px', borderRadius: 20,
                      backgroundColor: filter === 'unread' ? '#e7f3ff' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}</span>
                </div>
              )}
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 8 }}>
              {loading ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: '#65676b', fontSize: 14 }}>
                  Loading…
                </div>
              ) : displayed.length === 0 ? (
                <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: '50%', margin: '0 auto 12px',
                    backgroundColor: '#e4e6ea',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <IonIcon icon={notificationsOutline} style={{ fontSize: 28, color: '#65676b' }} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#050505' }}>
                    {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                  </div>
                  <div style={{ fontSize: 13, color: '#65676b', marginTop: 4 }}>
                    You're all caught up!
                  </div>
                </div>
              ) : (
                <>
                  {unreadCount > 0 && (
                    <div style={{ padding: '8px 16px 4px' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#050505' }}>
                        {filter === 'unread' ? 'Unread' : 'New'}
                      </span>
                    </div>
                  )}
                  {displayed.slice(0, 7).map((n) => {
                    const seen    = seenIds.has(n.id);
                    const isAnn   = n.type === 'announcement';
                    const isVax   = n.type === 'vaccine';
                    const ss      = (!isAnn && !isVax) ? (aptStatus[n.status] || aptStatus.cancelled) : null;
                    const vaxBgMap = { missed: 'linear-gradient(135deg,#dc2626,#b91c1c)', overdue: 'linear-gradient(135deg,#dc2626,#b91c1c)', soon: 'linear-gradient(135deg,#f59e0b,#d97706)', upcoming: 'linear-gradient(135deg,#3b82f6,#2563eb)' };
                    const iconBg  = isAnn
                      ? 'linear-gradient(135deg, #facc15, #f59e0b)'
                      : isVax
                        ? (vaxBgMap[n.urgency] || vaxBgMap.upcoming)
                        : `linear-gradient(135deg, ${ss?.color}cc, ${ss?.color})`;
                    return (
                      <div
                        key={n.id}
                        className="bh-notif-row"
                        onClick={() => handleItemClick(n)}
                        style={{
                          padding: '8px 12px',
                          display: 'flex', alignItems: 'center', gap: 12,
                          backgroundColor: seen ? '#fff' : (isVax && (n.urgency === 'missed' || n.urgency === 'overdue') ? '#fff1f2' : '#e7f3ff'),
                          cursor: 'pointer', borderRadius: 8, margin: '2px 4px',
                        }}
                      >
                        {/* Avatar circle with icon badge */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div style={{
                            width: 56, height: 56, borderRadius: '50%',
                            backgroundColor: '#e4e6ea',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 24,
                          }}>
                            {isAnn ? '📢' : isVax ? '💉' : '🏥'}
                          </div>
                          {/* small icon badge */}
                          <div style={{
                            position: 'absolute', bottom: -2, right: -2,
                            width: 22, height: 22, borderRadius: '50%',
                            background: iconBg,
                            border: '2px solid #fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {isAnn
                              ? <Megaphone size={11} color="#fff" />
                              : isVax
                                ? <Syringe  size={11} color="#fff" />
                                : <Calendar  size={11} color="#fff" />}
                          </div>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 14, fontWeight: seen ? 400 : 700,
                            color: '#050505', lineHeight: 1.35,
                            display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            {n.title}
                          </div>
                          <div style={{
                            fontSize: 12, color: '#65676b', marginTop: 2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {n.message}
                          </div>
                          <div style={{
                            fontSize: 12, fontWeight: seen ? 400 : 700,
                            color: seen ? '#65676b' : '#1877f2',
                            marginTop: 3,
                          }}>
                            {timeAgo(n.timestamp)}
                          </div>
                        </div>

                        {/* Unread blue dot */}
                        {!seen && (
                          <div style={{
                            width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                            backgroundColor: '#1877f2',
                          }} />
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid #e4e6ea', padding: '8px 12px' }}>
              <button
                onClick={() => { setOpen(false); navigate('/user/notifications'); }}
                style={{
                  width: '100%', background: '#e4e6ea', border: 'none', borderRadius: 8,
                  cursor: 'pointer', padding: '10px', fontSize: 14,
                  color: '#050505', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                See all notifications {items.length > 7 ? `(${items.length})` : ''}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

const getBottomNavItems = (t) => [
  { path: '/user',                  labelKey: 'home',         icon: homeOutline,         activeIcon: home,         color: '#1d4ed8', activeBg: '#dbeafe' },
  { path: '/user/appointments',     labelKey: 'appointments', icon: calendarOutline,     activeIcon: calendar,     color: '#7c3aed', activeBg: '#ede9fe' },
  { path: '/user/health-records',   labelKey: 'records',      icon: documentTextOutline, activeIcon: documentText, color: '#0891b2', activeBg: '#cffafe' },
  { path: '/user/health-services',  labelKey: 'services',     icon: medkitOutline,       activeIcon: medkit,       color: '#059669', activeBg: '#d1fae5' },
  { path: '/user/profile',          labelKey: 'profile',      icon: personOutline,       activeIcon: person,       color: '#e11d48', activeBg: '#ffe4e6' },
];

const navGroups = [
  {
    label: 'Main',
    items: [
      { path: '/user', label: 'Home', icon: homeOutline, activeIcon: home },
      { path: '/user/announcements', label: 'Announcements', icon: megaphoneOutline, activeIcon: megaphone },
    ],
  },
  {
    label: 'Appointments',
    items: [
      { path: '/user/appointments', label: 'My Appointments', icon: calendarOutline, activeIcon: calendar },
      { path: '/user/appointment-history', label: 'Appointment History', icon: timeOutline, activeIcon: time },
    ],
  },
  {
    label: 'Health',
    items: [
      { path: '/user/health-records', label: 'Health Records', icon: documentTextOutline, activeIcon: documentText },
      { path: '/user/vaccinations', label: 'Vaccinations', icon: shieldCheckmarkOutline, activeIcon: shieldCheckmark },
      { path: '/user/health-services', label: 'Health Services', icon: medkitOutline, activeIcon: medkit },
    ],
  },
  {
    label: 'Emergency',
    items: [
      { path: '/user/emergency-contact', label: 'Emergency Contact', icon: callOutline, activeIcon: call },
    ],
  },
  {
    label: 'Account',
    items: [
      { path: '/user/profile', label: 'My Profile', icon: personOutline, activeIcon: person },
    ],
  },
];

const getGreeting = (t) => {
  if (!t || typeof t !== 'function') return 'Good morning';
  const hour = new Date().getHours();
  if (hour < 12) return t('goodMorning');
  if (hour < 18) return t('goodAfternoon');
  return t('goodEvening');
};

const UserLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);
  const { currentUser, logout: userLogout } = useUserAuth();
  const { language, toggleLanguage, t } = useLanguage();

  const displayName = currentUser?.full_name || currentUser?.username || 'Guest';
  const initials = displayName.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'G';
  const bottomNavItems = getBottomNavItems(t);
  const isGuest = !currentUser;

  // Initialize vaccination reminder service
  useEffect(() => {
    if (currentUser) {
      vaccinationReminderService.init();
      // Register for FCM remote push so notifications arrive even when closed
      pushNotificationService.register(currentUser.id);
      console.log('[UserLayout] Vaccination reminder service initialized');
    }

    return () => {
      vaccinationReminderService.stop();
      console.log('[UserLayout] Vaccination reminder service stopped');
    };
  }, [currentUser]);

  const handleLogout = () => {
    vaccinationReminderService.stop();
    userLogout();
    navigate('/login', { replace: true });
  };

  const closeMenu = () => {
    menuRef.current?.close();
  };

  return (
    <IonApp>
      {/* Side Menu */}
      <IonMenu ref={menuRef} contentId="user-main" type="overlay" style={{ '--width': '280px' }}>
        <IonHeader className="ion-no-border">
          <IonToolbar
            style={{
              '--background': '#0f172a',
              '--color': '#fff',
              '--min-height': '80px',
              '--border-color': 'transparent',
            }}
          >
            <div style={{ padding: '16px 16px 12px' }}>
              <div className="d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-3 position-relative"
                  style={{
                    width: 42, height: 42,
                    background: 'rgba(255,255,255,0.15)',
                    border: '1.5px solid rgba(255,255,255,0.25)',
                    borderRadius: 12,
                  }}
                >
                  <HeartPulse size={22} color="#fff" />
                  <span
                    className="d-flex align-items-center justify-content-center rounded-circle position-absolute"
                    style={{ width: 14, height: 14, backgroundColor: '#ef4444', border: '2px solid #1e40af', bottom: -3, right: -3 }}
                  >
                    <Plus size={8} color="#fff" strokeWidth={3} />
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>B-Health</div>
                  <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 500, letterSpacing: '0.04em' }}>{t('userPortal')}</div>
                </div>
              </div>
            </div>
          </IonToolbar>
        </IonHeader>

        <IonContent
          style={{
            '--background': '#1e293b',
          }}
        >
          {/* User Card */}
          <div style={{ padding: '16px', paddingBottom: 0 }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                padding: '14px 16px',
              }}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
                  style={{
                    width: 44, height: 44,
                    background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                    border: '2px solid rgba(96,165,250,0.4)',
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 500, marginTop: 1 }}>
                    {isGuest ? t('browseAsGuest') : `Purok ${currentUser?.purok || '—'}`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Groups */}
          {navGroups.map((group) => (
            <IonItemGroup key={group.label}>
              <IonItemDivider
                style={{
                  '--background': 'transparent',
                  '--color': '#475569',
                  '--padding-start': '16px',
                  '--inner-padding-end': '16px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  minHeight: 32,
                  marginTop: 8,
                }}
              >
                <IonLabel>{group.label}</IonLabel>
              </IonItemDivider>
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <IonMenuToggle key={item.path} autoHide={false}>
                    <IonItem
                      button
                      onClick={() => { navigate(item.path); closeMenu(); }}
                      lines="none"
                      detail={false}
                      style={{
                        '--background': isActive ? 'rgba(96,165,250,0.12)' : 'transparent',
                        '--background-hover': 'rgba(255,255,255,0.05)',
                        '--color': isActive ? '#93c5fd' : '#cbd5e1',
                        '--padding-start': '16px',
                        '--inner-padding-end': '16px',
                        '--min-height': '44px',
                        borderRadius: 10,
                        margin: '0 8px',
                        fontWeight: isActive ? 600 : 400,
                        fontSize: 14,
                        '--border-color': 'transparent',
                      }}
                    >
                      <IonIcon
                        slot="start"
                        icon={isActive ? item.activeIcon : item.icon}
                        style={{
                          color: isActive ? '#60a5fa' : '#64748b',
                          fontSize: 20,
                          marginRight: 12,
                        }}
                      />
                      <IonLabel>{item.label}</IonLabel>
                      {isActive && (
                        <div
                          slot="end"
                          style={{
                            width: 3, height: 18, borderRadius: 2,
                            backgroundColor: '#60a5fa',
                          }}
                        />
                      )}
                    </IonItem>
                  </IonMenuToggle>
                );
              })}
            </IonItemGroup>
          ))}

          {/* Sign In / Sign Out */}
          <div style={{ padding: '16px', marginTop: 8 }}>
            {isGuest ? (
              <IonButton
                expand="block"
                fill="solid"
                onClick={() => { closeMenu(); navigate('/login'); }}
                style={{
                  '--background': 'linear-gradient(135deg, #1d4ed8, #1e40af)',
                  '--background-activated': 'linear-gradient(135deg, #1e40af, #1e3a8a)',
                  '--border-radius': '10px',
                  '--color': '#fff',
                  '--box-shadow': '0 4px 12px rgba(29,78,216,0.3)',
                  fontWeight: 600,
                  fontSize: 14,
                  height: 46,
                }}
              >
                <IonIcon slot="start" icon={personOutline} style={{ color: '#fff' }} />
                {t('signIn')}
              </IonButton>
            ) : (
              <IonButton
                expand="block"
                fill="solid"
                onClick={handleLogout}
                style={{
                  '--background': 'rgba(239,68,68,0.12)',
                  '--background-activated': 'rgba(239,68,68,0.2)',
                  '--border-radius': '10px',
                  '--color': '#fca5a5',
                  '--box-shadow': 'none',
                  fontWeight: 600,
                  fontSize: 14,
                  height: 46,
                }}
              >
                <IonIcon slot="start" icon={logOutOutline} style={{ color: '#f87171' }} />
                {t('signOut')}
              </IonButton>
            )}
          </div>
        </IonContent>
      </IonMenu>

      {/* Main Page */}
      <IonPage id="user-main">
        {/* Header */}
        <IonHeader className="ion-no-border">
          <IonToolbar
            style={{
              '--background': 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 50%, #1e3a8a 100%)',
              '--color': '#fff',
              '--min-height': '0px',
              paddingTop: 'env(safe-area-inset-top, 0px)',
            }}
          >
            <div style={{ padding: '14px 16px 16px' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <IonMenuButton
                    style={{
                      '--color': '#fff',
                      '--padding-start': '0',
                      '--padding-end': '0',
                      width: 40, height: 40,
                      '--background-hover': 'rgba(255,255,255,0.12)',
                      '--border-radius': '10px',
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, color: 'rgba(147,197,253,0.95)', fontWeight: 500 }}>
                      {getGreeting(t)} 👋
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginTop: 1 }}>
                      {displayName}
                    </div>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    onClick={toggleLanguage}
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      border: '1.5px solid rgba(255,255,255,0.25)',
                      borderRadius: 10,
                      padding: '6px 10px',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                  >
                    {language === 'en' ? '🇵🇭 TL' : '🇺🇸 EN'}
                  </button>
                  <UserNotificationBell navigate={navigate} />
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
                    style={{
                      width: 42, height: 42,
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))',
                      border: '2px solid rgba(255,255,255,0.3)',
                      fontSize: 15,
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate('/user/profile')}
                  >
                    {initials}
                  </div>
                </div>
              </div>
            </div>
          </IonToolbar>
        </IonHeader>

        {/* Content */}
        <IonContent
          style={{
            '--background': '#eff6ff',
          }}
        >
          <div style={{ padding: 16, paddingBottom: 100 }}>
            <Outlet />
          </div>
        </IonContent>

        {/* Bottom Tab Bar */}
        <IonFooter className="ion-no-border">
          <style>{`
            @keyframes bnav-pop {
              0%   { transform: scale(0.7); opacity: 0; }
              60%  { transform: scale(1.15); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes bnav-label-in {
              from { opacity: 0; transform: translateY(4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .bnav-btn {
              flex: 1; display: flex; flex-direction: column;
              align-items: center; justify-content: center;
              gap: 4px; padding: 8px 4px;
              background: none; border: none; cursor: pointer;
              -webkit-tap-highlight-color: transparent;
              position: relative;
            }
            .bnav-pill {
              display: flex; align-items: center; justify-content: center;
              width: 52px; height: 36px; border-radius: 18px;
              transition: background 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease;
              box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            }
            .bnav-btn.active .bnav-pill {
              animation: bnav-pop 0.32s cubic-bezier(0.34,1.56,0.64,1) both;
              box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            }
            .bnav-icon {
              transition: color 0.2s, opacity 0.2s, transform 0.2s;
            }
            .bnav-label {
              font-size: 11px; font-weight: 700; letter-spacing: 0.02em;
              transition: color 0.2s, opacity 0.2s;
            }
            .bnav-btn.active .bnav-label {
              animation: bnav-label-in 0.25s ease 0.1s both;
            }
          `}</style>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px 24px 0 0',
            boxShadow: '0 -6px 32px rgba(0,0,0,0.12)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            display: 'flex',
            borderTop: '1px solid #f1f5f9',
          }}>
            {bottomNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  className={`bnav-btn${isActive ? ' active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <div
                    className="bnav-pill"
                    style={{
                      background: isActive ? item.color : '#f8fafc',
                      transform: isActive ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    <IonIcon
                      icon={isActive ? item.activeIcon : item.icon}
                      className="bnav-icon"
                      style={{
                        fontSize: 24,
                        color: isActive ? '#ffffff' : item.color,
                        opacity: isActive ? 1 : 0.85,
                        transform: isActive ? 'scale(1.1)' : 'scale(1)',
                      }}
                    />
                  </div>
                  <span
                    className="bnav-label"
                    style={{ color: isActive ? item.color : '#64748b', opacity: isActive ? 1 : 0.9 }}
                  >
                    {t(item.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </IonFooter>
      </IonPage>
    </IonApp>
  );
};

export default UserLayout;
