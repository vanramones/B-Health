import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../context/UserAuthContext';
import { userApi } from '../../context/UserAuthContext';
import {
  Calendar, FileText, Syringe, Heart, ChevronRight,
  Phone, Activity, ShieldCheck, Megaphone, Clock,
} from 'lucide-react';

const vaccinationSchedule = [
  { id: 1, vaccine: 'Flu Vaccine', dueDate: 'Jun 15, 2026', status: 'scheduled' },
  { id: 2, vaccine: 'COVID-19 Booster', dueDate: 'Jul 01, 2026', status: 'due' },
];

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
  const [appointments, setAppointments] = useState([]);
  const [apptLoading, setApptLoading] = useState(true);

  useEffect(() => {
    userApi.get('/user/appointments')
      .then((data) => setAppointments(Array.isArray(data) ? data.slice(0, 3) : []))
      .catch(() => setAppointments([]))
      .finally(() => setApptLoading(false));
  }, []);

  const displayName = currentUser?.full_name || currentUser?.username || 'User';
  const firstName = displayName.split(' ')[0];

  const quickActions = [
    { icon: <Calendar size={22} color="#1d4ed8" />, label: 'Book', path: '/user/appointments', bg: 'linear-gradient(135deg,#dbeafe,#bfdbfe)' },
    { icon: <FileText size={22} color="#0369a1" />, label: 'Records', path: '/user/health-records', bg: 'linear-gradient(135deg,#e0f2fe,#bae6fd)' },
    { icon: <Syringe size={22} color="#7c3aed" />, label: 'Vaccines', path: '/user/vaccinations', bg: 'linear-gradient(135deg,#ede9fe,#ddd6fe)' },
    { icon: <Megaphone size={22} color="#0891b2" />, label: 'News', path: '/user/announcements', bg: 'linear-gradient(135deg,#cffafe,#a5f3fc)' },
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
              GOOD MORNING 👋
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {firstName}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(191,219,254,0.85)', marginTop: 4 }}>
              Stay healthy, stay safe today.
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 10, padding: '6px 10px', textAlign: 'center', flexShrink: 0,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>May</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1 }}>28</div>
          </div>
        </div>

      </div>

      {/* ── Quick Actions ── */}
      <div style={S.actionsGrid}>
        {quickActions.map((a, i) => (
          <div key={i} style={S.actionBtn} onClick={() => navigate(a.path)}>
            <div style={S.actionIcon(a.bg)}>{a.icon}</div>
            <span style={S.actionLabel}>{a.label}</span>
          </div>
        ))}
      </div>

      {/* ── Upcoming Appointments ── */}
      <div style={S.card}>
        <div style={S.sectionHead}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={15} color="#1d4ed8" />
            </div>
            <span style={S.sectionTitle}>Upcoming Appointments</span>
          </div>
          <span style={S.seeAll} onClick={() => navigate('/user/appointments')}>See all →</span>
        </div>

        {apptLoading ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 13 }}>Loading...</div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 13 }}>No upcoming appointments</div>
        ) : null}
        {appointments.map((apt) => {
          const confirmed = apt.status === 'confirmed';
          return (
            <div key={apt.id} style={{ ...S.aptRow, borderLeftColor: confirmed ? '#1d4ed8' : '#f59e0b' }}>
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
            <span style={S.sectionTitle}>Vaccination Reminders</span>
          </div>
          <span style={S.seeAll} onClick={() => navigate('/user/vaccinations')}>See all →</span>
        </div>

        {vaccinationSchedule.map((vax) => {
          const due = vax.status === 'due';
          return (
            <div key={vax.id} style={S.vaxRow(due)}>
              <div style={S.vaxIcon(due)}>
                <Syringe size={20} color={due ? '#b45309' : '#7c3aed'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {vax.vaccine}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Due: {vax.dueDate}</div>
              </div>
              <span style={S.vaxBadge(due)}>{due ? '⚠ Due' : 'Scheduled'}</span>
            </div>
          );
        })}
      </div>

      {/* ── Emergency Hotline ── */}
      <div
        onClick={() => window.location.href = 'tel:+6328123456'}
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
            Emergency Hotline
          </div>
          <div style={{ fontSize: 12, color: 'rgba(254,202,202,0.9)', marginTop: 2 }}>
            Tap to call · (02) 8123-4567
          </div>
        </div>
        <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
      </div>

    </div>
  );
};

export default UserDashboard;
