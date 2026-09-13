import React, { useMemo, useState, useRef } from 'react';
import { Card, Row, Col, Form, Button, Table, Badge, Dropdown, ButtonGroup, Modal, OverlayTrigger, Tooltip as BsTooltip } from 'react-bootstrap';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Download, FileText, TrendingUp, Users, Activity, Syringe, Printer,
  FileSpreadsheet, File, Calendar, ChevronLeft, ChevronRight, Clock,
  CheckCircle2, ArrowUpRight, ArrowDownRight, BarChart3, PieChart as PieChartIcon,
  Filter, RefreshCw, Eye,
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

/* ── Static data ── */
const monthlyData = [
  { month: 'Jan', appointments: 42, completed: 38, vaccinations: 18 },
  { month: 'Feb', appointments: 55, completed: 49, vaccinations: 22 },
  { month: 'Mar', appointments: 61, completed: 54, vaccinations: 26 },
  { month: 'Apr', appointments: 48, completed: 45, vaccinations: 19 },
  { month: 'May', appointments: 72, completed: 65, vaccinations: 31 },
  { month: 'Jun', appointments: 68, completed: 60, vaccinations: 28 },
  { month: 'Jul', appointments: 80, completed: 72, vaccinations: 35 },
  { month: 'Aug', appointments: 75, completed: 70, vaccinations: 33 },
  { month: 'Sep', appointments: 65, completed: 58, vaccinations: 27 },
];

const weeklyData = [
  { week: 'Week 1', appointments: 18, completed: 16, vaccinations: 7 },
  { week: 'Week 2', appointments: 22, completed: 19, vaccinations: 9 },
  { week: 'Week 3', appointments: 15, completed: 14, vaccinations: 5 },
  { week: 'Week 4', appointments: 20, completed: 18, vaccinations: 8 },
];

const serviceBreakdown = [
  { name: 'Consultation', value: 145, color: '#16a34a', pct: 38 },
  { name: 'Vaccination',  value: 98,  color: '#3b82f6', pct: 26 },
  { name: 'Prenatal',     value: 64,  color: '#f59e0b', pct: 17 },
  { name: 'Dental',       value: 42,  color: '#ec4899', pct: 11 },
  { name: 'Other',        value: 28,  color: '#a855f7', pct: 8  },
];

const recentReports = [
  { id: 1, name: 'Monthly Summary - August 2026',  type: 'Monthly',   date: '2026-08-31', size: '124 KB', status: 'Ready' },
  { id: 2, name: 'Vaccination Report - Q3',        type: 'Quarterly', date: '2026-07-15', size: '210 KB', status: 'Ready' },
  { id: 3, name: 'Resident Demographics',          type: 'Annual',    date: '2026-06-01', size: '312 KB', status: 'Ready' },
  { id: 4, name: 'Appointment Trends - July',      type: 'Monthly',   date: '2026-07-31', size: '98 KB',  status: 'Ready' },
];

