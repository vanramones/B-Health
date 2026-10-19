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
  megaphone, timeOutline, time,
  callOutline, call, notificationsOutline, notifications,
} from 'ionicons/icons';
import {
  HeartPulse, Plus, CheckCheck, Megaphone, Calendar, Syringe,
} from 'lucide-react';
import { useUserAuth, userApi } from '../../context/UserAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import pushNotificationService from '../../services/pushNotificationService';
import { supabase } from '../../config/supabase';
import { CalendarClock, MessageSquare, Bell as BellIcon, X as XIcon } from 'lucide-react';

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

function UserNotificationBell({ navigate, currentUserId, currentUserName }) {
  const [open, setOpen]       = useState(false);
  const [items, setItems]     = useState([]);
  const [seenIds, setSeenIds] = useState(getSeenIds);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter]   = useState('all');
  const [banner, setBanner]   = useState(null); // in-app banner {title, message, type}
  const bellRef               = useRef(null);
  const dropRef               = useRef(null);
  const bannerTimerRef        = useRef(null);
  // Always-fresh ref so the realtime closure reads the latest name
  const currentUserNameRef    = useRef(currentUserName);
  useEffect(() => { currentUserNameRef.current = currentUserName; }, [currentUserName]);

  const unreadCount = items.filter((n) => !seenIds.has(n.id)).length;
  const displayed   = filter === 'unread' ? items.filter((n) => !seenIds.has(n.id)) : items;

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userApi.get('/user/notifications');
      const fetched = Array.isArray(data) ? data : [];
      const fetchedIds = new Set(fetched.map((n) => String(n.id)));
      setItems((prev) => {
        // Keep realtime-added items that are not yet in the fetched list
        const realtimeOnly = prev.filter((n) => !fetchedIds.has(String(n.id)));
        return [...fetched, ...realtimeOnly].sort(
          (a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at)
        );
      });
    } catch { /* keep existing items on error */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  // ── Realtime: listen for new notifications (user app only sees user notifications) ──
  useEffect(() => {
    const channel = supabase
      .channel('user-notifs-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, (payload) => {
        const n = payload.new;
        if (!n) return;
        // Skip admin/staff-only notifications
        const recipient = (n.recipient || '').trim();
        if (recipient === 'All Staff') return;
        if (/vaccin/i.test(`${n.type} ${n.title}`)) return;
        // If we know the user's name, also skip notifications not meant for them
        const myName = (currentUserNameRef.current || '').toLowerCase().trim();
        if (myName && recipient && recipient.toLowerCase().trim() !== myName) return;
        // Build notification item for the bell
        const isReschedule = /reschedule/i.test(n.title || '');
        const newItem = {
          id: `notif_${n.id}`,
          sourceId: n.id,
          type: isReschedule ? 'reschedule' : (n.type === 'health_record' ? 'health_record' : 'appointment'),
          status: isReschedule ? 'rescheduled' : 'notified',
          title: n.title || 'New Notification',
          message: n.message || '',
          timestamp: n.created_at || new Date().toISOString(),
          navigateTo: n.route || '/user/appointments',
          isRead: false,
        };
        // Add to bell list immediately
        setItems((prev) => {
          const exists = prev.some((x) => x.id === newItem.id);
          return exists ? prev : [newItem, ...prev];
        });
        // Re-fetch after 1.5s so the DB-sourced list (reschedN) also loads
        setTimeout(() => fetchNotifs(), 1500);
        // Show dark banner
        setBanner({
          id: n.id,
          title: n.title || 'New Notification',
          message: n.message || '',
          type: isReschedule ? 'reschedule' : 'general',
          route: n.route || '/user/appointments',
        });
        clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = setTimeout(() => setBanner(null), 6000);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // Re-subscribe only when the user name is first resolved
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {/* ── In-app notification banner (reschedule / general) ── */}
      {banner && ReactDOM.createPortal(
        <div
          onClick={() => { setBanner(null); navigate(banner.route); }}
          style={{
            position: 'fixed', top: 16, left: 12, right: 12, zIndex: 99999,
            background: banner.type === 'reschedule'
              ? 'linear-gradient(135deg, #0f172a, #1e293b)'
              : 'linear-gradient(135deg, #0f766e, #0d9488)',
            borderRadius: 16,
            padding: '14px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'flex-start', gap: 12,
            cursor: 'pointer',
            border: `1px solid ${banner.type === 'reschedule' ? '#334155' : '#14b8a6'}`,
            animation: 'bh-banner-in 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <style>{`
            @keyframes bh-banner-in {
              from { opacity:0; transform: translateY(-20px) scale(0.95); }
              to   { opacity:1; transform: translateY(0) scale(1); }
            }
          `}</style>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: banner.type === 'reschedule' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {banner.type === 'reschedule'
              ? <CalendarClock size={18} color="#fbbf24" />
              : <BellIcon size={18} color="#fff" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: banner.type === 'reschedule' ? '#fbbf24' : '#fff', marginBottom: 2 }}>
              {banner.title}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {banner.message}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
              Tap to view appointment →
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setBanner(null); }}
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}
          >
            <XIcon size={14} />
          </button>
        </div>,
        document.body
      )}

      {/* Bell button */}
      <div
        style={{
          width: 38, height: 38, borderRadius: '50%', cursor: 'pointer',
          backgroundColor: open ? '#f0fdfa' : '#f1f5f9',
          border: `1.5px solid ${open ? '#99f6e4' : '#e2e8f0'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', transition: 'background 0.15s',
        }}
        onClick={handleOpen}
      >
        <IonIcon icon={notificationsOutline} style={{ fontSize: 20, color: '#0d9488' }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 1, right: 1,
            minWidth: 15, height: 15, borderRadius: 999,
            backgroundColor: '#ef4444', border: '2px solid #fff',
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
                    const seen       = seenIds.has(n.id);
                    const isAnn      = n.type === 'announcement';
                    const isVax      = n.type === 'vaccine';
                    const isResched  = n.type === 'reschedule';
                    const isHealth   = n.type === 'health_record';
                    const ss         = (!isAnn && !isVax && !isResched && !isHealth) ? (aptStatus[n.status] || aptStatus.cancelled) : null;
                    const vaxBgMap   = { missed: 'linear-gradient(135deg,#dc2626,#b91c1c)', overdue: 'linear-gradient(135deg,#dc2626,#b91c1c)', soon: 'linear-gradient(135deg,#f59e0b,#d97706)', upcoming: 'linear-gradient(135deg,#3b82f6,#2563eb)' };
                    const iconBg     = isAnn
                      ? 'linear-gradient(135deg, #facc15, #f59e0b)'
                      : isVax
                        ? (vaxBgMap[n.urgency] || vaxBgMap.upcoming)
                        : isResched
                          ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                          : isHealth
                            ? 'linear-gradient(135deg, #0d9488, #0f766e)'
                            : `linear-gradient(135deg, ${ss?.color}cc, ${ss?.color})`;
                    return (
                      <div
                        key={n.id}
                        className="bh-notif-row"
                        onClick={() => handleItemClick(n)}
                        style={{
                          padding: '8px 12px',
                          display: 'flex', alignItems: 'center', gap: 12,
                          backgroundColor: seen ? '#fff' : (isResched ? '#fffbeb' : isVax && (n.urgency === 'missed' || n.urgency === 'overdue') ? '#fff1f2' : '#e7f3ff'),
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
                            {isAnn ? '📢' : isVax ? '💉' : isResched ? '📅' : '🏥'}
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
                                ? <Syringe    size={11} color="#fff" />
                                : isResched
                                  ? <CalendarClock size={11} color="#fff" />
                                  : <Calendar size={11} color="#fff" />}
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

const PRIMARY = '#0d9488';   // teal-600 — professional health green

const getBottomNavItems = (t) => [
  { path: '/user',                  labelKey: 'home',         icon: homeOutline,         activeIcon: home,         color: PRIMARY, activeBg: '#ccfbf1' },
  { path: '/user/health-records',   labelKey: 'records',      icon: documentTextOutline, activeIcon: documentText, color: PRIMARY, activeBg: '#ccfbf1' },
  { path: '/user/appointments',     labelKey: 'appointments', icon: calendarOutline,     activeIcon: calendar,     color: PRIMARY, activeBg: '#ccfbf1' },
  { path: '/user/health-services',  labelKey: 'services',     icon: medkitOutline,       activeIcon: medkit,       color: PRIMARY, activeBg: '#ccfbf1' },
  { path: '/user/profile',          labelKey: 'profile',      icon: personOutline,       activeIcon: person,       color: PRIMARY, activeBg: '#ccfbf1' },
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

  useEffect(() => {
    if (currentUser) {
      // Register for FCM remote push so notifications arrive even when closed
      pushNotificationService.register(currentUser.id);
    }
  }, [currentUser]);

  const handleLogout = () => {
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
          <IonToolbar style={{ '--background': '#0f172a', '--color': '#fff', '--min-height': '80px', '--border-color': 'transparent', borderBottom: `3px solid ${PRIMARY}` }}>
            <div style={{ padding: '16px 16px 12px' }}>
              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center justify-content-center rounded-3 position-relative"
                  style={{ width: 42, height: 42, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 12 }}>
                  <HeartPulse size={22} color="#fff" />
                  <span className="d-flex align-items-center justify-content-center rounded-circle position-absolute"
                    style={{ width: 14, height: 14, backgroundColor: '#ef4444', border: '2px solid #0f172a', bottom: -3, right: -3 }}>
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

        <IonContent style={{ '--background': '#1e293b' }}>
          {/* User Card */}
          <div style={{ padding: '16px', paddingBottom: 0 }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px' }}>
              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center justify-content-center rounded-circle fw-bold"
                  style={{ width: 44, height: 44, background: `linear-gradient(135deg, ${PRIMARY}, #14b8a6)`, border: '2px solid rgba(20,184,166,0.4)', fontSize: 15, flexShrink: 0, color: '#fff' }}>
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: '#5eead4', fontWeight: 500, marginTop: 1 }}>
                    {isGuest ? t('browseAsGuest') : `Purok ${currentUser?.purok || '—'}`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Groups */}
          {navGroups.map((group) => (
            <IonItemGroup key={group.label}>
              <IonItemDivider style={{ '--background': 'transparent', '--color': '#475569', '--padding-start': '16px', '--inner-padding-end': '16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', minHeight: 32, marginTop: 8 }}>
                <IonLabel>{group.label}</IonLabel>
              </IonItemDivider>
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <IonMenuToggle key={item.path} autoHide={false}>
                    <IonItem button onClick={() => { navigate(item.path); closeMenu(); }} lines="none" detail={false}
                      style={{
                        '--background': isActive ? 'rgba(20,184,166,0.15)' : 'transparent',
                        '--background-hover': 'rgba(255,255,255,0.05)',
                        '--color': isActive ? '#5eead4' : '#cbd5e1',
                        '--padding-start': '16px',
                        '--inner-padding-end': '16px',
                        '--min-height': '44px',
                        borderRadius: 10,
                        margin: '0 8px',
                        fontWeight: isActive ? 600 : 400,
                        fontSize: 14,
                        '--border-color': 'transparent',
                      }}>
                      <IonIcon slot="start" icon={isActive ? item.activeIcon : item.icon}
                        style={{ color: isActive ? '#5eead4' : '#64748b', fontSize: 20, marginRight: 12 }} />
                      <IonLabel>{item.label}</IonLabel>
                      {isActive && <div slot="end" style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: '#5eead4' }} />}
                    </IonItem>
                  </IonMenuToggle>
                );
              })}
            </IonItemGroup>
          ))}

          {/* Sign In / Sign Out */}
          <div style={{ padding: '16px', marginTop: 8 }}>
            {isGuest ? (
              <IonButton expand="block" fill="solid" onClick={() => { closeMenu(); navigate('/login'); }}
                style={{ '--background': `linear-gradient(135deg, ${PRIMARY}, #14b8a6)`, '--background-activated': `linear-gradient(135deg, #0f766e, ${PRIMARY})`, '--border-radius': '10px', '--color': '#fff', '--box-shadow': `0 4px 12px ${PRIMARY}44`, fontWeight: 600, fontSize: 14, height: 46 }}>
                <IonIcon slot="start" icon={personOutline} style={{ color: '#fff' }} />
                {t('signIn')}
              </IonButton>
            ) : (
              <IonButton expand="block" fill="solid" onClick={handleLogout}
                style={{ '--background': 'rgba(239,68,68,0.12)', '--background-activated': 'rgba(239,68,68,0.2)', '--border-radius': '10px', '--color': '#fca5a5', '--box-shadow': 'none', fontWeight: 600, fontSize: 14, height: 46 }}>
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
              '--background': '#ffffff',
              '--color': '#1e293b',
              '--min-height': '0px',
              '--border-width': '0',
              paddingTop: 'env(safe-area-inset-top, 0px)',
              borderBottom: `3px solid ${PRIMARY}`,
              boxShadow: '0 2px 8px rgba(13,148,136,0.10)',
            }}
          >
            <div style={{ padding: '12px 16px 14px' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <IonMenuButton
                    style={{
                      '--color': PRIMARY,
                      '--padding-start': '0',
                      '--padding-end': '0',
                      width: 38, height: 38,
                      '--background-hover': '#f0fdfa',
                      '--border-radius': '10px',
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                      {getGreeting(t)}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginTop: 1 }}>
                      {displayName}
                    </div>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    onClick={toggleLanguage}
                    style={{
                      background: '#f0fdfa',
                      border: `1.5px solid #99f6e4`,
                      borderRadius: 8,
                      padding: '5px 9px',
                      color: PRIMARY,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'en' ? '🇵🇭 TL' : '🇺🇸 EN'}
                  </button>
                  <UserNotificationBell navigate={navigate} currentUserId={currentUser?.id} currentUserName={currentUser?.full_name} />
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle fw-bold"
                    style={{
                      width: 38, height: 38,
                      background: `linear-gradient(135deg, ${PRIMARY}, #14b8a6)`,
                      color: '#fff',
                      fontSize: 14,
                      cursor: 'pointer',
                      boxShadow: `0 2px 8px ${PRIMARY}44`,
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
          scrollY
          style={{ '--background': '#f8fafc' }}
        >
          <div style={{ padding: 16, paddingBottom: 24 }}>
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
            @keyframes pulse-ring {
              0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.6; }
              50% { transform: translateX(-50%) scale(1.15); opacity: 0.3; }
            }
            @keyframes bounce-badge {
              0%, 100% { transform: scale(1) translateY(0); }
              50% { transform: scale(1.1) translateY(-2px); }
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
            borderRadius: '20px 20px 0 0',
            boxShadow: '0 -4px 20px rgba(13,148,136,0.08)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            display: 'flex',
            borderTop: `2px solid #f0fdfa`,
          }}>
            {bottomNavItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              const isAppointments = index === 2; // Appointments is now the 3rd item (index 2, center)
              return (
                <button
                  key={item.path}
                  className={`bnav-btn${isActive ? ' active' : ''}${isAppointments ? ' bnav-appointments' : ''}`}
                  onClick={() => navigate(item.path)}
                  style={isAppointments ? { marginTop: -24, position: 'relative', zIndex: 10 } : {}}
                >
                  {isAppointments && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(13,148,136,0.15) 0%, transparent 70%)',
                      animation: 'pulse-ring 2s ease-in-out infinite',
                    }} />
                  )}
                  <div
                    className="bnav-pill"
                    style={{
                      background: isAppointments 
                        ? 'linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)'
                        : isActive ? item.color : '#f8fafc',
                      transform: isActive && !isAppointments ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      ...(isAppointments && { 
                        width: 68, 
                        height: 68, 
                        borderRadius: '50%', 
                        boxShadow: '0 12px 32px rgba(13,148,136,0.4), 0 6px 16px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.3)',
                        border: '4px solid #ffffff',
                        position: 'relative',
                      }),
                    }}
                  >
                    {isAppointments && (
                      <div style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        border: '2px solid #ffffff',
                        boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#fff',
                        animation: 'bounce-badge 1s ease-in-out infinite',
                      }}>
                        <Plus size={12} strokeWidth={3} />
                      </div>
                    )}
                    <IonIcon
                      icon={isActive ? item.activeIcon : item.icon}
                      className="bnav-icon"
                      style={{
                        fontSize: isAppointments ? 34 : 24,
                        color: isAppointments ? '#ffffff' : isActive ? '#ffffff' : item.color,
                        opacity: 1,
                        transform: isActive && !isAppointments ? 'scale(1.1)' : 'scale(1)',
                        filter: isAppointments ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none',
                      }}
                    />
                  </div>
                  <span
                    className="bnav-label"
                    style={{ 
                      color: isActive || isAppointments ? item.color : '#64748b', 
                      opacity: isActive || isAppointments ? 1 : 0.9,
                      fontWeight: isAppointments ? 800 : isActive ? 700 : 600,
                      fontSize: isAppointments ? 10 : 11,
                      letterSpacing: isAppointments ? '0.03em' : '0.02em',
                    }}
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
