import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Card, Row, Col, Button, Table, Badge, Dropdown, Modal, Spinner } from 'react-bootstrap';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Download, FileText, TrendingUp, Activity, Syringe, Printer,
  FileSpreadsheet, File, Calendar, CheckCircle2, ArrowUpRight,
  ArrowDownRight, BarChart3, RefreshCw, Loader, FileDown,
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { supabase } from '../../config/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ── Helpers ── */
const downloadCSV = (filename, headers, rows) => {
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};
const fmtNum = (n) => (n ?? 0).toLocaleString();

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SERVICE_COLORS = {
  Consultation: '#16a34a', Vaccination: '#3b82f6', Prenatal: '#f59e0b',
  Dental: '#ec4899', Other: '#a855f7',
};

/* ── Custom tooltip ── */
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

/* ── Status badge for per-service modal ── */
const StatusBadge = ({ status }) => {
  const styles = {
    completed: { bg: '#dcfce7', color: '#15803d' },
    pending: { bg: '#fef3c7', color: '#b45309' },
    approved: { bg: '#dbeafe', color: '#1d4ed8' },
    rejected: { bg: '#fee2e2', color: '#b91c1c' },
  };
  const s = styles[status] || { bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
      fontSize: 10, fontWeight: 600, backgroundColor: s.bg, color: s.color,
      textTransform: 'capitalize',
    }}>
      {status}
    </span>
  );
};

