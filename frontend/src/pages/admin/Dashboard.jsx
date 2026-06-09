import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { socket } from '../../config/socket';
import { Row, Col, Card, Badge, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, CheckCircle, Target, CheckSquare,
  FileText, Megaphone, Syringe, BarChart3, UserPlus,
  Phone, AlertTriangle, User, Edit3, Clock, ChevronRight,
  Heart, Activity, Bell, UserCog,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import ActivityItem from '../../components/ActivityItem';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const healthProgramsData = [
  { name: 'Maternal Care', value: 45, color: '#ec4899' },
  { name: 'Child Health', value: 32, color: '#3b82f6' },
  { name: 'Senior Care', value: 28, color: '#f97316' },
  { name: 'General',     value: 65, color: '#22c55e' },
];

const healthAlerts = [
  { id: 1, type: 'warning', title: 'Vaccination Due',   message: '5 children due for measles vaccine',      icon: <Syringe size={14} /> },
  { id: 2, type: 'info',    title: 'Prenatal Visit',    message: '3 expectant mothers for monthly checkup', icon: <Heart size={14} /> },
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

const Dashboard = () => {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const todayISO = new Date().toISOString().slice(0, 10);

  const [stats, setStats]           = useState({ residents: 0, appointments: 0, records: 0, vaccinations: 0, users: 0 });
  const [todayAppts, setTodayAppts] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [chartData, setChartData]   = useState([
    { day: 'Mon', Pending: 0, Confirmed: 0 },
    { day: 'Tue', Pending: 0, Confirmed: 0 },
    { day: 'Wed', Pending: 0, Confirmed: 0 },
    { day: 'Thu', Pending: 0, Confirmed: 0 },
    { day: 'Fri', Pending: 0, Confirmed: 0 },
    { day: 'Sat', Pending: 0, Confirmed: 0 },
    { day: 'Sun', Pending: 0, Confirmed: 0 },
  ]);

  const loadDashboard = async () => {
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

      // Today's appointments
      const apptArr = Array.isArray(allAppts) ? allAppts : (allAppts.data || []);
      setTodayAppts(apptArr.filter((a) => a.date && a.date.slice(0, 10) === todayISO).slice(0, 5));

      // Build chart: appointments per weekday
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const map = {};
      days.forEach((d) => { map[d] = { day: d, Pending: 0, Confirmed: 0 }; });
      apptArr.forEach((a) => {
        if (!a.date) return;
        const d = days[new Date(a.date).getDay()];
        if (a.status === 'pending')   map[d].Pending   += 1;
        if (a.status === 'confirmed') map[d].Confirmed += 1;
      });
      setChartData(days.map((d) => map[d]));

      // Recent registered users (latest 5)
      if (Array.isArray(usersData)) {
        setRecentUsers([...usersData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5));
      }
    } catch { /* backend offline */ }
  };

  useEffect(() => {
    loadDashboard();
  }, [todayISO]);

  useEffect(() => {
    socket.on('dashboard-update', (data) => {
      console.log('[Socket] Dashboard update received:', data);
      loadDashboard();
    });

    return () => {
      socket.off('dashboard-update');
    };
  }, [todayISO]);

  const alertColors = {
    warning: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
    info: { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
    danger: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  };

  return (
    <div className="p-3 p-md-4" style={{ backgroundColor: '#f8fafc' }}>
      {/* Welcome Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: '#111827' }}>Welcome back! 👋</h4>
          <p className="mb-0" style={{ fontSize: 13, color: '#6b7280' }}>{today}</p>
        </div>
        <div className="d-flex gap-2 mt-2 mt-md-0">
          <Button
            size="sm"
            variant="light"
            className="d-flex align-items-center gap-1 border"
            style={{ fontSize: 12, fontWeight: 500 }}
            onClick={() => navigate('/admin/reports')}
          >
            <BarChart3 size={14} /> View Reports
          </Button>
          <Button
            size="sm"
            className="d-flex align-items-center gap-1 border-0"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0f766e)', fontSize: 12, fontWeight: 500 }}
            onClick={() => navigate('/admin/appointments')}
          >
            <Calendar size={14} /> New Appointment
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <Row className="g-2 g-md-3 mb-4 bh-stagger">
        <Col xs={6} lg>
          <div className="bh-card-hover h-100" onClick={() => navigate('/admin/registered-users')} style={{ cursor: 'pointer' }}>
            <StatCard icon={<UserCog size={20} color="#1d4ed8" />} iconBg="bg-blue-50"
              value={String(stats.users)} title="Registered Users" trend="system accounts" trendColor="text-blue-500" />
          </div>
        </Col>
        <Col xs={6} lg>
          <div className="bh-card-hover h-100" onClick={() => navigate('/admin/residents')} style={{ cursor: 'pointer' }}>
            <StatCard icon={<Users size={20} color="#0891b2" />} iconBg="bg-cyan-50"
              value={String(stats.residents)} title="Residents" trend="health records" trendColor="text-cyan-500" />
          </div>
        </Col>
        <Col xs={6} lg>
          <div className="bh-card-hover h-100" onClick={() => navigate('/admin/appointments')} style={{ cursor: 'pointer' }}>
            <StatCard icon={<Calendar size={20} color="#f97316" />} iconBg="bg-orange-50"
              value={String(stats.appointments)} title="Appointments" trend="all time" trendColor="text-orange-500" />
          </div>
        </Col>
        <Col xs={6} lg>
          <div className="bh-card-hover h-100" onClick={() => navigate('/admin/health-records')} style={{ cursor: 'pointer' }}>
            <StatCard icon={<CheckCircle size={20} color="#22c55e" />} iconBg="bg-green-50"
              value={String(stats.records)} title="Health Records" trend="all time" trendColor="text-green-500" />
          </div>
        </Col>
        <Col xs={6} lg>
          <div className="bh-card-hover h-100" onClick={() => navigate('/admin/vaccinations')} style={{ cursor: 'pointer' }}>
            <StatCard icon={<Target size={20} color="#a855f7" />} iconBg="bg-purple-50"
              value={String(stats.vaccinations)} title="Vaccinations" trend="all time" trendColor="text-purple-500" />
          </div>
        </Col>
      </Row>

      {/* Chart + Activity */}
      <Row className="g-2 g-md-3">
        {/* Appointment Overview */}
        <Col xs={12} lg={8}>
          <Card className="border rounded-4 h-100 bh-fade-up" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', animationDelay: '0.2s' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="fw-bold" style={{ fontSize: 14, color: '#111827' }}>Appointment Overview</span>
                <div className="d-flex align-items-center gap-3" style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>
                  <span className="d-flex align-items-center gap-1">
                    <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, backgroundColor: '#f97316' }}></span>
                    Pending
                  </span>
                  <span className="d-flex align-items-center gap-1">
                    <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, backgroundColor: '#22c55e' }}></span>
                    Confirmed
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <Area type="monotone" dataKey="Pending"   stroke="#f97316" strokeWidth={2} fill="url(#gApproved)" dot={false} />
                  <Area type="monotone" dataKey="Confirmed" stroke="#22c55e" strokeWidth={2} fill="url(#gCompleted)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        {/* Recent Registrations */}
        <Col xs={12} lg={4}>
          <Card className="border rounded-4 h-100 bh-fade-up" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', animationDelay: '0.25s' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="fw-bold" style={{ fontSize: 14, color: '#111827' }}>Recent Registrations</span>
                <Button size="sm" variant="link" className="p-0 text-decoration-none d-flex align-items-center gap-1"
                  style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 500 }}
                  onClick={() => navigate('/admin/registered-users')}>
                  View All <ChevronRight size={14} />
                </Button>
              </div>
              {recentUsers.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No registered users yet.</div>
              ) : recentUsers.map((u) => (
                <ActivityItem
                  key={u.id}
                  icon={<User size={16} />}
                  title={u.full_name}
                  subtitle={`@${u.username} · ${u.purok || '—'}`}
                  time={timeAgo(u.created_at)}
                  iconBg="bg-blue-100 text-blue-600"
                />
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Second Row: Upcoming Appointments, Health Alerts, Health Programs */}
      <Row className="g-2 g-md-3 mt-1">
        {/* Today's Appointments */}
        <Col xs={12} lg={5}>
          <Card className="border rounded-4 h-100 bh-fade-up" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', animationDelay: '0.3s' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="fw-bold" style={{ fontSize: 14, color: '#111827' }}>
                  <Calendar size={16} className="me-2" style={{ color: '#0f766e' }} />
                  Today's Appointments
                </span>
                <Button size="sm" variant="link" className="p-0 text-decoration-none d-flex align-items-center gap-1"
                  style={{ fontSize: 12, color: '#0f766e', fontWeight: 500 }}
                  onClick={() => navigate('/admin/appointments')}>
                  View All <ChevronRight size={14} />
                </Button>
              </div>
              {todayAppts.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No appointments today.</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {todayAppts.map((apt) => (
                    <div key={apt.id} className="d-flex align-items-center gap-3 p-2 rounded-3" style={{ backgroundColor: '#f9fafb' }}>
                      <div className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold flex-shrink-0"
                        style={{ width: 36, height: 36, backgroundColor: '#14b8a6', fontSize: 11 }}>
                        {initials(apt.name || apt.patient_name || '')}
                      </div>
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="fw-semibold text-truncate" style={{ fontSize: 13, color: '#111827' }}>
                          {apt.name || apt.patient_name || 'Unknown'}
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{apt.service}</div>
                      </div>
                      <div className="text-end flex-shrink-0">
                        <div className="fw-semibold" style={{ fontSize: 12, color: '#111827' }}>{apt.time}</div>
                        <Badge style={{
                          backgroundColor: apt.status === 'confirmed' ? '#dbeafe' : '#fef3c7',
                          color: apt.status === 'confirmed' ? '#1e40af' : '#92400e',
                          fontSize: 10, fontWeight: 600,
                        }}>
                          {apt.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Health Alerts */}
        <Col xs={12} md={6} lg={3}>
          <Card className="border rounded-4 h-100 bh-fade-up" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', animationDelay: '0.35s' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="fw-bold" style={{ fontSize: 14, color: '#111827' }}>
                  <Bell size={16} className="me-2" style={{ color: '#f59e0b' }} />
                  Health Alerts
                </span>
                <Badge pill style={{ backgroundColor: '#fee2e2', color: '#991b1b', fontSize: 10 }}>
                  {healthAlerts.length} new
                </Badge>
              </div>
              <div className="d-flex flex-column gap-2">
                {healthAlerts.map((alert) => {
                  const ac = alertColors[alert.type];
                  return (
                    <div
                      key={alert.id}
                      className="p-2 rounded-3"
                      style={{ backgroundColor: ac.bg, border: `1px solid ${ac.border}` }}
                    >
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span style={{ color: ac.color }}>{alert.icon}</span>
                        <span className="fw-semibold" style={{ fontSize: 12, color: ac.color }}>
                          {alert.title}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: ac.color, opacity: 0.85 }}>
                        {alert.message}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Health Programs */}
        <Col xs={12} md={6} lg={4}>
          <Card className="border rounded-4 h-100 bh-fade-up" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', animationDelay: '0.4s' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="fw-bold" style={{ fontSize: 14, color: '#111827' }}>
                  <Activity size={16} className="me-2" style={{ color: '#8b5cf6' }} />
                  Health Programs
                </span>
                <Button
                  size="sm"
                  variant="link"
                  className="p-0 text-decoration-none d-flex align-items-center gap-1"
                  style={{ fontSize: 12, color: '#0f766e', fontWeight: 500 }}
                  onClick={() => navigate('/admin/services')}
                >
                  Details <ChevronRight size={14} />
                </Button>
              </div>
              <div className="d-flex align-items-center">
                <div style={{ width: 120, height: 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={healthProgramsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {healthProgramsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-grow-1 ms-2">
                  {healthProgramsData.map((prog, i) => (
                    <div key={i} className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className="rounded-circle d-inline-block"
                          style={{ width: 8, height: 8, backgroundColor: prog.color }}
                        />
                        <span style={{ fontSize: 11, color: '#374151' }}>{prog.name}</span>
                      </div>
                      <span className="fw-bold" style={{ fontSize: 12, color: '#111827' }}>{prog.value}</span>
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
