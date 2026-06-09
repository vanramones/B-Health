import React, { useMemo, useState } from 'react';
import { Card, Row, Col, Form, Button, Table, Badge, Dropdown } from 'react-bootstrap';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Download, FileText, TrendingUp, Users, Activity, Syringe, Printer, FileSpreadsheet, File } from 'lucide-react';

const monthlyData = [
  { month: 'Jan', appointments: 42, completed: 38, vaccinations: 18 },
  { month: 'Feb', appointments: 55, completed: 49, vaccinations: 22 },
  { month: 'Mar', appointments: 61, completed: 54, vaccinations: 26 },
  { month: 'Apr', appointments: 48, completed: 45, vaccinations: 19 },
  { month: 'May', appointments: 72, completed: 65, vaccinations: 31 },
  { month: 'Jun', appointments: 68, completed: 60, vaccinations: 28 },
  { month: 'Jul', appointments: 80, completed: 72, vaccinations: 35 },
  { month: 'Aug', appointments: 75, completed: 70, vaccinations: 33 },
];

const serviceBreakdown = [
  { name: 'Consultation',  value: 145, color: '#16a34a' },
  { name: 'Vaccination',   value: 98,  color: '#3b82f6' },
  { name: 'Prenatal',      value: 64,  color: '#f59e0b' },
  { name: 'Dental',        value: 42,  color: '#ec4899' },
  { name: 'Other',         value: 28,  color: '#a855f7' },
];

const recentReports = [
  { id: 1, name: 'Monthly Summary - August 2026',  type: 'Monthly', date: '2026-08-31', size: '124 KB' },
  { id: 2, name: 'Vaccination Report - Q3',        type: 'Quarterly', date: '2026-07-15', size: '210 KB' },
  { id: 3, name: 'Resident Demographics',          type: 'Annual', date: '2026-06-01', size: '312 KB' },
  { id: 4, name: 'Appointment Trends - July',      type: 'Monthly', date: '2026-07-31', size: '98 KB' },
];

