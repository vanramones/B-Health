import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { socket } from '../../config/socket';
import { supabase } from '../../config/supabase';
import { Row, Col, Card, Badge, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, CheckCircle, Target, CheckSquare,
  FileText, Megaphone, Syringe, BarChart3, UserPlus,
  Phone, AlertTriangle, User, Edit3, Clock, ChevronRight,
  Heart, Activity, Bell, UserCog, ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const healthProgramsData = [
  { name: 'Maternal Care', value: 45, color: '#ec4899' },
  { name: 'Child Health',  value: 32, color: '#3b82f6' },
  { name: 'Senior Care',   value: 28, color: '#f97316' },
  { name: 'General',       value: 65, color: '#10b981' },
];

const healthAlerts = [
  { id: 1, type: 'warning', title: 'Vaccination Due',    message: '5 children due for measles vaccine',      icon: <Syringe size={14} /> },
  { id: 2, type: 'info',    title: 'Prenatal Visit',     message: '3 expectant mothers for monthly checkup', icon: <Heart size={14} /> },
  { id: 3, type: 'danger',  title: 'Medicine Stock Low', message: 'Paracetamol supply running low',          icon: <AlertTriangle size={14} /> },
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initials(name) {
  return (name || '').split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
}

/* ── Custom chart tooltip ── */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6b7280' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          {p.dataKey}: <span style={{ fontWeight: 600, color: '#111827' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Stat card data config ── */
const statConfigs = [
  { key: 'users',        icon: UserCog,    label: 'Registered Users', path: '/admin/registered-users', gradient: 'linear-gradient(135deg, #dbeafe, #eff6ff)', color: '#2563eb', iconBg: '#2563eb' },
  { key: 'residents',    icon: Users,      label: 'Residents',        path: '/admin/residents',        gradient: 'linear-gradient(135deg, #cffafe, #ecfeff)', color: '#0891b2', iconBg: '#0891b2' },
  { key: 'appointments', icon: Calendar,   label: 'Appointments',     path: '/admin/appointments',     gradient: 'linear-gradient(135deg, #ffedd5, #fff7ed)', color: '#ea580c', iconBg: '#ea580c' },
  { key: 'records',      icon: CheckCircle,label: 'Health Records',   path: '/admin/health-records',   gradient: 'linear-gradient(135deg, #dcfce7, #f0fdf4)', color: '#16a34a', iconBg: '#16a34a' },
  { key: 'vaccinations', icon: Target,     label: 'Vaccinations',     path: '/admin/vaccination',      gradient: 'linear-gradient(135deg, #f3e8ff, #faf5ff)', color: '#9333ea', iconBg: '#9333ea' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const today    = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const todayISO = new Date().toISOString().slice(0, 10);

  const [stats, setStats]             = useState({ residents: 0, appointments: 0, records: 0, vaccinations: 0, users: 0 });
  const [todayAppts, setTodayAppts]   = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [chartData, setChartData]     = useState([
    { day: 'Mon', Pending: 0, Confirmed: 0 },
    { day: 'Tue', Pending: 0, Confirmed: 0 },
    { day: 'Wed', Pending: 0, Confirmed: 0 },
    { day: 'Thu', Pending: 0, Confirmed: 0 },
    { day: 'Fri', Pending: 0, Confirmed: 0 },
    { day: 'Sat', Pending: 0, Confirmed: 0 },
    { day: 'Sun', Pending: 0, Confirmed: 0 },
  ]);

  const loadDashboard = useCallback(async () => {
    try {
      const [res, appt, rec, vac, usersData, allAppts] = await Promise.all([
        api.get('/residents/count'),
        api.get('/appointments/count'),
        api.get('/health-records/count'),
        api.get('/vaccinations/count'),
        api.get('/auth/users'),
        api.get('/appointments'),
      ]);

      setStats({
        residents:    res.total,
        appointments: appt.total,
        records:      rec.total,
        vaccinations: vac.total,
        users:        Array.isArray(usersData) ? usersData.length : 0,
      });

      const apptArr = Array.isArray(allAppts) ? allAppts : (allAppts.data || []);
      setTodayAppts(apptArr.filter((a) => a.date && a.date.slice(0, 10) === todayISO).slice(0, 5));

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const map  = {};
      days.forEach((d) => { map[d] = { day: d, Pending: 0, Confirmed: 0 }; });
      apptArr.forEach((a) => {
        if (!a.date) return;
        const d = days[new Date(a.date).getDay()];
        if (a.status === 'pending')   map[d].Pending   += 1;
        if (a.status === 'confirmed') map[d].Confirmed += 1;
      });
      setChartData(days.map((d) => map[d]));

      if (Array.isArray(usersData)) {
        setRecentUsers([...usersData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5));
      }
    } catch { /* backend offline */ }
  }, [todayISO]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    socket.on('dashboard-update', () => loadDashboard());
    return () => socket.off('dashboard-update');
  }, [loadDashboard]);

  useEffect(() => {
    const tables = ['appointments', 'residents', 'health_records', 'vaccinations', 'users'];
    const channels = tables.map((table) =>
      supabase.channel(`dashboard-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => loadDashboard())
        .subscribe()
    );
    return () => channels.forEach((ch) => supabase.removeChannel(ch));
  }, [loadDashboard]);

  const alertColors = {
    warning: { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
    info:    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    danger:  { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  };

  return (
    <div className="p-3 p-md-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* ── Welcome Header ── */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: '#0f172a', fontSize: 22, letterSpacing: '-0.02em' }}>Dashboard</h4>
          <p className="mb-0" style={{ fontSize: 13, color: '#94a3b8' }}>{today}</p>
        </div>
        <div className="d-flex gap-2 mt-2 mt-md-0">
          <Button size="sm" variant="light" className="d-flex align-items-center gap-1 border"
            style={{ fontSize: 12, fontWeight: 500, borderColor: '#e2e8f0' }}
            onClick={() => navigate('/admin/reports')}>
            <BarChart3 size={14} /> Reports
          </Button>
          <Button size="sm" className="d-flex align-items-center gap-1 border-0"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: 12, fontWeight: 600, boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)' }}
            onClick={() => navigate('/admin/appointments')}>
            <Calendar size={14} /> New Appointment
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <Row className="g-3 mb-4 bh-stagger">
        {statConfigs.map((sc) => {
          const Icon = sc.icon;
          const val = stats[sc.key] ?? 0;
          return (
            <Col key={sc.key} xs={6} lg>
              <Card className="border-0 rounded-4 h-100 bh-card-hover"
                onClick={() => navigate(sc.path)}
                style={{ cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'all 0.2s ease' }}>
                <Card.Body className="p-3 p-lg-4">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center justify-content-center rounded-3"
                      style={{ width: 42, height: 42, background: sc.gradient }}>
                      <Icon size={20} color={sc.color} />
                    </div>
                    <ArrowUpRight size={16} color="#cbd5e1" />
                  </div>
                  <div className="fw-bold" style={{ fontSize: 28, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.03em' }}>
                    {val.toLocaleString()}
                  </div>
                  <div className="mt-1" style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{sc.label}</div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* ── Chart + Recent Registrations ── */}
      <Row className="g-3">
        <Col xs={12} lg={8}>
          <Card className="border-0 rounded-4 h-100 bh-fade-up" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <span className="fw-bold" style={{ fontSize: 15, color: '#0f172a' }}>Appointment Overview</span>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>This week's summary</div>
                </div>
                <div className="d-flex align-items-center gap-3" style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                  <span className="d-flex align-items-center gap-1">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />Pending
                  </span>
                  <span className="d-flex align-items-center gap-1">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />Confirmed
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gConfirmed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="Pending"   stroke="#f59e0b" strokeWidth={2.5} fill="url(#gPending)"   dot={{ r: 3, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="Confirmed" stroke="#10b981" strokeWidth={2.5} fill="url(#gConfirmed)" dot={{ r: 3, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={4}>
          <Card className="border-0 rounded-4 h-100 bh-fade-up" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <span className="fw-bold" style={{ fontSize: 15, color: '#0f172a' }}>Recent Registrations</span>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Latest user sign-ups</div>
                </div>
                <Button size="sm" variant="link" className="p-0 text-decoration-none d-flex align-items-center gap-1"
                  style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }} onClick={() => navigate('/admin/registered-users')}>
                  View All <ChevronRight size={13} />
                </Button>
              </div>
              {recentUsers.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No registered users yet.</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {recentUsers.map((u) => (
                    <div key={u.id} className="d-flex align-items-center gap-3 p-2 rounded-3"
                      style={{ transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <div className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold flex-shrink-0"
                        style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', fontSize: 11 }}>
                        {initials(u.full_name)}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="fw-semibold text-truncate" style={{ fontSize: 13, color: '#0f172a' }}>{u.full_name}</div>
                        <div className="text-truncate" style={{ fontSize: 11, color: '#94a3b8' }}>@{u.username}</div>
                      </div>
                      <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>{timeAgo(u.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ── Second Row ── */}
      <Row className="g-3 mt-1">
        <Col xs={12} lg={5}>
          <Card className="border-0 rounded-4 h-100 bh-fade-up" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <span className="fw-bold" style={{ fontSize: 15, color: '#0f172a' }}>Today's Appointments</span>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{todayAppts.length} scheduled today</div>
                </div>
                <Button size="sm" variant="link" className="p-0 text-decoration-none d-flex align-items-center gap-1"
                  style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }} onClick={() => navigate('/admin/appointments')}>
                  View All <ChevronRight size={13} />
                </Button>
              </div>
              {todayAppts.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No appointments today.</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {todayAppts.map((apt) => (
                    <div key={apt.id} className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ backgroundColor: '#f8fafc' }}>
                      <div className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold flex-shrink-0"
                        style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: 11 }}>
                        {initials(apt.name || apt.patient_name || '')}
                      </div>
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="fw-semibold text-truncate" style={{ fontSize: 13, color: '#0f172a' }}>{apt.name || apt.patient_name || 'Unknown'}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{apt.service}</div>
                      </div>
                      <div className="text-end flex-shrink-0">
                        <div className="fw-semibold" style={{ fontSize: 12, color: '#0f172a' }}>{apt.time}</div>
                        <Badge pill style={{
                          backgroundColor: apt.status === 'confirmed' ? '#dcfce7' : apt.status === 'completed' ? '#dbeafe' : '#fef3c7',
                          color: apt.status === 'confirmed' ? '#166534' : apt.status === 'completed' ? '#1e40af' : '#92400e',
                          fontSize: 10, fontWeight: 600, padding: '3px 8px',
                        }}>{apt.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={6} lg={3}>
          <Card className="border-0 rounded-4 h-100 bh-fade-up" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <span className="fw-bold" style={{ fontSize: 15, color: '#0f172a' }}>Health Alerts</span>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Action items</div>
                </div>
                <Badge pill style={{ backgroundColor: '#fef2f2', color: '#dc2626', fontSize: 10, fontWeight: 600, padding: '3px 8px' }}>
                  {healthAlerts.length} new
                </Badge>
              </div>
              <div className="d-flex flex-column gap-2">
                {healthAlerts.map((alert) => {
                  const ac = alertColors[alert.type];
                  return (
                    <div key={alert.id} className="p-3 rounded-3" style={{ backgroundColor: ac.bg, border: `1px solid ${ac.border}` }}>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span style={{ color: ac.color }}>{alert.icon}</span>
                        <span className="fw-semibold" style={{ fontSize: 12, color: ac.color }}>{alert.title}</span>
                      </div>
                      <div style={{ fontSize: 11, color: ac.color, opacity: 0.8 }}>{alert.message}</div>
                    </div>
                  );
                })}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={6} lg={4}>
          <Card className="border-0 rounded-4 h-100 bh-fade-up" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <span className="fw-bold" style={{ fontSize: 15, color: '#0f172a' }}>Health Programs</span>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Active program distribution</div>
                </div>
                <Button size="sm" variant="link" className="p-0 text-decoration-none d-flex align-items-center gap-1"
                  style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }} onClick={() => navigate('/admin/services')}>
                  Details <ChevronRight size={13} />
                </Button>
              </div>
              <div className="d-flex align-items-center">
                <div style={{ width: 120, height: 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={healthProgramsData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" strokeWidth={0} paddingAngle={3}>
                        {healthProgramsData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-grow-1 ms-3">
                  {healthProgramsData.map((prog, i) => (
                    <div key={i} className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: prog.color, display: 'inline-block' }} />
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{prog.name}</span>
                      </div>
                      <span className="fw-bold" style={{ fontSize: 12, color: '#0f172a' }}>{prog.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
