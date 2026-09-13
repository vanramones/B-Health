import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../context/UserAuthContext';
import { userApi } from '../../context/UserAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Calendar, FileText, Syringe, Heart, ChevronRight,
  Phone, Activity, ShieldCheck, Megaphone, Clock, User,
} from 'lucide-react';


const S = {
  /* ── Welcome card ── */
  welcome: {
    borderRadius: 20,
    background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 55%, #2563eb 100%)',
    boxShadow: '0 8px 32px rgba(29,78,216,0.28)',
    padding: '20px',
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  welcomeOrb1: {
    position: 'absolute', top: -40, right: -40,
    width: 140, height: 140, borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
  },
  welcomeOrb2: {
    position: 'absolute', bottom: -20, left: -20,
    width: 100, height: 100, borderRadius: '50%',
    background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
  },
  avatarWrap: {
    width: 52, height: 52, borderRadius: 16,
    background: 'rgba(255,255,255,0.15)',
    border: '1.5px solid rgba(255,255,255,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  welcomeBottom: {
    marginTop: 16,
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex', gap: 0,
  },
  statPill: {
    flex: 1, padding: '12px 8px', textAlign: 'center',
    borderRight: '1px solid rgba(255,255,255,0.1)',
    cursor: 'default',
  },
  statNum: { fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1 },
  statLabel: { fontSize: 10, color: 'rgba(147,197,253,0.85)', marginTop: 3, fontWeight: 500, letterSpacing: '0.03em' },

  /* ── Quick actions ── */
  actionsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10, marginBottom: 16,
  },
  actionBtn: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: '14px 8px', borderRadius: 16,
    cursor: 'pointer', background: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    border: '1.5px solid #f1f5f9',
    transition: 'transform 0.15s, box-shadow 0.15s',
    WebkitTapHighlightColor: 'transparent',
  },
  actionIcon: (bg) => ({
    width: 46, height: 46, borderRadius: 14,
    background: bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }),
  actionLabel: { fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '0.01em' },

  /* ── Section header ── */
  sectionHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' },
  seeAll: { fontSize: 12, fontWeight: 700, color: '#2563eb', cursor: 'pointer', letterSpacing: '0.01em' },

  /* ── Card shell ── */
  card: {
    background: '#fff', borderRadius: 18,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    padding: '16px', marginBottom: 14,
    border: '1px solid #f1f5f9',
  },

  /* ── Appointment row ── */
  aptRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px', borderRadius: 14,
    background: '#f8fafc', marginBottom: 8,
    borderLeft: '3.5px solid transparent',
  },
  aptIcon: (confirmed) => ({
    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
    background: confirmed ? '#dbeafe' : '#fef3c7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }),
  aptBadge: (confirmed) => ({
    padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
    background: confirmed ? '#dbeafe' : '#fef3c7',
    color: confirmed ? '#1e40af' : '#92400e',
    letterSpacing: '0.02em', textTransform: 'capitalize', whiteSpace: 'nowrap',
  }),

  /* ── Vaccine row ── */
  vaxRow: (due) => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px', borderRadius: 14,
    background: due ? '#fffbeb' : '#f8fafc',
    marginBottom: 8,
    border: due ? '1px solid #fde68a' : '1px solid transparent',
  }),
  vaxIcon: (due) => ({
    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
    background: due ? '#fde68a' : '#ede9fe',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }),
  vaxBadge: (due) => ({
    padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
    background: due ? '#fef3c7' : '#ede9fe',
    color: due ? '#b45309' : '#6d28d9',
    letterSpacing: '0.02em', textTransform: 'capitalize', whiteSpace: 'nowrap',
  }),
};

const UserDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useUserAuth();
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState([]);
  const [apptLoading, setApptLoading] = useState(true);
  const [vaccines, setVaccines] = useState([]);
  const [vaxLoading, setVaxLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  useEffect(() => {
    // Fetch announcements (public - available for all users)
    userApi.get('/user/announcements')
      .then((data) => setAnnouncements(Array.isArray(data) ? data.slice(0, 3) : []))
      .catch(() => setAnnouncements([]))
      .finally(() => setAnnouncementsLoading(false));

    // Only fetch user-specific data if logged in
    if (currentUser) {
      userApi.get('/user/appointments')
        .then((data) => setAppointments(Array.isArray(data) ? data.slice(0, 3) : []))
        .catch(() => setAppointments([]))
        .finally(() => setApptLoading(false));

      userApi.get('/user/vaccinations')
        .then((data) => {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const upcoming = (Array.isArray(data) ? data : [])
            .filter((v) => v.next_due && v.status !== 'completed')
            .sort((a, b) => new Date(a.next_due) - new Date(b.next_due))
            .slice(0, 3)
            .map((v) => {
              const due = new Date(String(v.next_due).slice(0, 10) + 'T00:00:00');
              return { ...v, isDue: due <= today || v.status === 'missed' };
            });
          setVaccines(upcoming);
        })
        .catch(() => setVaccines([]))
        .finally(() => setVaxLoading(false));
    } else {
      // Guest user - no appointments or vaccinations
      setApptLoading(false);
      setVaxLoading(false);
    }
  }, [currentUser]);

  const displayName = currentUser?.full_name || currentUser?.username || 'Guest';
  const firstName = displayName.split(' ')[0];

  const now = new Date();
  const hour = now.getHours();
  const greeting = (hour < 12 ? t('goodMorning') : hour < 18 ? t('goodAfternoon') : t('goodEvening')).toUpperCase();
  const greetEmoji = hour < 12 ? '\u2600\ufe0f' : hour < 18 ? '\ud83c\udf24\ufe0f' : '\ud83c\udf19';
  const monthShort = now.toLocaleDateString('en-US', { month: 'short' });
  const dayNum = now.getDate();

  const quickActions = [
    { icon: <Calendar size={22} color="#1d4ed8" />, labelKey: 'book', path: '/user/appointments', bg: 'linear-gradient(135deg,#dbeafe,#bfdbfe)' },
    { icon: <FileText size={22} color="#0369a1" />, labelKey: 'records', path: '/user/health-records', bg: 'linear-gradient(135deg,#e0f2fe,#bae6fd)' },
    { icon: <Syringe size={22} color="#7c3aed" />, labelKey: 'vaccinations', path: '/user/vaccinations', bg: 'linear-gradient(135deg,#ede9fe,#ddd6fe)' },
    { icon: <Megaphone size={22} color="#0891b2" />, labelKey: 'news', path: '/user/announcements', bg: 'linear-gradient(135deg,#cffafe,#a5f3fc)' },
  ];

  return (
    <div>

      {/* ── Welcome Card ── */}
      <div style={S.welcome}>
        <div style={S.welcomeOrb1} />
        <div style={S.welcomeOrb2} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          <div style={S.avatarWrap}>
            <Heart size={26} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'rgba(147,197,253,0.9)', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 3 }}>
              {greeting} {greetEmoji}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {firstName}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(191,219,254,0.85)', marginTop: 4 }}>
              {t('stayHealthyStaySafe')}
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 10, padding: '6px 10px', textAlign: 'center', flexShrink: 0,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{monthShort}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{dayNum}</div>
          </div>
        </div>

      </div>

      {/* ── Guest Sign In Banner ── */}
      {!currentUser && (
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
          border: '2px solid #fbbf24',
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 4px 12px rgba(251,191,36,0.2)',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: 12,
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <User size={22} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e', marginBottom: 2 }}>
              {t('signInToUnlock')}
            </div>
            <div style={{ fontSize: 12, color: '#b45309' }}>
              {t('accessHealthRecords')}
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
              border: 'none',
              borderRadius: 10,
              padding: '10px 20px',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(29,78,216,0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            {t('signIn')}
          </button>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div style={S.actionsGrid}>
        {quickActions.map((a, i) => (
          <div key={i} style={S.actionBtn} onClick={() => navigate(a.path)}>
            <div style={S.actionIcon(a.bg)}>{a.icon}</div>
            <span style={S.actionLabel}>{t(a.labelKey)}</span>
          </div>
        ))}
      </div>

      {/* ── Latest Announcements & Events ── */}
      <div style={S.card}>
        <div style={S.sectionHead}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#cffafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Megaphone size={15} color="#0891b2" />
            </div>
            <span style={S.sectionTitle}>{t('latestAnnouncementsEvents')}</span>
          </div>
          <span style={S.seeAll} onClick={() => navigate('/user/announcements')}>{t('seeAllArrow')}</span>
        </div>

        {announcementsLoading ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 13 }}>{t('loadingText')}</div>
        ) : announcements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 13 }}>{t('noAnnouncementsYet')}</div>
        ) : null}
        {announcements.map((announcement) => {
          const date = new Date(announcement.created_at);
          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const isNew = (Date.now() - date.getTime()) < 7 * 24 * 60 * 60 * 1000; // New if less than 7 days old
          const imageUrl = announcement.image_url || announcement.image || '';
          const hasImage = imageUrl && imageUrl.trim() !== '';
          
          return (
            <div 
              key={announcement.id} 
              style={{ 
                background: '#fff',
                borderRadius: 16,
                marginBottom: 14,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
              onClick={() => navigate('/user/announcements')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              {/* Announcement Image */}
              <div style={{
                width: '100%',
                height: 160,
                position: 'relative',
                overflow: 'hidden',
                background: hasImage ? 'transparent' : 'linear-gradient(135deg, #0891b2, #06b6d4)',
              }}>
                {hasImage ? (
                  <img
                    src={imageUrl}
                    alt={announcement.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.parentElement.style.background = 'linear-gradient(135deg, #0891b2, #06b6d4)';
                    }}
                  />
                ) : null}
                {/* Category Badge on Image */}
                <div style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(4px)',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <Megaphone size={12} />
                  {announcement.category || 'Announcement'}
                </div>
                {isNew && (
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    background: '#ef4444',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 9,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    NEW
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Megaphone size={20} color="#fff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: '0 0 6px 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.3,
                    }}>
                      {announcement.title}
                    </h4>
                    <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} />
                      {dateStr}
                    </div>
                  </div>
                </div>
                <p style={{ 
                  fontSize: 13, 
                  color: '#64748b', 
                  margin: 0,
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {announcement.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Upcoming Appointments ── */}
      <div style={S.card}>
        <div style={S.sectionHead}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={15} color="#1d4ed8" />
            </div>
            <span style={S.sectionTitle}>{t('upcomingAppointments')}</span>
          </div>
          <span style={S.seeAll} onClick={() => navigate('/user/appointments')}>{t('seeAll')} →</span>
        </div>

        {apptLoading ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 13 }}>Loading...</div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 13 }}>{t('noUpcomingAppointments')}</div>
        ) : null}
        {appointments.map((apt) => {
          const confirmed = apt.status === 'confirmed';
          return (
            <div key={apt.id} style={{ ...S.aptRow, borderLeftColor: confirmed ? '#1d4ed8' : '#f59e0b', cursor: 'pointer' }} onClick={() => navigate('/user/appointment-history')}>
              <div style={S.aptIcon(confirmed)}>
                <Calendar size={20} color={confirmed ? '#1d4ed8' : '#b45309'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {apt.service}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={10} color="#94a3b8" />
                  {apt.date} · {apt.time}
                </div>
              </div>
              <span style={S.aptBadge(confirmed)}>{apt.status || 'pending'}</span>
            </div>
          );
        })}
      </div>

      {/* ── Vaccination Reminders ── */}
      <div style={S.card}>
        <div style={S.sectionHead}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={15} color="#7c3aed" />
            </div>
            <span style={S.sectionTitle}>{t('vaccinationReminders')}</span>
          </div>
          <span style={S.seeAll} onClick={() => navigate('/user/vaccinations')}>{t('seeAll')} →</span>
        </div>

        {vaxLoading ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 13 }}>Loading...</div>
        ) : vaccines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 13 }}>{t('noVaccinationReminders')}</div>
        ) : null}
        {vaccines.map((vax) => {
          const due = vax.isDue;
          const dueStr = new Date(String(vax.next_due).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return (
            <div key={vax.id} style={{ ...S.vaxRow(due), cursor: 'pointer' }} onClick={() => navigate('/user/vaccinations')}>
              <div style={S.vaxIcon(due)}>
                <Syringe size={20} color={due ? '#b45309' : '#7c3aed'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {vax.vaccine}{vax.dose ? ` · ${vax.dose}` : ''}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Due: {dueStr}</div>
              </div>
              <span style={S.vaxBadge(due)}>{due ? '⚠ Due' : 'Scheduled'}</span>
            </div>
          );
        })}
      </div>

      {/* ── Emergency Hotline ── */}
      <div
        onClick={() => window.location.href = 'tel:0281234567'}
        style={{
          borderRadius: 18, cursor: 'pointer',
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          boxShadow: '0 6px 20px rgba(220,38,38,0.3)',
          padding: '16px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
          marginBottom: 8,
          position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', top: -20, right: -20,
          width: 90, height: 90, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)', pointerEvents: 'none',
        }} />
        <div style={{
          width: 46, height: 46, borderRadius: 14,
          background: 'rgba(255,255,255,0.2)',
          border: '1.5px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Phone size={22} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
            {t('emergencyHotline')}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(254,202,202,0.9)', marginTop: 2 }}>
            Tap to call · (02) 8123-4567
          </div>
        </div>
        <div
          onClick={(e) => { e.stopPropagation(); navigate('/user/emergency-contact'); }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 8 }}
          title="View all emergency contacts"
        >
          <ChevronRight size={20} color="rgba(255,255,255,0.85)" />
        </div>
      </div>

    </div>
  );
};

export default UserDashboard;