const downloadCSV = (filename, headers, rows) => {
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const Reports = () => {
  const [range, setRange] = useState('8m');

  const filteredMonthly = useMemo(() => {
    if (range === '3m') return monthlyData.slice(-3);
    if (range === '6m') return monthlyData.slice(-6);
    return monthlyData;
  }, [range]);

  const totals = useMemo(() => {
    const sum = (k) => filteredMonthly.reduce((s, x) => s + x[k], 0);
    const totalAppointments = sum('appointments');
    const totalCompleted = sum('completed');
    const totalVaccinations = sum('vaccinations');
    const completionRate = totalAppointments
      ? Math.round((totalCompleted / totalAppointments) * 100)
      : 0;
    return { totalAppointments, totalCompleted, totalVaccinations, completionRate };
  }, [filteredMonthly]);

  const handleExportSummary = () => {
    downloadCSV(
      'monthly-summary.csv',
      ['Month', 'Appointments', 'Completed', 'Vaccinations'],
      filteredMonthly.map((m) => [m.month, m.appointments, m.completed, m.vaccinations]),
    );
  };

  const handleExportServices = () => {
    downloadCSV(
      'service-breakdown.csv',
      ['Service', 'Count'],
      serviceBreakdown.map((s) => [s.name, s.value]),
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    const data = {
      generatedAt: new Date().toISOString(),
      period: range,
      summary: totals,
      monthlyData: filteredMonthly,
      serviceBreakdown,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = [
    { label: 'Total Appointments', value: totals.totalAppointments, icon: <Activity size={18} />, bg: '#dbeafe', color: '#1d4ed8' },
    { label: 'Completed',          value: totals.totalCompleted,    icon: <TrendingUp size={18} />, bg: '#dbeafe', color: '#15803d' },
    { label: 'Vaccinations',       value: totals.totalVaccinations, icon: <Syringe size={18} />, bg: '#fef3c7', color: '#b45309' },
    { label: 'Completion Rate',    value: `${totals.completionRate}%`, icon: <Users size={18} />, bg: '#fce7f3', color: '#be185d' },
  ];

  return (
    <div className="p-4" style={{ backgroundColor: '#f8fafc' }}>
      {/* Toolbar */}
      <Card className="border rounded-4 mb-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <Card.Body className="p-3 d-flex flex-wrap align-items-center gap-2">
          <div>
            <div className="fw-bold" style={{ fontSize: 14, color: '#111827' }}>Analytics & Reports</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Insights from health center activity</div>
          </div>
          <div className="ms-auto d-flex align-items-center gap-2">
            <Form.Select
              size="sm"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              style={{ width: 140, fontSize: 12 }}
            >
              <option value="3m">Last 3 months</option>
              <option value="6m">Last 6 months</option>
              <option value="8m">Last 8 months</option>
            </Form.Select>
            <Button
              size="sm"
              variant="light"
              onClick={handlePrint}
              className="d-flex align-items-center gap-1 border"
              style={{ fontSize: 12, fontWeight: 500 }}
            >
              <Printer size={14} /> Print
            </Button>
            <Dropdown>
              <Dropdown.Toggle
                size="sm"
                className="d-flex align-items-center gap-1 border-0"
                style={{ backgroundColor: '#16a34a', fontSize: 12, fontWeight: 500 }}
              >
                <Download size={14} /> Export
              </Dropdown.Toggle>
              <Dropdown.Menu align="end" style={{ fontSize: 12 }}>
                <Dropdown.Item onClick={handleExportSummary} className="d-flex align-items-center gap-2">
                  <FileSpreadsheet size={14} /> Export as CSV
                </Dropdown.Item>
                <Dropdown.Item onClick={handleExportJSON} className="d-flex align-items-center gap-2">
                  <File size={14} /> Export as JSON
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleExportServices} className="d-flex align-items-center gap-2">
                  <FileText size={14} /> Services Breakdown (CSV)
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </Card.Body>
      </Card>

      {/* Summary stat cards */}
      <Row className="g-2 g-md-3 mb-4 bh-stagger">
        {summaryCards.map((c) => (
          <Col key={c.label} xs={6} lg={3}>
            <Card className="border rounded-4 bh-card-hover" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <Card.Body className="p-4">
                <div
                  className="d-flex align-items-center justify-content-center rounded-3 mb-3"
                  style={{ width: 42, height: 42, backgroundColor: c.bg, color: c.color }}
                >
                  {c.icon}
                </div>
                <div className="fw-bold" style={{ fontSize: 28, color: '#111827', lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {c.value}
                </div>
                <div className="mt-1" style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{c.label}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts row */}
      <Row className="g-2 g-md-3 mb-4">
        <Col xs={12} lg={8}>
          <Card className="border rounded-4 h-100 bh-fade-up" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="fw-bold" style={{ fontSize: 14, color: '#111827' }}>Appointments vs Completed</span>
                <div className="d-flex align-items-center gap-3" style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>
                  <span className="d-flex align-items-center gap-1">
                    <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, backgroundColor: '#3b82f6' }} />
                    Appointments
                  </span>
                  <span className="d-flex align-items-center gap-1">
                    <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, backgroundColor: '#16a34a' }} />
                    Completed
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={filteredMonthly} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <Bar dataKey="appointments" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="completed" fill="#16a34a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={4}>
          <Card className="border rounded-4 h-100 bh-fade-up" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', animationDelay: '0.1s' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold" style={{ fontSize: 14, color: '#111827' }}>Service Breakdown</span>
                <Button size="sm" variant="light" className="border-0 p-1" onClick={handleExportServices} title="Export">
                  <Download size={13} color="#6b7280" />
                </Button>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={serviceBreakdown} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={2}>
                    {serviceBreakdown.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="d-flex flex-column gap-1 mt-2">
                {serviceBreakdown.map((s) => (
                  <div key={s.name} className="d-flex align-items-center justify-content-between" style={{ fontSize: 11 }}>
                    <span className="d-flex align-items-center gap-2">
                      <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, backgroundColor: s.color }} />
                      <span style={{ color: '#374151', fontWeight: 500 }}>{s.name}</span>
                    </span>
                    <span style={{ color: '#6b7280', fontWeight: 600 }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-2 g-md-3 mb-4">
        <Col xs={12}>
          <Card className="border rounded-4 bh-fade-up" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', animationDelay: '0.15s' }}>
            <Card.Body className="p-4">
              <div className="fw-bold mb-3" style={{ fontSize: 14, color: '#111827' }}>Vaccinations Trend</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={filteredMonthly} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gVacc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <Area type="monotone" dataKey="vaccinations" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gVacc)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Saved Reports */}
      <Card className="border rounded-4 bh-fade-up" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', animationDelay: '0.2s' }}>
        <Card.Body className="p-0">
          <div className="p-4 d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-bold" style={{ fontSize: 14, color: '#111827' }}>Saved Reports</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>Generated reports available for download</div>
            </div>
          </div>
          <div className="table-responsive-wrapper">
          <Table hover className="mb-0 align-middle">
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th className="px-4 py-3">Name</th>
                <th className="py-3">Type</th>
                <th className="py-3">Date</th>
                <th className="py-3">Size</th>
                <th className="py-3 text-end pe-4">Action</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13 }}>
              {recentReports.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-3"
                        style={{ width: 32, height: 32, backgroundColor: '#dbeafe', color: '#1d4ed8' }}
                      >
                        <FileText size={16} />
                      </div>
                      <span className="fw-semibold" style={{ color: '#111827' }}>{r.name}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <Badge pill bg="light" text="dark" style={{ fontWeight: 600 }}>{r.type}</Badge>
                  </td>
                  <td className="py-3" style={{ color: '#6b7280' }}>{r.date}</td>
                  <td className="py-3" style={{ color: '#6b7280' }}>{r.size}</td>
                  <td className="py-3 text-end pe-4">
                    <Button
                      size="sm"
                      variant="light"
                      className="border-0 d-inline-flex align-items-center gap-1"
                      onClick={() => downloadCSV(`${r.name}.csv`, ['Report', 'Type', 'Date'], [[r.name, r.type, r.date]])}
                    >
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
    </div>
  );
};

export default Reports;