/* ════════════════ Main Component ════════════════ */
const Reports = () => {
  const [dateMode, setDateMode] = useState('monthly');
  const [selectedService, setSelectedService] = useState('all');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 8); d.setDate(1); return d;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [showPreview, setShowPreview] = useState(false);
  const [activeChart, setActiveChart] = useState('bar');
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  /* ── Per-service report modal state ── */
  const [svcModal, setSvcModal] = useState(null); // { service, color }
  const [svcDateMode, setSvcDateMode] = useState('monthly');
  const [svcStartDate, setSvcStartDate] = useState(null);
  const [svcEndDate, setSvcEndDate] = useState(null);
  const [svcReportData, setSvcReportData] = useState(null);
  const [svcLoading, setSvcLoading] = useState(false);

  /* ── Separate report modals (Overall, Appointments, Health Records) ── */
  const [reportModal, setReportModal] = useState(null); // 'overall' | 'appointments' | 'health-records'
  const [rptDateMode, setRptDateMode] = useState('monthly');
  const [rptStartDate, setRptStartDate] = useState(null);
  const [rptEndDate, setRptEndDate] = useState(null);
  const [rptData, setRptData] = useState(null);
  const [rptLoading, setRptLoading] = useState(false);

  /* ── Live data state ── */
  const [appointments, setAppointments] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [services, setServices] = useState([]);

  /* ── Fetch real data from Supabase ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const isoStart = startDate ? startDate.toISOString().slice(0, 10) : '2020-01-01';
      const isoEnd = endDate ? endDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

      const [apptRes, vaccRes, hrRes, svcRes] = await Promise.all([
        supabase.from('appointments').select('id, name, date, time, status, service, notes, handled_by, created_at')
          .is('deleted_at', null).gte('date', isoStart).lte('date', isoEnd)
          .order('date', { ascending: true }),
        supabase.from('vaccinations').select('id, patient, date, vaccine, dose, status, administered_by, site, notes, created_at')
          .is('deleted_at', null).gte('date', isoStart).lte('date', isoEnd)
          .order('date', { ascending: true }),
        supabase.from('health_records').select('id, patient, type, diagnosis, doctor, date, notes, prescription, status, created_at')
          .is('deleted_at', null).gte('date', isoStart).lte('date', isoEnd)
          .order('date', { ascending: true }),
        supabase.from('services').select('id, name, category')
          .is('deleted_at', null),
      ]);

      setAppointments(apptRes.data || []);
      setVaccinations(vaccRes.data || []);
      setHealthRecords(hrRes.data || []);
      setServices(svcRes.data || []);
    } catch (err) {
      console.error('Reports fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Realtime subscription ── */
  useEffect(() => {
    const ch = supabase
      .channel('reports-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vaccinations' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_records' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchData]);

  /* ── Filter appointments by selected service ── */
  const filteredAppointments = useMemo(() => {
    if (selectedService === 'all') return appointments;
    return appointments.filter(a => a.service === selectedService);
  }, [appointments, selectedService]);

  /* ── Unique service names from appointments ── */
  const serviceNames = useMemo(() => {
    const set = new Set();
    appointments.forEach(a => { if (a.service) set.add(a.service); });
    services.forEach(s => { if (s.name) set.add(s.name); });
    return Array.from(set).sort();
  }, [appointments, services]);

  /* ── Compute chart data from real records ── */
  const chartData = useMemo(() => {
    const appts = filteredAppointments;
    if (dateMode === 'monthly') {
      const map = {};
      appts.forEach(a => {
        if (!a.date) return;
        const d = new Date(a.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
        if (!map[key]) map[key] = { month: MONTH_NAMES[d.getMonth()], appointments: 0, completed: 0, vaccinations: 0, sortKey: key };
        map[key].appointments += 1;
        if (a.status === 'completed') map[key].completed += 1;
      });
      vaccinations.forEach(v => {
        if (!v.date) return;
        if (selectedService !== 'all' && !v.vaccine?.toLowerCase().includes(selectedService.toLowerCase().split(' ')[0])) return;
        const d = new Date(v.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
        if (!map[key]) map[key] = { month: MONTH_NAMES[d.getMonth()], appointments: 0, completed: 0, vaccinations: 0, sortKey: key };
        map[key].vaccinations += 1;
      });
      return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }
    // weekly
    const map = {};
    const getWeekKey = (dateStr) => {
      const d = new Date(dateStr);
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
      return { key: `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`, label: `Week ${weekNum}` };
    };
    appts.forEach(a => {
      if (!a.date) return;
      const { key, label } = getWeekKey(a.date);
      if (!map[key]) map[key] = { week: label, appointments: 0, completed: 0, vaccinations: 0, sortKey: key };
      map[key].appointments += 1;
      if (a.status === 'completed') map[key].completed += 1;
    });
    vaccinations.forEach(v => {
      if (!v.date) return;
      if (selectedService !== 'all' && !v.vaccine?.toLowerCase().includes(selectedService.toLowerCase().split(' ')[0])) return;
      const { key, label } = getWeekKey(v.date);
      if (!map[key]) map[key] = { week: label, appointments: 0, completed: 0, vaccinations: 0, sortKey: key };
      map[key].vaccinations += 1;
    });
    return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredAppointments, vaccinations, dateMode, selectedService]);

  const xKey = dateMode === 'weekly' ? 'week' : 'month';

  /* ── Totals from real data ── */
  const totals = useMemo(() => {
    const ta = filteredAppointments.length;
    const tc = filteredAppointments.filter(a => a.status === 'completed').length;
    const tp = filteredAppointments.filter(a => a.status === 'pending').length;
    const tapproved = filteredAppointments.filter(a => a.status === 'approved').length;
    const trejected = filteredAppointments.filter(a => a.status === 'rejected').length;
    const tv = selectedService === 'all'
      ? vaccinations.length
      : vaccinations.filter(v => v.vaccine?.toLowerCase().includes(selectedService.toLowerCase().split(' ')[0])).length;
    const rate = ta ? Math.round((tc / ta) * 100) : 0;
    return {
      totalAppointments: ta, totalCompleted: tc, totalPending: tp,
      totalApproved: tapproved, totalRejected: trejected,
      totalVaccinations: tv, completionRate: rate,
    };
  }, [filteredAppointments, vaccinations, selectedService]);

  /* ── Previous period comparison (shift date range back by same duration) ── */
  const [prevTotals, setPrevTotals] = useState({ totalAppointments: 0, totalCompleted: 0, totalVaccinations: 0 });

  useEffect(() => {
    if (!startDate || !endDate) return;
    const duration = endDate.getTime() - startDate.getTime();
    const prevEnd = new Date(startDate.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);
    const ps = prevStart.toISOString().slice(0, 10);
    const pe = prevEnd.toISOString().slice(0, 10);

    (async () => {
      try {
        const [apptPrev, vaccPrev] = await Promise.all([
          supabase.from('appointments').select('id, status')
            .is('deleted_at', null).gte('date', ps).lte('date', pe),
          supabase.from('vaccinations').select('id')
            .is('deleted_at', null).gte('date', ps).lte('date', pe),
        ]);
        const pa = apptPrev.data || [];
        setPrevTotals({
          totalAppointments: pa.length,
          totalCompleted: pa.filter(a => a.status === 'completed').length,
          totalVaccinations: (vaccPrev.data || []).length,
        });
      } catch { /* ignore */ }
    })();
  }, [startDate, endDate]);

  const pctChange = (curr, prev) => {
    if (!prev) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  /* ── Service breakdown from filtered appointments ── */
  const serviceBreakdown = useMemo(() => {
    const map = {};
    filteredAppointments.forEach(a => {
      const svc = a.service || 'Other';
      const name = Object.keys(SERVICE_COLORS).find(k => svc.toLowerCase().includes(k.toLowerCase())) || 'Other';
      map[name] = (map[name] || 0) + 1;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map)
      .map(([name, value]) => ({
        name, value,
        color: SERVICE_COLORS[name] || '#a855f7',
        pct: Math.round((value / total) * 100),
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredAppointments]);

  /* ── Week helper for Excel grouping ── */
  const getWeekLabel = (dateStr) => {
    const d = new Date(dateStr);
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (dt) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { weekNum, label: `Week ${weekNum} (${fmt(monday)} - ${fmt(sunday)})` };
  };

  /* ── Export as Excel with weekly sheets ── */
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const today = new Date().toISOString().split('T')[0];
    const svcLabel = selectedService === 'all' ? 'All Services' : selectedService;
    const appts = filteredAppointments;

    /* --- Sheet 1: Weekly Summary --- */
    const weekMap = {};
    appts.forEach(a => {
      if (!a.date) return;
      const { label } = getWeekLabel(a.date);
      if (!weekMap[label]) weekMap[label] = { week: label, appointments: 0, completed: 0, pending: 0, vaccinations: 0 };
      weekMap[label].appointments += 1;
      if (a.status === 'completed') weekMap[label].completed += 1;
      else weekMap[label].pending += 1;
    });
    vaccinations.forEach(v => {
      if (!v.date) return;
      if (selectedService !== 'all' && !v.vaccine?.toLowerCase().includes(selectedService.toLowerCase().split(' ')[0])) return;
      const { label } = getWeekLabel(v.date);
      if (!weekMap[label]) weekMap[label] = { week: label, appointments: 0, completed: 0, pending: 0, vaccinations: 0 };
      weekMap[label].vaccinations += 1;
    });
    const summaryRows = Object.values(weekMap);
    summaryRows.push({
      week: 'TOTAL',
      appointments: summaryRows.reduce((s, r) => s + r.appointments, 0),
      completed: summaryRows.reduce((s, r) => s + r.completed, 0),
      pending: summaryRows.reduce((s, r) => s + r.pending, 0),
      vaccinations: summaryRows.reduce((s, r) => s + r.vaccinations, 0),
    });
    const ws1 = XLSX.utils.json_to_sheet(summaryRows.map(r => ({
      'Week': r.week, 'Appointments': r.appointments, 'Completed': r.completed,
      'Pending': r.pending, 'Vaccinations': r.vaccinations,
    })));
    ws1['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Weekly Summary');

    /* --- Sheet 2: All Appointments --- */
    const apptRows = appts.map(a => ({
      'Date': a.date || '', 'Time': a.time || '', 'Patient': a.name || '',
      'Service': a.service || '', 'Status': a.status || '',
      'Handled By': a.handled_by || '', 'Notes': a.notes || '',
    }));
    if (apptRows.length === 0) apptRows.push({ 'Date': 'No records', 'Time': '', 'Patient': '', 'Service': '', 'Status': '', 'Handled By': '', 'Notes': '' });
    const ws2 = XLSX.utils.json_to_sheet(apptRows);
    ws2['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Appointments');

    /* --- Sheet 3: All Vaccinations --- */
    const filteredVacc = selectedService === 'all'
      ? vaccinations
      : vaccinations.filter(v => v.vaccine?.toLowerCase().includes(selectedService.toLowerCase().split(' ')[0]));
    const vaccRows = filteredVacc.map(v => ({
      'Date': v.date || '', 'Patient': v.patient || '', 'Vaccine': v.vaccine || '',
      'Dose': v.dose || '', 'Status': v.status || '',
      'Administered By': v.administered_by || '', 'Site': v.site || '', 'Notes': v.notes || '',
    }));
    if (vaccRows.length === 0) vaccRows.push({ 'Date': 'No records', 'Patient': '', 'Vaccine': '', 'Dose': '', 'Status': '', 'Administered By': '', 'Site': '', 'Notes': '' });
    const ws3 = XLSX.utils.json_to_sheet(vaccRows);
    ws3['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Vaccinations');

    /* --- Sheet 4: Service Breakdown --- */
    const svcRows = serviceBreakdown.map(s => ({
      'Service': s.name, 'Count': s.value, 'Percentage': `${s.pct}%`,
    }));
    svcRows.push({ 'Service': 'TOTAL', 'Count': svcRows.reduce((s, r) => s + r.Count, 0), 'Percentage': '100%' });
    const ws4 = XLSX.utils.json_to_sheet(svcRows);
    ws4['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws4, 'Service Breakdown');

    /* --- Sheet 5: Status Summary --- */
    const statusRows = [
      { 'Metric': 'Service', 'Value': svcLabel },
      { 'Metric': 'Date Range', 'Value': dateLabel },
      { 'Metric': 'Total Appointments', 'Value': totals.totalAppointments },
      { 'Metric': 'Completed', 'Value': totals.totalCompleted },
      { 'Metric': 'Pending', 'Value': totals.totalPending },
      { 'Metric': 'Approved', 'Value': totals.totalApproved },
      { 'Metric': 'Rejected', 'Value': totals.totalRejected },
      { 'Metric': 'Vaccinations', 'Value': totals.totalVaccinations },
      { 'Metric': 'Completion Rate', 'Value': `${totals.completionRate}%` },
    ];
    const ws5 = XLSX.utils.json_to_sheet(statusRows);
    ws5['!cols'] = [{ wch: 22 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, ws5, 'Status Summary');

    const filename = selectedService === 'all'
      ? `B-Health-Report-${today}.xlsx`
      : `B-Health-${svcLabel.replace(/[^a-zA-Z0-9]/g, '')}-Report-${today}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  /* ── Other export handlers ── */
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
      generatedAt: new Date().toISOString(), mode: dateMode,
      dateRange: { start: startDate?.toISOString(), end: endDate?.toISOString() },
      summary: totals, chartData, serviceBreakdown,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `health-report-${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const handlePrint = () => window.print();
  const handleGenerate = () => { fetchData(); setShowPreview(true); };

  /* ── PDF Export Helper ── */
  const buildPDF = (title, sections) => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    let y = 15;

    // Header bar
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(title, 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - 14, 18, { align: 'right' });
    y = 36;

    sections.forEach((sec) => {
      if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 15; }

      if (sec.type === 'subtitle') {
        doc.setFontSize(12);
        doc.setTextColor(17, 24, 39);
        doc.text(sec.text, 14, y);
        y += 8;
      }

      if (sec.type === 'stats') {
        doc.setFontSize(9);
        const colW = (pageW - 28) / sec.items.length;
        sec.items.forEach((item, i) => {
          const x = 14 + i * colW;
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(x, y, colW - 4, 22, 3, 3, 'F');
          doc.setTextColor(17, 24, 39);
          doc.setFontSize(14);
          doc.text(String(item.value), x + (colW - 4) / 2, y + 11, { align: 'center' });
          doc.setFontSize(7);
          doc.setTextColor(107, 114, 128);
          doc.text(item.label, x + (colW - 4) / 2, y + 18, { align: 'center' });
        });
        y += 28;
      }

      if (sec.type === 'table') {
        autoTable(doc, {
          startY: y,
          head: [sec.headers],
          body: sec.rows,
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8, textColor: [55, 65, 81] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 14, right: 14 },
          styles: { cellPadding: 3, lineColor: [229, 231, 235], lineWidth: 0.3 },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      if (sec.type === 'info') {
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(sec.text, 14, y);
        y += 6;
      }
    });

    // Footer
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text('B-Health Management System', 14, h - 8);
      doc.text(`Page ${i} of ${pages}`, pageW - 14, h - 8, { align: 'right' });
    }

    return doc;
  };

  /* ── Main page PDF export ── */
  const handleExportPDF = () => {
    const svcLabel = selectedService === 'all' ? 'All Services' : selectedService;
    const sections = [
      { type: 'info', text: `Service: ${svcLabel} | Period: ${dateLabel} | Mode: ${dateMode}` },
      { type: 'subtitle', text: 'Summary' },
      { type: 'stats', items: [
        { label: 'Total Appointments', value: totals.totalAppointments },
        { label: 'Completed', value: totals.totalCompleted },
        { label: 'Pending', value: totals.totalPending },
        { label: 'Completion Rate', value: `${totals.completionRate}%` },
      ]},
      { type: 'subtitle', text: 'Appointments' },
      { type: 'table', headers: ['Date', 'Time', 'Patient', 'Service', 'Status', 'Handled By'],
        rows: filteredAppointments.slice(0, 100).map(a => [a.date, a.time || '', a.name || '', a.service || '', a.status || '', a.handled_by || '']) },
      { type: 'subtitle', text: 'Service Breakdown' },
      { type: 'table', headers: ['Service', 'Count', 'Percentage'],
        rows: serviceBreakdown.map(s => [s.name, String(s.value), `${s.pct}%`]) },
    ];
    const doc = buildPDF(`B-Health Report — ${svcLabel}`, sections);
    doc.save(`B-Health-Report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  /* ── Per-service report generation with custom date range ── */
  const openSvcModal = (svc) => {
    const d = new Date(); d.setMonth(d.getMonth() - 3); d.setDate(1);
    setSvcModal(svc);
    setSvcDateMode('monthly');
    setSvcStartDate(d);
    setSvcEndDate(new Date());
    setSvcReportData(null);
    setSvcLoading(false);
  };

  /* ── Open separate report modal (overall/appointments/health-records) ── */
  const openReportModal = (type) => {
    const d = new Date(); d.setMonth(d.getMonth() - 3); d.setDate(1);
    setReportModal(type);
    setRptDateMode('monthly');
    setRptStartDate(d);
    setRptEndDate(new Date());
    setRptData(null);
    setRptLoading(false);
  };

  /* ── Generate separate report ── */
  const generateReport = async () => {
    if (!reportModal || !rptStartDate || !rptEndDate) return;
    setRptLoading(true);
    try {
      const isoStart = rptStartDate.toISOString().slice(0, 10);
      const isoEnd = rptEndDate.toISOString().slice(0, 10);

      if (reportModal === 'overall') {
        const [apptRes, vaccRes, hrRes] = await Promise.all([
          supabase.from('appointments').select('id, name, date, time, status, service, handled_by, notes')
            .is('deleted_at', null).gte('date', isoStart).lte('date', isoEnd).order('date', { ascending: true }),
          supabase.from('vaccinations').select('id, patient, date, vaccine, dose, status, administered_by')
            .is('deleted_at', null).gte('date', isoStart).lte('date', isoEnd).order('date', { ascending: true }),
          supabase.from('health_records').select('id, patient, type, diagnosis, doctor, date, status, notes')
            .is('deleted_at', null).gte('date', isoStart).lte('date', isoEnd).order('date', { ascending: true }),
        ]);
        const appts = apptRes.data || [];
        const vaccs = vaccRes.data || [];
        const hrs = hrRes.data || [];
        const completed = appts.filter(a => a.status === 'completed').length;
        const rate = appts.length ? Math.round((completed / appts.length) * 100) : 0;
        setRptData({
          appointments: appts, vaccinations: vaccs, healthRecords: hrs,
          totals: {
            appointments: appts.length, completed, vaccinations: vaccs.length,
            healthRecords: hrs.length, completionRate: rate,
          },
          dateRange: { start: isoStart, end: isoEnd },
        });
      } else if (reportModal === 'appointments') {
        const apptRes = await supabase.from('appointments').select('id, name, date, time, status, service, handled_by, notes')
          .is('deleted_at', null).gte('date', isoStart).lte('date', isoEnd).order('date', { ascending: true });
        const appts = apptRes.data || [];
        const completed = appts.filter(a => a.status === 'completed').length;
        const pending = appts.filter(a => a.status === 'pending').length;
        const approved = appts.filter(a => a.status === 'approved').length;
        const rejected = appts.filter(a => a.status === 'rejected').length;
        const rate = appts.length ? Math.round((completed / appts.length) * 100) : 0;
        // Build chart data
        const chartMap = {};
        appts.forEach(a => {
          if (!a.date) return;
          const d = new Date(a.date);
          const key = rptDateMode === 'monthly'
            ? `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
            : `${d.getFullYear()}-W${Math.ceil((Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7)}`;
          const label = rptDateMode === 'monthly' ? MONTH_NAMES[d.getMonth()] : `W${key.split('-W')[1]}`;
          if (!chartMap[key]) chartMap[key] = { label, total: 0, completed: 0, pending: 0, sortKey: key };
          chartMap[key].total += 1;
          if (a.status === 'completed') chartMap[key].completed += 1;
          else if (a.status === 'pending') chartMap[key].pending += 1;
        });
        // Service breakdown
        const svcMap = {};
        appts.forEach(a => {
          const svc = a.service || 'Other';
          svcMap[svc] = (svcMap[svc] || 0) + 1;
        });
        setRptData({
          appointments: appts,
          totals: { total: appts.length, completed, pending, approved, rejected, rate },
          chart: Object.values(chartMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey)),
          serviceBreakdown: Object.entries(svcMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
          dateRange: { start: isoStart, end: isoEnd },
        });
      } else if (reportModal === 'health-records') {
        const hrRes = await supabase.from('health_records').select('id, patient, type, diagnosis, doctor, date, status, notes, prescription')
          .is('deleted_at', null).gte('date', isoStart).lte('date', isoEnd).order('date', { ascending: true });
        const hrs = hrRes.data || [];
        const closed = hrs.filter(r => r.status === 'closed').length;
        const open = hrs.filter(r => r.status === 'open' || r.status === 'active').length;
        // Type breakdown
        const typeMap = {};
        hrs.forEach(r => {
          const t = r.type || 'Other';
          typeMap[t] = (typeMap[t] || 0) + 1;
        });
        // Chart data
        const chartMap = {};
        hrs.forEach(r => {
          if (!r.date) return;
          const d = new Date(r.date);
          const key = rptDateMode === 'monthly'
            ? `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
            : `${d.getFullYear()}-W${Math.ceil((Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7)}`;
          const label = rptDateMode === 'monthly' ? MONTH_NAMES[d.getMonth()] : `W${key.split('-W')[1]}`;
          if (!chartMap[key]) chartMap[key] = { label, records: 0, sortKey: key };
          chartMap[key].records += 1;
        });
        setRptData({
          healthRecords: hrs,
          totals: { total: hrs.length, closed, open },
          typeBreakdown: Object.entries(typeMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
          chart: Object.values(chartMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey)),
          dateRange: { start: isoStart, end: isoEnd },
        });
      }
    } catch (err) {
      console.error('Report generation error:', err);
    } finally {
      setRptLoading(false);
    }
  };

  /* ── Export separate report as Excel ── */
  const exportReport = () => {
    if (!rptData || !reportModal) return;
    const wb = XLSX.utils.book_new();
    const today = new Date().toISOString().split('T')[0];
    const { dateRange } = rptData;

    if (reportModal === 'overall') {
      // Summary sheet
      const summary = [
        { 'Metric': 'Report Type', 'Value': 'Overall Health Center Report' },
        { 'Metric': 'Date Range', 'Value': `${dateRange.start} to ${dateRange.end}` },
        { 'Metric': 'Total Appointments', 'Value': rptData.totals.appointments },
        { 'Metric': 'Completed', 'Value': rptData.totals.completed },
        { 'Metric': 'Completion Rate', 'Value': `${rptData.totals.completionRate}%` },
        { 'Metric': 'Vaccinations', 'Value': rptData.totals.vaccinations },
        { 'Metric': 'Health Records', 'Value': rptData.totals.healthRecords },
      ];
      const ws1 = XLSX.utils.json_to_sheet(summary);
      ws1['!cols'] = [{ wch: 22 }, { wch: 28 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

      // Appointments
      const apptRows = rptData.appointments.map(a => ({
        'Date': a.date, 'Time': a.time, 'Patient': a.name, 'Service': a.service,
        'Status': a.status, 'Handled By': a.handled_by || '',
      }));
      if (!apptRows.length) apptRows.push({ 'Date': 'No records', 'Time': '', 'Patient': '', 'Service': '', 'Status': '', 'Handled By': '' });
      const ws2 = XLSX.utils.json_to_sheet(apptRows);
      ws2['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Appointments');

      // Vaccinations
      const vaccRows = rptData.vaccinations.map(v => ({
        'Date': v.date, 'Patient': v.patient, 'Vaccine': v.vaccine, 'Dose': v.dose,
        'Status': v.status, 'Administered By': v.administered_by || '',
      }));
      if (!vaccRows.length) vaccRows.push({ 'Date': 'No records', 'Patient': '', 'Vaccine': '', 'Dose': '', 'Status': '', 'Administered By': '' });
      const ws3 = XLSX.utils.json_to_sheet(vaccRows);
      ws3['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Vaccinations');

      // Health Records
      const hrRows = rptData.healthRecords.map(r => ({
        'Date': r.date, 'Patient': r.patient, 'Type': r.type, 'Diagnosis': r.diagnosis,
        'Doctor': r.doctor, 'Status': r.status, 'Notes': r.notes || '',
      }));
      if (!hrRows.length) hrRows.push({ 'Date': 'No records', 'Patient': '', 'Type': '', 'Diagnosis': '', 'Doctor': '', 'Status': '', 'Notes': '' });
      const ws4 = XLSX.utils.json_to_sheet(hrRows);
      ws4['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 24 }];
      XLSX.utils.book_append_sheet(wb, ws4, 'Health Records');

      XLSX.writeFile(wb, `B-Health-Overall-Report-${today}.xlsx`);

    } else if (reportModal === 'appointments') {
      const summary = [
        { 'Metric': 'Report Type', 'Value': 'Appointments Report' },
        { 'Metric': 'Date Range', 'Value': `${dateRange.start} to ${dateRange.end}` },
        { 'Metric': 'Total Appointments', 'Value': rptData.totals.total },
        { 'Metric': 'Completed', 'Value': rptData.totals.completed },
        { 'Metric': 'Pending', 'Value': rptData.totals.pending },
        { 'Metric': 'Approved', 'Value': rptData.totals.approved },
        { 'Metric': 'Rejected', 'Value': rptData.totals.rejected },
        { 'Metric': 'Completion Rate', 'Value': `${rptData.totals.rate}%` },
      ];
      const ws1 = XLSX.utils.json_to_sheet(summary);
      ws1['!cols'] = [{ wch: 22 }, { wch: 28 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

      const apptRows = rptData.appointments.map(a => ({
        'Date': a.date, 'Time': a.time, 'Patient': a.name, 'Service': a.service,
        'Status': a.status, 'Handled By': a.handled_by || '', 'Notes': a.notes || '',
      }));
      if (!apptRows.length) apptRows.push({ 'Date': 'No records', 'Time': '', 'Patient': '', 'Service': '', 'Status': '', 'Handled By': '', 'Notes': '' });
      const ws2 = XLSX.utils.json_to_sheet(apptRows);
      ws2['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 24 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Appointments');

      const svcRows = rptData.serviceBreakdown.map(s => ({ 'Service': s.name, 'Count': s.value }));
      svcRows.push({ 'Service': 'TOTAL', 'Count': svcRows.reduce((s, r) => s + r.Count, 0) });
      const ws3 = XLSX.utils.json_to_sheet(svcRows);
      ws3['!cols'] = [{ wch: 20 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Service Breakdown');

      XLSX.writeFile(wb, `B-Health-Appointments-Report-${today}.xlsx`);

    } else if (reportModal === 'health-records') {
      const summary = [
        { 'Metric': 'Report Type', 'Value': 'Health Records Report' },
        { 'Metric': 'Date Range', 'Value': `${dateRange.start} to ${dateRange.end}` },
        { 'Metric': 'Total Records', 'Value': rptData.totals.total },
        { 'Metric': 'Closed', 'Value': rptData.totals.closed },
        { 'Metric': 'Open/Active', 'Value': rptData.totals.open },
      ];
      const ws1 = XLSX.utils.json_to_sheet(summary);
      ws1['!cols'] = [{ wch: 22 }, { wch: 28 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

      const hrRows = rptData.healthRecords.map(r => ({
        'Date': r.date, 'Patient': r.patient, 'Type': r.type, 'Diagnosis': r.diagnosis,
        'Doctor': r.doctor, 'Status': r.status, 'Prescription': r.prescription || '', 'Notes': r.notes || '',
      }));
      if (!hrRows.length) hrRows.push({ 'Date': 'No records', 'Patient': '', 'Type': '', 'Diagnosis': '', 'Doctor': '', 'Status': '', 'Prescription': '', 'Notes': '' });
      const ws2 = XLSX.utils.json_to_sheet(hrRows);
      ws2['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 24 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Health Records');

      const typeRows = rptData.typeBreakdown.map(t => ({ 'Type': t.name, 'Count': t.value }));
      typeRows.push({ 'Type': 'TOTAL', 'Count': typeRows.reduce((s, r) => s + r.Count, 0) });
      const ws3 = XLSX.utils.json_to_sheet(typeRows);
      ws3['!cols'] = [{ wch: 18 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Type Breakdown');

      XLSX.writeFile(wb, `B-Health-HealthRecords-Report-${today}.xlsx`);
    }
  };

  /* ── PDF export for separate reports (Overall / Appointments / Health Records) ── */
  const exportReportPDF = () => {
    if (!rptData || !reportModal) return;
    const { dateRange } = rptData;

    if (reportModal === 'overall') {
      const sections = [
        { type: 'info', text: `Period: ${dateRange.start} to ${dateRange.end}` },
        { type: 'subtitle', text: 'Summary' },
        { type: 'stats', items: [
          { label: 'Appointments', value: rptData.totals.appointments },
          { label: 'Completed', value: rptData.totals.completed },
          { label: 'Rate', value: `${rptData.totals.completionRate}%` },
          { label: 'Vaccinations', value: rptData.totals.vaccinations },
          { label: 'Health Records', value: rptData.totals.healthRecords },
        ]},
        { type: 'subtitle', text: 'Appointments' },
        { type: 'table', headers: ['Date', 'Time', 'Patient', 'Service', 'Status'],
          rows: rptData.appointments.slice(0, 100).map(a => [a.date, a.time || '', a.name || '', a.service || '', a.status || '']) },
        { type: 'subtitle', text: 'Health Records' },
        { type: 'table', headers: ['Date', 'Patient', 'Type', 'Diagnosis', 'Doctor'],
          rows: rptData.healthRecords.slice(0, 100).map(r => [r.date, r.patient || '', r.type || '', r.diagnosis || '', r.doctor || '']) },
      ];
      buildPDF('Overall Health Center Report', sections).save(`B-Health-Overall-Report-${new Date().toISOString().split('T')[0]}.pdf`);

    } else if (reportModal === 'appointments') {
      const sections = [
        { type: 'info', text: `Period: ${dateRange.start} to ${dateRange.end}` },
        { type: 'subtitle', text: 'Summary' },
        { type: 'stats', items: [
          { label: 'Total', value: rptData.totals.total },
          { label: 'Completed', value: rptData.totals.completed },
          { label: 'Pending', value: rptData.totals.pending },
          { label: 'Approved', value: rptData.totals.approved },
          { label: 'Rejected', value: rptData.totals.rejected },
          { label: 'Rate', value: `${rptData.totals.rate}%` },
        ]},
        { type: 'subtitle', text: 'All Appointments' },
        { type: 'table', headers: ['Date', 'Time', 'Patient', 'Service', 'Status', 'Handled By'],
          rows: rptData.appointments.slice(0, 200).map(a => [a.date, a.time || '', a.name || '', a.service || '', a.status || '', a.handled_by || '']) },
      ];
      if (rptData.serviceBreakdown?.length) {
        sections.push({ type: 'subtitle', text: 'Service Breakdown' });
        sections.push({ type: 'table', headers: ['Service', 'Count'],
          rows: rptData.serviceBreakdown.map(s => [s.name, String(s.value)]) });
      }
      buildPDF('Appointments Report', sections).save(`B-Health-Appointments-Report-${new Date().toISOString().split('T')[0]}.pdf`);

    } else if (reportModal === 'health-records') {
      const sections = [
        { type: 'info', text: `Period: ${dateRange.start} to ${dateRange.end}` },
        { type: 'subtitle', text: 'Summary' },
        { type: 'stats', items: [
          { label: 'Total Records', value: rptData.totals.total },
          { label: 'Closed', value: rptData.totals.closed },
          { label: 'Open/Active', value: rptData.totals.open },
        ]},
        { type: 'subtitle', text: 'All Health Records' },
        { type: 'table', headers: ['Date', 'Patient', 'Type', 'Diagnosis', 'Doctor', 'Status'],
          rows: rptData.healthRecords.slice(0, 200).map(r => [r.date, r.patient || '', r.type || '', r.diagnosis || '', r.doctor || '', r.status || '']) },
      ];
      if (rptData.typeBreakdown?.length) {
        sections.push({ type: 'subtitle', text: 'Type Breakdown' });
        sections.push({ type: 'table', headers: ['Type', 'Count'],
          rows: rptData.typeBreakdown.map(t => [t.name, String(t.value)]) });
      }
      buildPDF('Health Records Report', sections).save(`B-Health-HealthRecords-Report-${new Date().toISOString().split('T')[0]}.pdf`);
    }
  };

  /* ── PDF export for per-service report ── */
  const exportSvcReportPDF = () => {
    if (!svcReportData || !svcModal) return;
    const { totals: t, dateRange } = svcReportData;
    const sections = [
      { type: 'info', text: `Service: ${svcModal.name} | Period: ${dateRange.start} to ${dateRange.end}` },
      { type: 'subtitle', text: 'Summary' },
      { type: 'stats', items: [
        { label: 'Total', value: t.total },
        { label: 'Completed', value: t.completed },
        { label: 'Pending', value: t.pending },
        { label: 'Approved', value: t.approved },
        { label: 'Rate', value: `${t.rate}%` },
      ]},
      { type: 'subtitle', text: 'Appointments' },
      { type: 'table', headers: ['Date', 'Time', 'Patient', 'Status', 'Handled By'],
        rows: svcReportData.appointments.slice(0, 200).map(a => [a.date, a.time || '', a.name || '', a.status || '', a.handled_by || '']) },
    ];
    if (svcReportData.vaccinations.length) {
      sections.push({ type: 'subtitle', text: 'Vaccinations' });
      sections.push({ type: 'table', headers: ['Date', 'Patient', 'Vaccine', 'Dose', 'Status'],
        rows: svcReportData.vaccinations.map(v => [v.date, v.patient || '', v.vaccine || '', v.dose || '', v.status || '']) });
    }
    const name = svcModal.name.replace(/[^a-zA-Z0-9]/g, '');
    buildPDF(`${svcModal.name} Report`, sections).save(`B-Health-${name}-Report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const generateSvcReport = async () => {
    if (!svcModal || !svcStartDate || !svcEndDate) return;
    setSvcLoading(true);
    try {
      const isoStart = svcStartDate.toISOString().slice(0, 10);
      const isoEnd = svcEndDate.toISOString().slice(0, 10);
      const [apptRes, vaccRes] = await Promise.all([
        supabase.from('appointments').select('id, name, date, time, status, service, notes, handled_by')
          .is('deleted_at', null).eq('service', svcModal.name)
          .gte('date', isoStart).lte('date', isoEnd).order('date', { ascending: true }),
        supabase.from('vaccinations').select('id, patient, date, vaccine, dose, status, administered_by, site, notes')
          .is('deleted_at', null).gte('date', isoStart).lte('date', isoEnd)
          .order('date', { ascending: true }),
      ]);
      const appts = apptRes.data || [];
      const svcKey = svcModal.name.toLowerCase().split(' ')[0];
      const vaccs = (vaccRes.data || []).filter(v => v.vaccine?.toLowerCase().includes(svcKey));
      const completed = appts.filter(a => a.status === 'completed').length;
      const pending = appts.filter(a => a.status === 'pending').length;
      const approved = appts.filter(a => a.status === 'approved').length;
      const rate = appts.length ? Math.round((completed / appts.length) * 100) : 0;

      // Build chart data
      const chartMap = {};
      appts.forEach(a => {
        if (!a.date) return;
        const d = new Date(a.date);
        const key = svcDateMode === 'monthly'
          ? `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
          : `${d.getFullYear()}-W${Math.ceil((Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7)}`;
        const label = svcDateMode === 'monthly'
          ? MONTH_NAMES[d.getMonth()]
          : `W${Math.ceil((Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7)}`;
        if (!chartMap[key]) chartMap[key] = { label, total: 0, completed: 0, sortKey: key };
        chartMap[key].total += 1;
        if (a.status === 'completed') chartMap[key].completed += 1;
      });
      const chart = Object.values(chartMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

      setSvcReportData({
        appointments: appts, vaccinations: vaccs,
        totals: { total: appts.length, completed, pending, approved, rate },
        chart,
        dateRange: { start: isoStart, end: isoEnd },
      });
    } catch (err) {
      console.error('Service report error:', err);
    } finally {
      setSvcLoading(false);
    }
  };

  const exportSvcReport = () => {
    if (!svcReportData || !svcModal) return;
    const wb = XLSX.utils.book_new();
    const today = new Date().toISOString().split('T')[0];
    const svcName = svcModal.name.replace(/[^a-zA-Z0-9]/g, '');
    const { appointments: appts, vaccinations: vaccs, totals: t, dateRange } = svcReportData;

    // Sheet 1: Summary
    const summary = [
      { 'Metric': 'Service', 'Value': svcModal.name },
      { 'Metric': 'Date Range', 'Value': `${dateRange.start} to ${dateRange.end}` },
      { 'Metric': 'Mode', 'Value': svcDateMode },
      { 'Metric': 'Total Appointments', 'Value': t.total },
      { 'Metric': 'Completed', 'Value': t.completed },
      { 'Metric': 'Pending', 'Value': t.pending },
      { 'Metric': 'Approved', 'Value': t.approved },
      { 'Metric': 'Completion Rate', 'Value': `${t.rate}%` },
      { 'Metric': 'Vaccinations', 'Value': vaccs.length },
    ];
    const ws1 = XLSX.utils.json_to_sheet(summary);
    ws1['!cols'] = [{ wch: 22 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    // Sheet 2: Appointments
    const apptRows = appts.map(a => ({
      'Date': a.date || '', 'Time': a.time || '', 'Patient': a.name || '',
      'Status': a.status || '', 'Handled By': a.handled_by || '', 'Notes': a.notes || '',
    }));
    if (apptRows.length === 0) apptRows.push({ 'Date': 'No records', 'Time': '', 'Patient': '', 'Status': '', 'Handled By': '', 'Notes': '' });
    const ws2 = XLSX.utils.json_to_sheet(apptRows);
    ws2['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Appointments');

    // Sheet 3: Vaccinations
    const vaccRows = vaccs.map(v => ({
      'Date': v.date || '', 'Patient': v.patient || '', 'Vaccine': v.vaccine || '',
      'Dose': v.dose || '', 'Status': v.status || '', 'Administered By': v.administered_by || '',
    }));
    if (vaccRows.length === 0) vaccRows.push({ 'Date': 'No records', 'Patient': '', 'Vaccine': '', 'Dose': '', 'Status': '', 'Administered By': '' });
    const ws3 = XLSX.utils.json_to_sheet(vaccRows);
    ws3['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Vaccinations');

    XLSX.writeFile(wb, `B-Health-${svcName}-Report-${today}.xlsx`);
  };

  /* ── Stat cards ── */
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
      label: 'Pending', value: totals.totalPending,
      icon: <FileText size={20} />, bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      color: '#b45309',
    },
    {
      label: 'Completion Rate', value: `${totals.completionRate}%`,
      icon: <TrendingUp size={20} />, bg: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
      color: '#be185d',
      change: prevTotals.totalAppointments
        ? pctChange(totals.completionRate, prevTotals.totalAppointments ? Math.round((prevTotals.totalCompleted / prevTotals.totalAppointments) * 100) : 0)
        : 0,
    },
  ];

  /* ── Per-service report cards ── */
  const perServiceStats = useMemo(() => {
    if (serviceNames.length === 0) return [];
    return serviceNames.map(svc => {
      const svcAppts = appointments.filter(a => a.service === svc);
      const completed = svcAppts.filter(a => a.status === 'completed').length;
      const pending = svcAppts.filter(a => a.status === 'pending').length;
      const approved = svcAppts.filter(a => a.status === 'approved').length;
      const rate = svcAppts.length ? Math.round((completed / svcAppts.length) * 100) : 0;
      const catKey = Object.keys(SERVICE_COLORS).find(k => svc.toLowerCase().includes(k.toLowerCase())) || 'Other';
      return {
        name: svc,
        total: svcAppts.length,
        completed, pending, approved, rate,
        color: SERVICE_COLORS[catKey] || '#a855f7',
      };
    }).filter(s => s.total > 0).sort((a, b) => b.total - a.total);
  }, [appointments, serviceNames]);

  const fmtDate = (d, mode) => {
    if (!d) return '...';
    return mode === 'monthly'
      ? d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const dateLabel = `${fmtDate(startDate, dateMode)} - ${fmtDate(endDate, dateMode)}`;

  /* ── Generated reports list (from real data) ── */
  const recentReports = useMemo(() => {
    const now = new Date();
    const reports = [];
    const appts = filteredAppointments;
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const monthAppts = appts.filter(a => {
        if (!a.date) return false;
        const ad = new Date(a.date);
        return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear();
      });
      if (monthAppts.length > 0 || i === 0) {
        reports.push({
          id: i + 1,
          name: selectedService === 'all'
            ? `Monthly Summary - ${monthName}`
            : `${selectedService} - ${monthName}`,
          type: 'Monthly',
          date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
          records: monthAppts.length,
          status: 'Ready',
        });
      }
    }
    return reports;
  }, [filteredAppointments, selectedService]);

  return (
    <div className="p-4" style={{ backgroundColor: '#f8fafc' }} ref={printRef}>
      {/* ── Header ── */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h5 className="fw-bold mb-1" style={{ color: '#111827', letterSpacing: '-0.01em' }}>
            Analytics & Reports
          </h5>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
            {selectedService === 'all' ? 'All services' : selectedService} &bull; {dateLabel}
            {loading && <Spinner animation="border" size="sm" className="ms-2" style={{ width: 12, height: 12, borderWidth: 2 }} />}
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
              <Dropdown.Item onClick={handleExportExcel} className="d-flex align-items-center gap-2 py-2">
                <FileSpreadsheet size={14} color="#16a34a" /> Export as Excel (.xlsx)
              </Dropdown.Item>
              <Dropdown.Item onClick={handleExportPDF} className="d-flex align-items-center gap-2 py-2">
                <FileDown size={14} color="#dc2626" /> Export as PDF
              </Dropdown.Item>
              <Dropdown.Item onClick={handleExportSummary} className="d-flex align-items-center gap-2 py-2">
                <FileSpreadsheet size={14} color="#6b7280" /> Export as CSV
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

      {/* ── Date Range Picker ── */}
      <Card className="border-0 rounded-4 mb-4 bh-report-date-card" style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f766e 100%)',
        boxShadow: '0 4px 20px rgba(6, 78, 59, 0.25)',
      }}>
        <Card.Body className="p-4">
          <Row className="align-items-center g-3">
            <Col xs={12} md="auto">
              <div className="d-flex align-items-center gap-2 mb-2 mb-md-0">
                <div className="d-flex align-items-center justify-content-center rounded-3"
                  style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }}>
                  <Calendar size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Report Period</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>Select date range to generate report</div>
                </div>
              </div>
            </Col>

            <Col xs={6} md="auto">
              <div className="d-flex align-items-center gap-1 p-1 rounded-3"
                style={{ background: 'rgba(255,255,255,0.12)' }}>
                {['weekly', 'monthly'].map(m => (
                  <button key={m} onClick={() => setDateMode(m)}
                    className="border-0 rounded-2 px-3 py-1"
                    style={{
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      background: dateMode === m ? '#fff' : 'transparent',
                      color: dateMode === m ? '#047857' : 'rgba(255,255,255,0.8)',
                      boxShadow: dateMode === m ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                      textTransform: 'capitalize',
                    }}>
                    {m}
                  </button>
                ))}
              </div>
            </Col>

            <Col xs={6} md="auto">
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="border-0 rounded-3 px-3 py-2"
                style={{
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.15)', color: '#fff',
                  outline: 'none', backdropFilter: 'blur(10px)',
                }}
              >
                <option value="all" style={{ color: '#0f172a' }}>All Services</option>
                {serviceNames.map(svc => (
                  <option key={svc} value={svc} style={{ color: '#0f172a' }}>{svc}</option>
                ))}
              </select>
            </Col>

            <Col xs={12} md="auto" className="flex-grow-1">
              <div className="bh-dp-wrapper">
                <DatePicker
                  selected={startDate}
                  onChange={(dates) => { const [s, e] = dates; setStartDate(s); setEndDate(e); }}
                  startDate={startDate}
                  endDate={endDate}
                  selectsRange
                  dateFormat={dateMode === 'weekly' ? 'MMM dd, yyyy' : 'MMM yyyy'}
                  showMonthYearPicker={dateMode === 'monthly'}
                  showWeekNumbers={dateMode === 'weekly'}
                  className="bh-dp-input bh-dp-range"
                  placeholderText="Select date range"
                  monthsShown={dateMode === 'weekly' ? 2 : 1}
                  isClearable
                  withPortal
                />
              </div>
            </Col>

            <Col xs={12} md="auto">
              <div className="d-flex align-items-center gap-2">
                <button onClick={handleGenerate}
                  className="border-0 rounded-3 px-4 py-2 d-flex align-items-center gap-2"
                  style={{
                    background: '#fff', color: '#047857', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', transition: 'all 0.2s',
                  }}>
                  <RefreshCw size={14} /> Generate
                </button>
                <button onClick={handlePrint}
                  className="border-0 rounded-3 px-3 py-2 d-flex align-items-center gap-2"
                  style={{
                    background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 13,
                    fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
                  }}>
                  <Printer size={14} /> Print
                </button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* ── Summary Cards ── */}
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
                <div className="fw-bold" style={{ fontSize: 30, color: '#111827', lineHeight: 1, letterSpacing: '-0.03em' }}>
                  {loading ? <Spinner animation="border" size="sm" /> : (typeof c.value === 'number' ? fmtNum(c.value) : c.value)}
                </div>
                <div className="mt-1" style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{c.label}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Charts ── */}
      <Row className="g-3 mb-4">
        <Col xs={12} lg={8}>
          <Card className="border-0 rounded-4 h-100 bh-fade-up" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <span className="fw-bold" style={{ fontSize: 15, color: '#111827' }}>
                    {selectedService === 'all' ? 'Appointments vs Completed' : `${selectedService} - Appointments vs Completed`}
                  </span>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>
                    {dateMode === 'weekly' ? 'Weekly' : 'Monthly'} comparison &bull; {filteredAppointments.length} records
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <div className="d-flex align-items-center gap-3 me-3" style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>
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
              {chartData.length === 0 && !loading ? (
                <div className="d-flex align-items-center justify-content-center" style={{ height: 280, color: '#9ca3af', fontSize: 13 }}>
                  No appointment data for this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  {activeChart === 'bar' ? (
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gBar1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#2563eb" />
                        </linearGradient>
                        <linearGradient id="gBar2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" /><stop offset="100%" stopColor="#16a34a" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="appointments" fill="url(#gBar1)" radius={[6, 6, 0, 0]} barSize={dateMode === 'weekly' ? 28 : 18} />
                      <Bar dataKey="completed" fill="url(#gBar2)" radius={[6, 6, 0, 0]} barSize={dateMode === 'weekly' ? 28 : 18} />
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
              )}
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
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{filteredAppointments.length} total appointments</div>
                </div>
                <button className="border-0 p-1 rounded-2 bg-transparent" onClick={handleExportServices} title="Export">
                  <Download size={14} color="#6b7280" />
                </button>
              </div>
              {serviceBreakdown.length === 0 ? (
                <div className="d-flex align-items-center justify-content-center" style={{ height: 170, color: '#9ca3af', fontSize: 13 }}>
                  No services data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={serviceBreakdown} dataKey="value" nameKey="name"
                      innerRadius={48} outerRadius={72} paddingAngle={3} strokeWidth={0}>
                      {serviceBreakdown.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="d-flex flex-column gap-2 mt-3">
                {serviceBreakdown.map((s) => (
                  <div key={s.name} className="d-flex align-items-center gap-2" style={{ fontSize: 12 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ color: '#374151', fontWeight: 500, flex: 1 }}>{s.name}</span>
                    <div className="flex-grow-1 mx-2" style={{ height: 4, background: '#f3f4f6', borderRadius: 2, maxWidth: 60 }}>
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
              <span className="fw-bold" style={{ fontSize: 15, color: '#111827' }}>
                {selectedService === 'all' ? 'Vaccination Trend' : `${selectedService} - Vaccination Trend`}
              </span>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{dateMode === 'weekly' ? 'Weekly' : 'Monthly'} vaccination count</div>
            </div>
            <Badge pill style={{ background: '#fef3c7', color: '#b45309', fontWeight: 600, fontSize: 11, padding: '6px 12px' }}>
              <Syringe size={12} className="me-1" /> {fmtNum(totals.totalVaccinations)} total
            </Badge>
          </div>
          {chartData.length === 0 && !loading ? (
            <div className="d-flex align-items-center justify-content-center" style={{ height: 200, color: '#9ca3af', fontSize: 13 }}>
              No vaccination data for this period
            </div>
          ) : (
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
          )}
        </Card.Body>
      </Card>

      {/* ── Report Generation Cards (Overall / Appointments / Health Records) ── */}
      <Row className="g-3 mb-4">
        {/* Overall Report */}
        <Col xs={12} md={4}>
          <Card className="border-0 rounded-4 h-100 bh-card-hover" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ height: 4, background: 'linear-gradient(90deg, #16a34a, #15803d)' }} />
            <Card.Body className="p-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="d-flex align-items-center justify-content-center rounded-3"
                  style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#15803d' }}>
                  <BarChart3 size={20} />
                </div>
                <div>
                  <div className="fw-bold" style={{ fontSize: 14, color: '#111827' }}>Overall Report</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Complete health center summary</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, marginBottom: 12 }}>
                Generate a comprehensive report covering appointments, vaccinations, and health records in one document.
              </p>
              <Button size="sm" onClick={() => openReportModal('overall')}
                className="w-100 border-0 d-flex align-items-center justify-content-center gap-1 rounded-3"
                style={{ background: '#16a34a', fontWeight: 600, fontSize: 12 }}>
                <Calendar size={14} /> Generate Report
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Appointments Report */}
        <Col xs={12} md={4}>
          <Card className="border-0 rounded-4 h-100 bh-card-hover" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ height: 4, background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)' }} />
            <Card.Body className="p-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="d-flex align-items-center justify-content-center rounded-3"
                  style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', color: '#1d4ed8' }}>
                  <Activity size={20} />
                </div>
                <div>
                  <div className="fw-bold" style={{ fontSize: 14, color: '#111827' }}>Appointments Report</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Detailed appointment analytics</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, marginBottom: 12 }}>
                Generate a report focused on appointments: status breakdown, service distribution, and completion rates.
              </p>
              <Button size="sm" onClick={() => openReportModal('appointments')}
                className="w-100 border-0 d-flex align-items-center justify-content-center gap-1 rounded-3"
                style={{ background: '#1d4ed8', fontWeight: 600, fontSize: 12 }}>
                <Calendar size={14} /> Generate Report
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Health Records Report */}
        <Col xs={12} md={4}>
          <Card className="border-0 rounded-4 h-100 bh-card-hover" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ height: 4, background: 'linear-gradient(90deg, #f59e0b, #d97706)' }} />
            <Card.Body className="p-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="d-flex align-items-center justify-content-center rounded-3"
                  style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#b45309' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <div className="fw-bold" style={{ fontSize: 14, color: '#111827' }}>Health Records Report</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Patient medical records summary</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, marginBottom: 12 }}>
                Generate a report on health records: patient diagnoses, record types, and treatment status.
              </p>
              <Button size="sm" onClick={() => openReportModal('health-records')}
                className="w-100 border-0 d-flex align-items-center justify-content-center gap-1 rounded-3"
                style={{ background: '#b45309', fontWeight: 600, fontSize: 12 }}>
                <Calendar size={14} /> Generate Report
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ── Per-Service Report Cards ── */}
      <Card className="border-0 rounded-4 mb-4 bh-fade-up"
        style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', animationDelay: '0.18s' }}>
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <span className="fw-bold" style={{ fontSize: 15, color: '#111827' }}>Service Reports</span>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>
                {perServiceStats.length} services &bull; Click a service to generate its individual report
              </div>
            </div>
            <Badge pill style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 600, fontSize: 11, padding: '6px 12px' }}>
              {perServiceStats.reduce((s, r) => s + r.total, 0)} total appointments
            </Badge>
          </div>
          {perServiceStats.length === 0 ? (
            <div className="d-flex align-items-center justify-content-center" style={{ height: 120, color: '#9ca3af', fontSize: 13 }}>
              No service data available for this period
            </div>
          ) : (
            <Row className="g-3">
              {perServiceStats.map((svc) => (
                <Col key={svc.name} xs={12} md={6} lg={4}>
                  <div
                    onClick={() => setSelectedService(svc.name)}
                    className="p-3 rounded-4 h-100"
                    style={{
                      cursor: 'pointer', transition: 'all 0.2s',
                      border: selectedService === svc.name ? `2px solid ${svc.color}` : '1px solid #e5e7eb',
                      background: selectedService === svc.name ? `${svc.color}08` : '#fff',
                    }}
                    onMouseEnter={(e) => { if (selectedService !== svc.name) e.currentTarget.style.borderColor = svc.color + '88'; }}
                    onMouseLeave={(e) => { if (selectedService !== svc.name) e.currentTarget.style.borderColor = '#e5e7eb'; }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <div className="d-flex align-items-center justify-content-center rounded-3"
                          style={{ width: 32, height: 32, background: `${svc.color}15`, color: svc.color }}>
                          <Activity size={15} />
                        </div>
                        <span className="fw-bold" style={{ fontSize: 13, color: '#111827' }}>{svc.name}</span>
                      </div>
                      <div className="d-flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); openSvcModal(svc); }}
                          className="border-0 rounded-2 px-2 py-1 d-flex align-items-center gap-1"
                          style={{ background: `${svc.color}12`, color: svc.color, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                          title={`Generate report for ${svc.name}`}
                        >
                          <Calendar size={12} /> Generate
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedService(svc.name); handleExportExcel(); }}
                          className="border-0 rounded-2 px-2 py-1 d-flex align-items-center gap-1"
                          style={{ background: `${svc.color}12`, color: svc.color, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                          title={`Export ${svc.name} report`}
                        >
                          <FileSpreadsheet size={12} /> Export
                        </button>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-3 mb-2" style={{ fontSize: 11 }}>
                      <span style={{ color: '#6b7280' }}>
                        <strong style={{ color: svc.color, fontSize: 18 }}>{svc.total}</strong> total
                      </span>
                      <span style={{ color: '#16a34a' }}>
                        <CheckCircle2 size={11} className="me-1" />{svc.completed}
                      </span>
                      <span style={{ color: '#b45309' }}>
                        <FileText size={11} className="me-1" />{svc.pending}
                      </span>
                    </div>
                    <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${svc.rate}%`, height: '100%',
                        background: `linear-gradient(90deg, ${svc.color}, ${svc.color}cc)`,
                        borderRadius: 3, transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <div className="d-flex justify-content-between mt-1" style={{ fontSize: 10, color: '#9ca3af' }}>
                      <span>Completion Rate</span>
                      <span style={{ fontWeight: 600, color: svc.color }}>{svc.rate}%</span>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          )}
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
                  <th className="py-3 border-0">Records</th>
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
                            background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', color: '#1d4ed8',
                          }}>
                          <FileText size={16} />
                        </div>
                        <span className="fw-semibold" style={{ color: '#111827' }}>{r.name}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge pill style={{ fontWeight: 600, fontSize: 11, padding: '4px 10px', background: '#eff6ff', color: '#1d4ed8' }}>
                        {r.type}
                      </Badge>
                    </td>
                    <td className="py-3" style={{ color: '#6b7280', fontSize: 12 }}>{r.date}</td>
                    <td className="py-3" style={{ color: '#374151', fontSize: 12, fontWeight: 600 }}>{r.records}</td>
                    <td className="py-3">
                      <span className="d-flex align-items-center gap-1" style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>
                        <CheckCircle2 size={13} /> {r.status}
                      </span>
                    </td>
                    <td className="py-3 text-end pe-4">
                      <Button size="sm" variant="light" className="border-0 d-inline-flex align-items-center gap-1 rounded-3"
                        style={{ background: '#f0fdf4', padding: '6px 12px' }}
                        onClick={() => downloadCSV(`${r.name}.csv`, ['Report', 'Type', 'Date', 'Records'], [[r.name, r.type, r.date, r.records]])}>
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

      {/* ── Preview Modal ── */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} centered size="lg">
        <Modal.Header closeButton style={{ border: 'none', paddingBottom: 0 }}>
          <Modal.Title style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Report Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <div className="p-3 rounded-3 mb-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div className="d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span style={{ color: '#166534', fontWeight: 500 }}>
                Report generated for <strong>{dateLabel}</strong> ({dateMode} mode)
                {selectedService !== 'all' && <span> &bull; Service: <strong>{selectedService}</strong></span>}
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
            Data sourced from {filteredAppointments.length} appointments and {totals.totalVaccinations} vaccinations in the selected period.
          </div>
        </Modal.Body>
        <Modal.Footer style={{ border: 'none' }}>
          <Button variant="light" size="sm" onClick={() => setShowPreview(false)} className="rounded-3">Close</Button>
          <Button size="sm" onClick={() => { handleExportExcel(); setShowPreview(false); }}
            className="rounded-3 d-flex align-items-center gap-1" style={{ background: '#16a34a', border: 'none' }}>
            <FileSpreadsheet size={14} /> Excel
          </Button>
          <Button size="sm" onClick={() => { handleExportPDF(); setShowPreview(false); }}
            className="rounded-3 d-flex align-items-center gap-1" style={{ background: '#dc2626', border: 'none' }}>
            <FileDown size={14} /> PDF
          </Button>
          <Button size="sm" onClick={() => { handleExportSummary(); setShowPreview(false); }}
            className="rounded-3 d-flex align-items-center gap-1" variant="outline-success">
            <Download size={14} /> Download CSV
          </Button>
          <Button size="sm" onClick={handlePrint} variant="outline-secondary" className="rounded-3 d-flex align-items-center gap-1">
            <Printer size={14} /> Print
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Per-Service Report Modal with Calendar ── */}
      <Modal show={!!svcModal} onHide={() => setSvcModal(null)} centered size="lg">
        <Modal.Header closeButton style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="d-flex align-items-center gap-2">
            {svcModal && (
              <div className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: 36, height: 36, background: `${svcModal.color}15`, color: svcModal.color }}>
                <Activity size={18} />
              </div>
            )}
            <div>
              <Modal.Title style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                {svcModal ? svcModal.name : ''} Report
              </Modal.Title>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>Generate a detailed report with custom date range</div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="p-4">
          {/* Calendar / Date Range Section */}
          <div className="p-3 rounded-3 mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div className="d-flex align-items-center gap-2 mb-3">
              <Calendar size={16} color={svcModal?.color || '#16a34a'} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Select Date Range</span>
            </div>
            <Row className="align-items-center g-2">
              <Col xs={12} md="auto">
                <div className="d-flex align-items-center gap-1 p-1 rounded-2" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
                  {['weekly', 'monthly'].map(m => (
                    <button key={m} onClick={() => setSvcDateMode(m)}
                      className="border-0 rounded-2 px-3 py-1"
                      style={{
                        fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                        background: svcDateMode === m ? (svcModal?.color || '#16a34a') : 'transparent',
                        color: svcDateMode === m ? '#fff' : '#64748b',
                        textTransform: 'capitalize',
                      }}>
                      {m}
                    </button>
                  ))}
                </div>
              </Col>
              <Col xs={12} md="auto" className="flex-grow-1">
                <div className="bh-dp-wrapper bh-dp-modal">
                  <DatePicker
                    selected={svcStartDate}
                    onChange={(dates) => { const [s, e] = dates; setSvcStartDate(s); setSvcEndDate(e); }}
                    startDate={svcStartDate}
                    endDate={svcEndDate}
                    selectsRange
                    dateFormat={svcDateMode === 'weekly' ? 'MMM dd, yyyy' : 'MMM yyyy'}
                    showMonthYearPicker={svcDateMode === 'monthly'}
                    showWeekNumbers={svcDateMode === 'weekly'}
                    className="bh-dp-input bh-dp-range bh-dp-modal-input"
                    placeholderText="Select date range"
                    monthsShown={svcDateMode === 'weekly' ? 2 : 1}
                    isClearable
                  />
                </div>
              </Col>
              <Col xs={12} md="auto">
                <button onClick={generateSvcReport}
                  disabled={!svcStartDate || !svcEndDate || svcLoading}
                  className="border-0 rounded-3 px-4 py-2 d-flex align-items-center gap-2"
                  style={{
                    background: svcModal?.color || '#16a34a', color: '#fff',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    opacity: (!svcStartDate || !svcEndDate || svcLoading) ? 0.5 : 1,
                  }}>
                  {svcLoading ? <Spinner size="sm" animation="border" /> : <RefreshCw size={14} />}
                  {svcLoading ? 'Generating...' : 'Generate Report'}
                </button>
              </Col>
            </Row>
          </div>

          {/* Report Results */}
          {svcReportData && (
            <>
              <div className="p-3 rounded-3 mb-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div className="d-flex align-items-center gap-2" style={{ fontSize: 12 }}>
                  <CheckCircle2 size={15} color="#16a34a" />
                  <span style={{ color: '#166534', fontWeight: 500 }}>
                    Report generated for <strong>{svcReportData.dateRange.start}</strong> to <strong>{svcReportData.dateRange.end}</strong>
                  </span>
                </div>
              </div>

              {/* Stats */}
              <Row className="g-2 mb-3">
                {[
                  { label: 'Total', value: svcReportData.totals.total, color: '#1d4ed8' },
                  { label: 'Completed', value: svcReportData.totals.completed, color: '#16a34a' },
                  { label: 'Pending', value: svcReportData.totals.pending, color: '#b45309' },
                  { label: 'Approved', value: svcReportData.totals.approved, color: '#7c3aed' },
                  { label: 'Rate', value: `${svcReportData.totals.rate}%`, color: '#be185d' },
                  { label: 'Vaccinations', value: svcReportData.vaccinations.length, color: '#0891b2' },
                ].map((s) => (
                  <Col key={s.label} xs={6} md={2}>
                    <div className="text-center p-2 rounded-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>{s.label}</div>
                    </div>
                  </Col>
                ))}
              </Row>

              {/* Mini Chart */}
              {svcReportData.chart.length > 0 && (
                <div className="mb-3">
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    {svcDateMode === 'weekly' ? 'Weekly' : 'Monthly'} Appointments Trend
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={svcReportData.chart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="total" name="Total" fill={svcModal?.color || '#3b82f6'} radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="completed" name="Completed" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Recent Appointments Table */}
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                Recent Appointments ({svcReportData.appointments.length})
              </div>
              <div className="table-responsive-wrapper" style={{ maxHeight: 200, overflowY: 'auto' }}>
                <Table hover size="sm" className="mb-0 align-middle">
                  <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
                    <tr style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>
                      <th className="px-3 py-2">Date</th>
                      <th className="py-2">Patient</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Handled By</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: 12 }}>
                    {svcReportData.appointments.slice(0, 20).map((a) => (
                      <tr key={a.id}>
                        <td className="px-3 py-2" style={{ color: '#6b7280' }}>{a.date}</td>
                        <td className="py-2" style={{ color: '#111827', fontWeight: 500 }}>{a.name}</td>
                        <td className="py-2"><StatusBadge status={a.status} /></td>
                        <td className="py-2" style={{ color: '#6b7280' }}>{a.handled_by || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </>
          )}

          {!svcReportData && !svcLoading && (
            <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: 200, color: '#9ca3af' }}>
              <Calendar size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>Select a date range and click Generate Report</div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #f1f5f9' }}>
          <Button variant="light" size="sm" onClick={() => setSvcModal(null)} className="rounded-3">Close</Button>
          <Button size="sm" onClick={() => window.print()} variant="outline-secondary" className="rounded-3 d-flex align-items-center gap-1" disabled={!svcReportData}>
            <Printer size={14} /> Print
          </Button>
          <Button size="sm" onClick={exportSvcReportPDF}
            className="rounded-3 d-flex align-items-center gap-1 border-0" disabled={!svcReportData}
            style={{ background: '#dc2626' }}>
            <FileDown size={14} /> PDF
          </Button>
          <Button size="sm" onClick={exportSvcReport}
            className="rounded-3 d-flex align-items-center gap-1 border-0" disabled={!svcReportData}
            style={{ background: svcModal?.color || '#16a34a' }}>
            <FileSpreadsheet size={14} /> Download Excel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Separate Report Modal (Overall / Appointments / Health Records) ── */}
      <Modal show={!!reportModal} onHide={() => setReportModal(null)} centered size="lg">
        <Modal.Header closeButton style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="d-flex align-items-center gap-2">
            <div className="d-flex align-items-center justify-content-center rounded-3"
              style={{
                width: 36, height: 36,
                background: reportModal === 'overall' ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
                  : reportModal === 'appointments' ? 'linear-gradient(135deg, #dbeafe, #bfdbfe)'
                  : 'linear-gradient(135deg, #fef3c7, #fde68a)',
                color: reportModal === 'overall' ? '#15803d'
                  : reportModal === 'appointments' ? '#1d4ed8'
                  : '#b45309',
              }}>
              {reportModal === 'overall' ? <BarChart3 size={18} />
                : reportModal === 'appointments' ? <Activity size={18} />
                : <FileText size={18} />}
            </div>
            <div>
              <Modal.Title style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                {reportModal === 'overall' ? 'Overall Health Center Report'
                  : reportModal === 'appointments' ? 'Appointments Report'
                  : 'Health Records Report'}
              </Modal.Title>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>Select date range and generate report</div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="p-4">
          {/* Calendar / Date Range */}
          <div className="p-3 rounded-3 mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div className="d-flex align-items-center gap-2 mb-3">
              <Calendar size={16} color="#475569" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Select Date Range</span>
            </div>
            <Row className="align-items-center g-2">
              <Col xs={12} md="auto">
                <div className="d-flex align-items-center gap-1 p-1 rounded-2" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
                  {['weekly', 'monthly'].map(m => (
                    <button key={m} onClick={() => setRptDateMode(m)}
                      className="border-0 rounded-2 px-3 py-1"
                      style={{
                        fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                        background: rptDateMode === m ? '#0f172a' : 'transparent',
                        color: rptDateMode === m ? '#fff' : '#64748b',
                        textTransform: 'capitalize',
                      }}>
                      {m}
                    </button>
                  ))}
                </div>
              </Col>
              <Col xs={12} md="auto" className="flex-grow-1">
                <div className="bh-dp-wrapper bh-dp-modal">
                  <DatePicker
                    selected={rptStartDate}
                    onChange={(dates) => { const [s, e] = dates; setRptStartDate(s); setRptEndDate(e); }}
                    startDate={rptStartDate}
                    endDate={rptEndDate}
                    selectsRange
                    dateFormat={rptDateMode === 'weekly' ? 'MMM dd, yyyy' : 'MMM yyyy'}
                    showMonthYearPicker={rptDateMode === 'monthly'}
                    showWeekNumbers={rptDateMode === 'weekly'}
                    className="bh-dp-input bh-dp-range bh-dp-modal-input"
                    placeholderText="Select date range"
                    monthsShown={rptDateMode === 'weekly' ? 2 : 1}
                    isClearable
                  />
                </div>
              </Col>
              <Col xs={12} md="auto">
                <button onClick={generateReport}
                  disabled={!rptStartDate || !rptEndDate || rptLoading}
                  className="border-0 rounded-3 px-4 py-2 d-flex align-items-center gap-2"
                  style={{
                    background: '#0f172a', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    opacity: (!rptStartDate || !rptEndDate || rptLoading) ? 0.5 : 1,
                  }}>
                  {rptLoading ? <Spinner size="sm" animation="border" /> : <RefreshCw size={14} />}
                  {rptLoading ? 'Generating...' : 'Generate Report'}
                </button>
              </Col>
            </Row>
          </div>

          {/* Report Results */}
          {rptData && (
            <>
              <div className="p-3 rounded-3 mb-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div className="d-flex align-items-center gap-2" style={{ fontSize: 12 }}>
                  <CheckCircle2 size={15} color="#16a34a" />
                  <span style={{ color: '#166534', fontWeight: 500 }}>
                    Report generated for <strong>{rptData.dateRange.start}</strong> to <strong>{rptData.dateRange.end}</strong>
                  </span>
                </div>
              </div>

              {/* Overall Report Stats */}
              {reportModal === 'overall' && (
                <>
                  <Row className="g-2 mb-3">
                    {[
                      { label: 'Appointments', value: rptData.totals.appointments, color: '#1d4ed8' },
                      { label: 'Completed', value: rptData.totals.completed, color: '#16a34a' },
                      { label: 'Completion Rate', value: `${rptData.totals.completionRate}%`, color: '#be185d' },
                      { label: 'Vaccinations', value: rptData.totals.vaccinations, color: '#b45309' },
                      { label: 'Health Records', value: rptData.totals.healthRecords, color: '#7c3aed' },
                    ].map((s) => (
                      <Col key={s.label} xs={6} md={Math.floor(12 / 5)}>
                        <div className="text-center p-2 rounded-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: 10, color: '#6b7280' }}>{s.label}</div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                  <Row className="g-3">
                    <Col xs={12} md={6}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Recent Appointments</div>
                      <div className="table-responsive-wrapper" style={{ maxHeight: 200, overflowY: 'auto' }}>
                        <Table hover size="sm" className="mb-0 align-middle">
                          <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
                            <tr style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>
                              <th className="px-3 py-2">Date</th><th className="py-2">Patient</th><th className="py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody style={{ fontSize: 12 }}>
                            {rptData.appointments.slice(0, 15).map(a => (
                              <tr key={a.id}>
                                <td className="px-3 py-2" style={{ color: '#6b7280' }}>{a.date}</td>
                                <td className="py-2" style={{ color: '#111827', fontWeight: 500 }}>{a.name}</td>
                                <td className="py-2"><StatusBadge status={a.status} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </Col>
                    <Col xs={12} md={6}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Recent Health Records</div>
                      <div className="table-responsive-wrapper" style={{ maxHeight: 200, overflowY: 'auto' }}>
                        <Table hover size="sm" className="mb-0 align-middle">
                          <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
                            <tr style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>
                              <th className="px-3 py-2">Date</th><th className="py-2">Patient</th><th className="py-2">Type</th>
                            </tr>
                          </thead>
                          <tbody style={{ fontSize: 12 }}>
                            {rptData.healthRecords.slice(0, 15).map(r => (
                              <tr key={r.id}>
                                <td className="px-3 py-2" style={{ color: '#6b7280' }}>{r.date}</td>
                                <td className="py-2" style={{ color: '#111827', fontWeight: 500 }}>{r.patient}</td>
                                <td className="py-2" style={{ color: '#6b7280' }}>{r.type}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </Col>
                  </Row>
                </>
              )}

              {/* Appointments Report Stats */}
              {reportModal === 'appointments' && (
                <>
                  <Row className="g-2 mb-3">
                    {[
                      { label: 'Total', value: rptData.totals.total, color: '#1d4ed8' },
                      { label: 'Completed', value: rptData.totals.completed, color: '#16a34a' },
                      { label: 'Pending', value: rptData.totals.pending, color: '#b45309' },
                      { label: 'Approved', value: rptData.totals.approved, color: '#7c3aed' },
                      { label: 'Rejected', value: rptData.totals.rejected, color: '#b91c1c' },
                      { label: 'Rate', value: `${rptData.totals.rate}%`, color: '#be185d' },
                    ].map((s) => (
                      <Col key={s.label} xs={6} md={2}>
                        <div className="text-center p-2 rounded-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: 10, color: '#6b7280' }}>{s.label}</div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                  {rptData.chart?.length > 0 && (
                    <div className="mb-3">
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                        {rptDateMode === 'weekly' ? 'Weekly' : 'Monthly'} Trend
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={rptData.chart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                          <Bar dataKey="completed" name="Completed" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {rptData.serviceBreakdown?.length > 0 && (
                    <div className="mb-3">
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Service Breakdown</div>
                      <div className="d-flex flex-wrap gap-2">
                        {rptData.serviceBreakdown.map(s => (
                          <span key={s.name} className="d-flex align-items-center gap-1 px-2 py-1 rounded-2"
                            style={{ fontSize: 11, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontWeight: 600, color: '#374151' }}>{s.name}</span>
                            <Badge pill style={{ fontSize: 10, background: '#3b82f6', color: '#fff' }}>{s.value}</Badge>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    All Appointments ({rptData.appointments.length})
                  </div>
                  <div className="table-responsive-wrapper" style={{ maxHeight: 200, overflowY: 'auto' }}>
                    <Table hover size="sm" className="mb-0 align-middle">
                      <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
                        <tr style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>
                          <th className="px-3 py-2">Date</th><th className="py-2">Patient</th><th className="py-2">Service</th><th className="py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: 12 }}>
                        {rptData.appointments.slice(0, 20).map(a => (
                          <tr key={a.id}>
                            <td className="px-3 py-2" style={{ color: '#6b7280' }}>{a.date}</td>
                            <td className="py-2" style={{ color: '#111827', fontWeight: 500 }}>{a.name}</td>
                            <td className="py-2" style={{ color: '#6b7280' }}>{a.service}</td>
                            <td className="py-2"><StatusBadge status={a.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </>
              )}

              {/* Health Records Report Stats */}
              {reportModal === 'health-records' && (
                <>
                  <Row className="g-2 mb-3">
                    {[
                      { label: 'Total Records', value: rptData.totals.total, color: '#b45309' },
                      { label: 'Closed', value: rptData.totals.closed, color: '#16a34a' },
                      { label: 'Open/Active', value: rptData.totals.open, color: '#3b82f6' },
                    ].map((s) => (
                      <Col key={s.label} xs={12} md={4}>
                        <div className="text-center p-3 rounded-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>{s.label}</div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                  {rptData.chart?.length > 0 && (
                    <div className="mb-3">
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                        {rptDateMode === 'weekly' ? 'Weekly' : 'Monthly'} Records Trend
                      </div>
                      <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={rptData.chart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gHR" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Area type="monotone" dataKey="records" name="Records" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gHR)" dot={{ r: 3, fill: '#f59e0b' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {rptData.typeBreakdown?.length > 0 && (
                    <div className="mb-3">
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Record Types</div>
                      <div className="d-flex flex-wrap gap-2">
                        {rptData.typeBreakdown.map(t => (
                          <span key={t.name} className="d-flex align-items-center gap-1 px-2 py-1 rounded-2"
                            style={{ fontSize: 11, background: '#fef3c7', border: '1px solid #fde68a' }}>
                            <span style={{ fontWeight: 600, color: '#92400e' }}>{t.name}</span>
                            <Badge pill style={{ fontSize: 10, background: '#b45309', color: '#fff' }}>{t.value}</Badge>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    All Health Records ({rptData.healthRecords.length})
                  </div>
                  <div className="table-responsive-wrapper" style={{ maxHeight: 200, overflowY: 'auto' }}>
                    <Table hover size="sm" className="mb-0 align-middle">
                      <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
                        <tr style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>
                          <th className="px-3 py-2">Date</th><th className="py-2">Patient</th><th className="py-2">Type</th><th className="py-2">Diagnosis</th><th className="py-2">Doctor</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: 12 }}>
                        {rptData.healthRecords.slice(0, 20).map(r => (
                          <tr key={r.id}>
                            <td className="px-3 py-2" style={{ color: '#6b7280' }}>{r.date}</td>
                            <td className="py-2" style={{ color: '#111827', fontWeight: 500 }}>{r.patient}</td>
                            <td className="py-2" style={{ color: '#6b7280' }}>{r.type}</td>
                            <td className="py-2" style={{ color: '#374151', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.diagnosis}</td>
                            <td className="py-2" style={{ color: '#6b7280' }}>{r.doctor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </>
              )}
            </>
          )}

          {!rptData && !rptLoading && (
            <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: 200, color: '#9ca3af' }}>
              <Calendar size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>Select a date range and click Generate Report</div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #f1f5f9' }}>
          <Button variant="light" size="sm" onClick={() => setReportModal(null)} className="rounded-3">Close</Button>
          <Button size="sm" onClick={() => window.print()} variant="outline-secondary" className="rounded-3 d-flex align-items-center gap-1" disabled={!rptData}>
            <Printer size={14} /> Print
          </Button>
          <Button size="sm" onClick={exportReportPDF}
            className="rounded-3 d-flex align-items-center gap-1 border-0" disabled={!rptData}
            style={{ background: '#dc2626' }}>
            <FileDown size={14} /> PDF
          </Button>
          <Button size="sm" onClick={exportReport}
            className="rounded-3 d-flex align-items-center gap-1 border-0" disabled={!rptData}
            style={{ background: '#0f172a' }}>
            <FileSpreadsheet size={14} /> Excel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Reports;
