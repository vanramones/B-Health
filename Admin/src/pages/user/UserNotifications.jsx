import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../context/UserAuthContext';
import { Megaphone, Calendar, CheckCheck, Syringe, Trash2 } from 'lucide-react';
import { IonIcon } from '@ionic/react';
import { notificationsOutline } from 'ionicons/icons';
import { supabase } from '../../config/supabase';

const SEEN_KEY = 'bh_seen_notifs_v2';
const DELETED_KEY = 'bh_deleted_notifs';
function getSeenIds() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveSeenIds(set) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
}
function getDeletedIds() {
  try { return new Set(JSON.parse(localStorage.getItem(DELETED_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveDeletedIds(set) {
  localStorage.setItem(DELETED_KEY, JSON.stringify([...set]));
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

const SWIPE_THRESHOLD = 100;

const UserNotifications = () => {
  const navigate = useNavigate();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [seenIds, setSeenIds] = useState(getSeenIds);
  const [deletedIds, setDeletedIds] = useState(getDeletedIds);
  const [tab, setTab]         = useState('all');
  const [swipeState, setSwipeState] = useState({});
  const touchRef = useRef({});

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userApi.get('/user/notifications');
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  // ── Supabase Realtime — appointments ──
  useEffect(() => {
    const channel = supabase
      .channel('user-notifications-appointments')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'appointments' },
        (payload) => {
          const newStatus = payload.new?.status;
          if (!newStatus || newStatus === 'pending') return;

          // I-refresh ang notifications para ma-include ang bagong update
          fetchNotifs();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchNotifs]);

  // ── Supabase Realtime — announcements ──
  useEffect(() => {
    const channel = supabase
      .channel('user-notifications-announcements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
          filter: 'status=eq.published',
        },
        (payload) => {
          // Bagong announcement — i-refresh
          fetchNotifs();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchNotifs]);

  // ── Supabase Realtime — vaccinations ──
  useEffect(() => {
    const channel = supabase
      .channel('user-notifications-vaccinations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vaccinations' },
        () => {
          fetchNotifs();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchNotifs]);

  const markAllRead = () => {
    const newSet = new Set(items.map((n) => n.id));
    saveSeenIds(newSet);
    setSeenIds(newSet);
  };

  const handleClick = (n) => {
    if (swipeState[n.id]?.swiping) return;
    const newSet = new Set([...seenIds, n.id]);
    saveSeenIds(newSet);
    setSeenIds(newSet);
    navigate(n.navigateTo);
  };

  const handleDelete = (n) => {
    const newDeleted = new Set([...deletedIds, n.id]);
    saveDeletedIds(newDeleted);
    setDeletedIds(newDeleted);
    setSwipeState((prev) => ({ ...prev, [n.id]: { offset: 0, swiping: false } }));
  };

  const handleTouchStart = (e, n) => {
    const touch = e.touches[0];
    touchRef.current[n.id] = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    };
  };

  const handleTouchMove = (e, n) => {
    const touch = e.touches[0];
    const start = touchRef.current[n.id];
    if (!start) return;

    const deltaX = touch.clientX - start.startX;
    const deltaY = touch.clientY - start.startY;

    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaX) < 10) return;

    if (deltaX > 10) {
      e.preventDefault();
      const offset = Math.min(deltaX, 150);
      setSwipeState((prev) => ({ ...prev, [n.id]: { offset, swiping: true } }));
    }
  };

  const handleTouchEnd = (e, n) => {
    const state = swipeState[n.id];
    if (!state) return;

    if (state.offset >= SWIPE_THRESHOLD) {
      handleDelete(n);
    } else {
      setSwipeState((prev) => ({ ...prev, [n.id]: { offset: 0, swiping: false } }));
    }
    delete touchRef.current[n.id];
  };

  const visibleItems = items.filter((n) => !deletedIds.has(n.id));
  const unreadCount = visibleItems.filter((n) => !seenIds.has(n.id)).length;
  const displayed   = tab === 'unread' ? visibleItems.filter((n) => !seenIds.has(n.id)) : visibleItems;

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
        ].map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            style={{
              background: tab === tabItem.key ? '#e7f3ff' : '#f0f2f5',
              border: 'none', borderRadius: 20, cursor: 'pointer',
              padding: '7px 18px', fontSize: 14,
              fontWeight: tab === tabItem.key ? 700 : 500,
              color: tab === tabItem.key ? '#1877f2' : '#050505',
              transition: 'all 0.15s',
            }}
          >
            {tabItem.label}
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
            const swipe = swipeState[n.id] || { offset: 0, swiping: false };
            const deleteVisible = swipe.offset > 20;

            return (
              <div
                key={n.id}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderBottom: idx < displayed.length - 1 ? '1px solid #f0f2f5' : 'none',
                }}
              >
                {/* Delete background */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: swipe.offset,
                    background: swipe.offset >= SWIPE_THRESHOLD
                      ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                      : 'linear-gradient(90deg, #f87171, #fca5a5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: swipe.swiping ? 'none' : 'width 0.2s ease-out, background 0.2s',
                  }}
                >
                  {deleteVisible && (
                    <Trash2
                      size={22}
                      color="#fff"
                      style={{
                        opacity: Math.min(swipe.offset / SWIPE_THRESHOLD, 1),
                        transform: `scale(${Math.min(0.8 + (swipe.offset / SWIPE_THRESHOLD) * 0.4, 1.2)})`,
                        transition: swipe.swiping ? 'none' : 'all 0.2s',
                      }}
                    />
                  )}
                </div>

                {/* Notification content */}
                <div
                  onClick={() => handleClick(n)}
                  onTouchStart={(e) => handleTouchStart(e, n)}
                  onTouchMove={(e) => handleTouchMove(e, n)}
                  onTouchEnd={(e) => handleTouchEnd(e, n)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 14,
                    backgroundColor: seen ? '#fff' : (isVax && (n.urgency === 'missed' || n.urgency === 'overdue') ? '#fff1f2' : '#e7f3ff'),
                    cursor: 'pointer',
                    transition: swipe.swiping ? 'none' : 'transform 0.2s ease-out, background 0.12s',
                    transform: `translateX(${swipe.offset}px)`,
                    touchAction: 'pan-y',
                  }}
                  onMouseEnter={(e) => !swipe.swiping && (e.currentTarget.style.backgroundColor = seen ? '#f0f2f5' : '#dbeafe')}
                  onMouseLeave={(e) => !swipe.swiping && (e.currentTarget.style.backgroundColor = seen ? '#fff' : '#e7f3ff')}
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
                        ? <Syringe   size={12} color="#fff" />
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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UserNotifications;