/* ── Helpers ── */
const downloadCSV = (filename, headers, rows) => {
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const fmtNum = (n) => n.toLocaleString();

/* ── Custom tooltip for charts ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
      padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6b7280', marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ textTransform: 'capitalize' }}>{p.dataKey}:</span>
          <span style={{ fontWeight: 600, color: '#111827' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Main component ── */
const Reports = () => {
  const [dateMode, setDateMode] = useState('monthly');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 2); return d;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [showPreview, setShowPreview] = useState(false);
  const [activeChart, setActiveChart] = useState('bar');
  const printRef = useRef(null);

  const chartData = dateMode === 'weekly' ? weeklyData : monthlyData;
  const xKey = dateMode === 'weekly' ? 'week' : 'month';

  const totals = useMemo(() => {
    const sum = (k) => chartData.reduce((s, x) => s + x[k], 0);
    const ta = sum('appointments');
    const tc = sum('completed');
    const tv = sum('vaccinations');
    const rate = ta ? Math.round((tc / ta) * 100) : 0;
    return { totalAppointments: ta, totalCompleted: tc, totalVaccinations: tv, completionRate: rate };
  }, [chartData]);

  const prevTotals = { totalAppointments: 460, totalCompleted: 410, totalVaccinations: 190 };

  const pctChange = (curr, prev) => {
    if (!prev) return 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const handleExportSummary = () => {
    downloadCSV('report-summary.csv',
      [dateMode === 'weekly' ? 'Week' : 'Month', 'Appointments', 'Completed', 'Vaccinations'],
      chartData.map(m => [m[xKey], m.appointments, m.completed, m.vaccinations]),
    );
  };

  const handleExportServices = () => {
    downloadCSV('service-breakdown.csv', ['Service', 'Count', 'Percentage'],
      serviceBreakdown.map(s => [s.name, s.value, `${s.pct}%`]),
    );
  };

  const handleExportJSON = () => {
    const data = {
      generatedAt: new Date().toISOString(),
      mode: dateMode,
      dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
      summary: totals, chartData, serviceBreakdown,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `health-report-${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  const handleGenerate = () => {
    setShowPreview(true);
  };

  /* ── Stat cards config ── */
  const summaryCards = [
    {
      label: 'Total Appointments', value: totals.totalAppointments,
      icon: <Activity size={20} />, bg: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
      color: '#1d4ed8', change: pctChange(totals.totalAppointments, prevTotals.totalAppointments),
    },
    {
      label: 'Completed', value: totals.totalCompleted,
      icon: <CheckCircle2 size={20} />, bg: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
      color: '#15803d', change: pctChange(totals.totalCompleted, prevTotals.totalCompleted),
    },
    {
      label: 'Vaccinations', value: totals.totalVaccinations,
      icon: <Syringe size={20} />, bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      color: '#b45309', change: pctChange(totals.totalVaccinations, prevTotals.totalVaccinations),
    },
    {
      label: 'Completion Rate', value: `${totals.completionRate}%`,
      icon: <TrendingUp size={20} />, bg: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
      color: '#be185d', change: 2, suffix: true,
    },
  ];

  const fmtDate = (d, mode) => {
    if (!d) return '...';
    return mode === 'monthly'
      ? d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const dateLabel = `${fmtDate(startDate, dateMode)} - ${fmtDate(endDate, dateMode)}`;

  return (
    <div className="p-4" style={{ backgroundColor: '#f8fafc' }} ref={printRef}>
      {/* ── Header Bar ── */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h5 className="fw-bold mb-1" style={{ color: '#111827', letterSpacing: '-0.01em' }}>
            Analytics & Reports
          </h5>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
            Health center performance overview &bull; {dateLabel}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Button size="sm" variant="light" onClick={handlePrint}
            className="d-flex align-items-center gap-1 border"
            style={{ fontSize: 12, fontWeight: 500 }}>
            <Printer size={14} /> Print
          </Button>
          <Dropdown>
            <Dropdown.Toggle size="sm" className="d-flex align-items-center gap-1 border-0"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', fontSize: 12, fontWeight: 500 }}>
              <Download size={14} /> Export
            </Dropdown.Toggle>
            <Dropdown.Menu align="end" style={{ fontSize: 12, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
              <Dropdown.Item onClick={handleExportSummary} className="d-flex align-items-center gap-2 py-2">
                <FileSpreadsheet size={14} color="#16a34a" /> Export as CSV
              </Dropdown.Item>
              <Dropdown.Item onClick={handleExportJSON} className="d-flex align-items-center gap-2 py-2">
                <File size={14} color="#3b82f6" /> Export as JSON
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={handleExportServices} className="d-flex align-items-center gap-2 py-2">
                <FileText size={14} color="#f59e0b" /> Services Breakdown
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>

      {/* ── Date Range Picker Card ── */}
      <Card className="border-0 rounded-4 mb-4 bh-report-date-card" style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f766e 100%)',
        boxShadow: '0 4px 20px rgba(6, 78, 59, 0.25)',
      }}>
        <Card.Body className="p-4">
          <Row className="align-items-center g-3">
            <Col xs={12} md="auto">
              <div className="d-flex align-items-center gap-2 mb-2 mb-md-0">
                <div className="d-flex align-items-center justify-content-center rounded-3"
                  style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}>
                  <Calendar size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Report Period</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>Select date range to generate report</div>
                </div>
              </div>
            </Col>

            <Col xs={12} md="auto">
              <div className="d-flex align-items-center gap-1 p-1 rounded-3"
                style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)' }}>
                <button
                  onClick={() => setDateMode('weekly')}
                  className="border-0 rounded-2 px-3 py-1"
                  style={{
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    background: dateMode === 'weekly' ? '#fff' : 'transparent',
                    color: dateMode === 'weekly' ? '#047857' : 'rgba(255,255,255,0.8)',
                    boxShadow: dateMode === 'weekly' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                  }}>
                  Weekly
                </button>
                <button
                  onClick={() => setDateMode('monthly')}
                  className="border-0 rounded-2 px-3 py-1"
                  style={{
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    background: dateMode === 'monthly' ? '#fff' : 'transparent',
                    color: dateMode === 'monthly' ? '#047857' : 'rgba(255,255,255,0.8)',
                    boxShadow: dateMode === 'monthly' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                  }}>
                  Monthly
                </button>
              </div>
            </Col>

            <Col xs={12} md="auto" className="flex-grow-1">
              <div className="bh-dp-wrapper">
                <DatePicker
                  selected={startDate}
                  onChange={(dates) => {
                    const [start, end] = dates;
                    setStartDate(start);
                    setEndDate(end);
                  }}
                  startDate={startDate}
                  endDate={endDate}
                  selectsRange
                  dateFormat={dateMode === 'weekly' ? 'MMM dd, yyyy' : 'MMM yyyy'}
                  showMonthYearPicker={dateMode === 'monthly'}
                  showWeekNumbers={dateMode === 'weekly'}
                  className="bh-dp-input bh-dp-range"
                  placeholderText="Select date range"
                  popperPlacement="bottom-start"
                  monthsShown={dateMode === 'weekly' ? 2 : 1}
                  isClearable
                />
              </div>
            </Col>

            <Col xs={12} md="auto">
              <div className="d-flex align-items-center gap-2">
                <button onClick={handleGenerate}
                  className="border-0 rounded-3 px-4 py-2 d-flex align-items-center gap-2"
                  style={{
                    background: '#fff', color: '#047857', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    transition: 'all 0.2s',
                  }}>
                  <RefreshCw size={14} /> Generate
                </button>
                <button onClick={handlePrint}
                  className="border-0 rounded-3 px-3 py-2 d-flex align-items-center gap-2"
                  style={{
                    background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 13,
                    fontWeight: 500, cursor: 'pointer', backdropFilter: 'blur(4px)',
                    transition: 'all 0.2s',
                  }}>
                  <Printer size={14} /> Print
                </button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* ── Summary Stat Cards ── */}
      <Row className="g-3 mb-4 bh-stagger">
        {summaryCards.map((c) => (
          <Col key={c.label} xs={6} lg={3}>
            <Card className="border-0 rounded-4 h-100 bh-card-hover"
              style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <Card.Body className="p-3 p-lg-4 position-relative">
                <div className="d-flex align-items-start justify-content-between mb-3">
                  <div className="d-flex align-items-center justify-content-center rounded-3"
                    style={{ width: 44, height: 44, background: c.bg, color: c.color }}>
                    {c.icon}
                  </div>
                  {c.change !== undefined && (
                    <span className="d-flex align-items-center gap-1 rounded-pill px-2 py-1"
                      style={{
                        fontSize: 11, fontWeight: 600,
                        background: c.change >= 0 ? '#dcfce7' : '#fef2f2',
                        color: c.change >= 0 ? '#16a34a' : '#dc2626',
                      }}>
                      {c.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {Math.abs(c.change)}%
                    </span>
                  )}
                </div>
                <div className="fw-bold" style={{
                  fontSize: 30, color: '#111827', lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}>
                  {typeof c.value === 'number' ? fmtNum(c.value) : c.value}
                </div>
                <div className="mt-1" style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{c.label}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Charts Row ── */}
      <Row className="g-3 mb-4">
        <Col xs={12} lg={8}>
          <Card className="border-0 rounded-4 h-100 bh-fade-up"
            style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <span className="fw-bold" style={{ fontSize: 15, color: '#111827' }}>
                    Appointments vs Completed
                  </span>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>
                    {dateMode === 'weekly' ? 'Weekly' : 'Monthly'} comparison
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <div className="d-flex align-items-center gap-3 me-3"
                    style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>
                    <span className="d-flex align-items-center gap-1">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                      Appointments
                    </span>
                    <span className="d-flex align-items-center gap-1">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                      Completed
                    </span>
                  </div>
                  <div className="d-flex gap-1 p-1 rounded-2" style={{ background: '#f3f4f6' }}>
                    <button onClick={() => setActiveChart('bar')} className="border-0 rounded-2 p-1 px-2"
                      style={{ background: activeChart === 'bar' ? '#fff' : 'transparent', boxShadow: activeChart === 'bar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer' }}>
                      <BarChart3 size={14} color={activeChart === 'bar' ? '#111827' : '#9ca3af'} />
                    </button>
                    <button onClick={() => setActiveChart('line')} className="border-0 rounded-2 p-1 px-2"
                      style={{ background: activeChart === 'line' ? '#fff' : 'transparent', boxShadow: activeChart === 'line' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer' }}>
                      <TrendingUp size={14} color={activeChart === 'line' ? '#111827' : '#9ca3af'} />
                    </button>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                {activeChart === 'bar' ? (
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gBar1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#2563eb" />
                      </linearGradient>
                      <linearGradient id="gBar2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#16a34a" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="appointments" fill="url(#gBar1)" radius={[6, 6, 0, 0]} barSize={dateMode === 'weekly' ? 32 : 20} />
                    <Bar dataKey="completed" fill="url(#gBar2)" radius={[6, 6, 0, 0]} barSize={dateMode === 'weekly' ? 32 : 20} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="appointments" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} />
                    <Line type="monotone" dataKey="completed" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, fill: '#16a34a' }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={4}>
          <Card className="border-0 rounded-4 h-100 bh-fade-up"
            style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', animationDelay: '0.1s' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <span className="fw-bold" style={{ fontSize: 15, color: '#111827' }}>Service Breakdown</span>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{serviceBreakdown.reduce((s, x) => s + x.value, 0)} total services</div>
                </div>
                <button className="border-0 p-1 rounded-2 bg-transparent" onClick={handleExportServices} title="Export">
                  <Download size={14} color="#6b7280" />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={serviceBreakdown} dataKey="value" nameKey="name"
                    innerRadius={48} outerRadius={72} paddingAngle={3} strokeWidth={0}>
                    {serviceBreakdown.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="d-flex flex-column gap-2 mt-3">
                {serviceBreakdown.map((s) => (
                  <div key={s.name} className="d-flex align-items-center gap-2" style={{ fontSize: 12 }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: 3, backgroundColor: s.color,
                      display: 'inline-block', flexShrink: 0,
                    }} />
                    <span style={{ color: '#374151', fontWeight: 500, flex: 1 }}>{s.name}</span>
                    <div className="flex-grow-1 mx-2" style={{ height: 4, background: '#f3f4f6', borderRadius: 2, position: 'relative', maxWidth: 60 }}>
                      <div style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: 2, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ color: '#6b7280', fontWeight: 600, minWidth: 28, textAlign: 'right' }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ── Vaccination Trend ── */}
      <Card className="border-0 rounded-4 mb-4 bh-fade-up"
        style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', animationDelay: '0.15s' }}>
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <span className="fw-bold" style={{ fontSize: 15, color: '#111827' }}>Vaccination Trend</span>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{dateMode === 'weekly' ? 'Weekly' : 'Monthly'} vaccination count</div>
            </div>
            <Badge pill style={{ background: '#fef3c7', color: '#b45309', fontWeight: 600, fontSize: 11, padding: '6px 12px' }}>
              <Syringe size={12} className="me-1" /> {totals.totalVaccinations} total
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gVacc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="vaccinations" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gVacc)" dot={{ r: 3, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card.Body>
      </Card>

      {/* ── Saved Reports ── */}
      <Card className="border-0 rounded-4 bh-fade-up"
        style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', animationDelay: '0.2s' }}>
        <Card.Body className="p-0">
          <div className="p-4 pb-3 d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-bold" style={{ fontSize: 15, color: '#111827' }}>Saved Reports</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{recentReports.length} reports available for download</div>
            </div>
          </div>
          <div className="table-responsive-wrapper">
            <Table hover className="mb-0 align-middle">
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th className="px-4 py-3 border-0">Report Name</th>
                  <th className="py-3 border-0">Type</th>
                  <th className="py-3 border-0">Date</th>
                  <th className="py-3 border-0">Size</th>
                  <th className="py-3 border-0">Status</th>
                  <th className="py-3 text-end pe-4 border-0">Action</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: 13 }}>
                {recentReports.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <div className="d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center justify-content-center rounded-3"
                          style={{
                            width: 36, height: 36, flexShrink: 0,
                            background: r.type === 'Monthly' ? 'linear-gradient(135deg, #dbeafe, #bfdbfe)'
                              : r.type === 'Quarterly' ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
                              : 'linear-gradient(135deg, #fef3c7, #fde68a)',
                            color: r.type === 'Monthly' ? '#1d4ed8' : r.type === 'Quarterly' ? '#15803d' : '#b45309',
                          }}>
                          <FileText size={16} />
                        </div>
                        <span className="fw-semibold" style={{ color: '#111827' }}>{r.name}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge pill style={{
                        fontWeight: 600, fontSize: 11, padding: '4px 10px',
                        background: r.type === 'Monthly' ? '#eff6ff' : r.type === 'Quarterly' ? '#f0fdf4' : '#fffbeb',
                        color: r.type === 'Monthly' ? '#1d4ed8' : r.type === 'Quarterly' ? '#15803d' : '#b45309',
                      }}>
                        {r.type}
                      </Badge>
                    </td>
                    <td className="py-3" style={{ color: '#6b7280', fontSize: 12 }}>{r.date}</td>
                    <td className="py-3" style={{ color: '#6b7280', fontSize: 12 }}>{r.size}</td>
                    <td className="py-3">
                      <span className="d-flex align-items-center gap-1" style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>
                        <CheckCircle2 size={13} /> {r.status}
                      </span>
                    </td>
                    <td className="py-3 text-end pe-4">
                      <Button size="sm" variant="light" className="border-0 d-inline-flex align-items-center gap-1 rounded-3"
                        style={{ background: '#f0fdf4', padding: '6px 12px' }}
                        onClick={() => downloadCSV(`${r.name}.csv`, ['Report', 'Type', 'Date'], [[r.name, r.type, r.date]])}>
                        <Download size={13} color="#16a34a" />
                        <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Download</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* ── Generate Preview Modal ── */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} centered size="lg">
        <Modal.Header closeButton style={{ border: 'none', paddingBottom: 0 }}>
          <Modal.Title style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            Report Preview
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <div className="p-3 rounded-3 mb-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div className="d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span style={{ color: '#166534', fontWeight: 500 }}>
                Report generated for <strong>{dateLabel}</strong> ({dateMode} mode)
              </span>
            </div>
          </div>
          <Row className="g-3 mb-3">
            {summaryCards.map((c) => (
              <Col key={c.label} xs={6} md={3}>
                <div className="text-center p-3 rounded-3" style={{ background: '#f8fafc' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
                    {typeof c.value === 'number' ? fmtNum(c.value) : c.value}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{c.label}</div>
                </div>
              </Col>
            ))}
          </Row>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Use the Export button to download this report as CSV or JSON.
          </div>
        </Modal.Body>
        <Modal.Footer style={{ border: 'none' }}>
          <Button variant="light" size="sm" onClick={() => setShowPreview(false)} className="rounded-3">Close</Button>
          <Button size="sm" onClick={() => { handleExportSummary(); setShowPreview(false); }}
            className="rounded-3 d-flex align-items-center gap-1"
            style={{ background: '#16a34a', border: 'none' }}>
            <Download size={14} /> Download CSV
          </Button>
          <Button size="sm" onClick={handlePrint} variant="outline-secondary" className="rounded-3 d-flex align-items-center gap-1">
            <Printer size={14} /> Print
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Reports;
