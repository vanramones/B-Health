import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../context/UserAuthContext';
import { Megaphone, Calendar, CheckCheck, Syringe } from 'lucide-react';
import { IonIcon } from '@ionic/react';
import { notificationsOutline } from 'ionicons/icons';

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
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const aptStatus = {
  approved:  { bg: '#dbeafe', color: '#1d4ed8' },
  rejected:  { bg: '#fee2e2', color: '#dc2626' },
  completed: { bg: '#dcfce7', color: '#16a34a' },
  cancelled: { bg: '#f3f4f6', color: '#6b7280' },
};

const vaxUrgency = {
  missed:   { bg: '#fee2e2', color: '#dc2626', grad: 'linear-gradient(135deg,#dc2626,#b91c1c)' },
  overdue:  { bg: '#fee2e2', color: '#dc2626', grad: 'linear-gradient(135deg,#dc2626,#b91c1c)' },
  soon:     { bg: '#fef3c7', color: '#92400e', grad: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  upcoming: { bg: '#dbeafe', color: '#1d4ed8', grad: 'linear-gradient(135deg,#3b82f6,#2563eb)' },
};

const UserNotifications = () => {
  const navigate = useNavigate();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [seenIds, setSeenIds] = useState(getSeenIds);
  const [tab, setTab]         = useState('all');

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userApi.get('/user/notifications');
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const markAllRead = () => {
    const newSet = new Set(items.map((n) => n.id));
    saveSeenIds(newSet);
    setSeenIds(newSet);
  };

  const handleClick = (n) => {
    const newSet = new Set([...seenIds, n.id]);
    saveSeenIds(newSet);
    setSeenIds(newSet);
    navigate(n.navigateTo);
  };

  const unreadCount = items.filter((n) => !seenIds.has(n.id)).length;
  const displayed   = tab === 'unread' ? items.filter((n) => !seenIds.has(n.id)) : items;

  return (
    <div style={{ 
      maxWidth: 680, 
      margin: '0 auto', 
      padding: 'env(safe-area-inset-top, 0) 0 env(safe-area-inset-bottom, 0)',
      minHeight: '100vh',
      backgroundColor: '#fff',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 12,
        padding: '12px 16px 0',
        flexShrink: 0,
      }}>
        <h4 style={{ fontSize: 20, fontWeight: 800, color: '#050505', margin: 0, letterSpacing: '-0.5px' }}>
          Notifications
        </h4>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#1877f2', fontWeight: 600, padding: '6px 10px',
              borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <CheckCheck size={14} /> Mark all as read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, padding: '0 16px', flexShrink: 0 }}>
        {[
          { key: 'all',    label: 'All' },
          { key: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: tab === t.key ? '#e7f3ff' : '#f0f2f5',
              border: 'none', borderRadius: 20, cursor: 'pointer',
              padding: '7px 18px', fontSize: 14,
              fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? '#1877f2' : '#050505',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ 
        backgroundColor: '#fff', 
        borderRadius: 0, 
        overflow: 'hidden', 
        boxShadow: 'none',
        margin: '0',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {loading ? (
          <div style={{ padding: '60px 16px', textAlign: 'center', color: '#65676b', fontSize: 14 }}>
            Loading notifications…
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: '60px 16px', textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
              backgroundColor: '#e4e6ea',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IonIcon icon={notificationsOutline} style={{ fontSize: 34, color: '#65676b' }} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#050505' }}>
              {tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </div>
            <div style={{ fontSize: 14, color: '#65676b', marginTop: 6 }}>
              {tab === 'unread' ? "You're all caught up!" : 'Notifications will appear here.'}
            </div>
          </div>
        ) : (
          displayed.map((n, idx) => {
            const seen   = seenIds.has(n.id);
            const isAnn  = n.type === 'announcement';
            const isVax  = n.type === 'vaccine';
            const ss     = (!isAnn && !isVax) ? (aptStatus[n.status] || aptStatus.cancelled) : null;
            const vu     = isVax ? (vaxUrgency[n.urgency] || vaxUrgency.upcoming) : null;
            const iconBg = isAnn
              ? 'linear-gradient(135deg, #facc15, #f59e0b)'
              : isVax
                ? vu.grad
                : `linear-gradient(135deg, ${ss?.color}cc, ${ss?.color})`;

            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  backgroundColor: seen ? '#fff' : (isVax && (n.urgency === 'missed' || n.urgency === 'overdue') ? '#fff1f2' : '#e7f3ff'),
                  borderBottom: idx < displayed.length - 1 ? '1px solid #f0f2f5' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = seen ? '#f0f2f5' : '#dbeafe'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = seen ? '#fff' : '#e7f3ff'}
              >
                {/* Avatar + badge */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    backgroundColor: '#e4e6ea',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24,
                  }}>
                    {isAnn ? '📢' : isVax ? '💉' : '🏥'}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 24, height: 24, borderRadius: '50%',
                    background: iconBg, border: '2px solid #fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isAnn
                      ? <Megaphone size={12} color="#fff" />
                      : isVax
                        ? <Syringe  size={12} color="#fff" />
                        : <Calendar  size={12} color="#fff" />}
                  </div>
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: seen ? 400 : 700,
                    color: '#050505', lineHeight: 1.3,
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
                    fontSize: 13, fontWeight: seen ? 400 : 700,
                    color: seen ? '#65676b' : '#1877f2',
                    marginTop: 4,
                  }}>
                    {timeAgo(n.timestamp)}
                  </div>
                </div>

                {/* Unread dot */}
                {!seen && (
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                    backgroundColor: '#1877f2',
                    boxShadow: '0 0 0 3px rgba(24,119,242,0.2)',
                  }} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UserNotifications;
