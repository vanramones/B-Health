import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Table, Badge, Dropdown, Modal, Spinner, Form } from 'react-bootstrap';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Download, FileText, TrendingUp, Activity, Syringe, Printer,
  FileSpreadsheet, File, Calendar, CheckCircle2, ArrowUpRight,
  ArrowDownRight, BarChart3, RefreshCw, Loader, FileDown, Search, Filter, X, History, Eye,
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { appointmentCode, healthRecordCode } from '../../utils/recordCodes';
import { formatName, nameSortKey, nameColumns, nameFields, NAME_HEADERS } from '../../utils/nameFormat';
import {
  ORG, periodText, dateTimeText, makeReportNo, buildReportPdf, savePdf, printPdf, addSheet, saveWorkbook,
} from '../../utils/reportDocument';
import * as XLSX from 'xlsx';

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
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

/* ── Report status / grouping helpers ── */
const APPT_STATUSES = ['pending', 'approved', 'completed', 'rejected', 'cancelled'];
const HR_STATUSES = ['ongoing', 'follow-up', 'closed'];
const STATUS_COLORS = {
  pending: '#f59e0b', approved: '#3b82f6', completed: '#16a34a', rejected: '#dc2626', cancelled: '#94a3b8',
  ongoing: '#ef4444', 'follow-up': '#f97316', closed: '#0ea5e9',
};
const statusLabel = (s) => (s === 'follow-up' ? 'Follow-up' : cap(s));
const REPORT_TITLES = { overall: 'Overall Health Center Report', appointments: 'Appointments Report', 'health-records': 'Health Records Report' };
const BAR_PALETTE = ['#16a34a', '#3b82f6', '#f59e0b', '#ec4899', '#a855f7', '#0ea5e9', '#ef4444', '#64748b'];
const withPct = (items) => {
  const total = items.reduce((s, i) => s + i.value, 0);
  return items.map((i) => ({ ...i, pct: total ? Math.round((i.value / total) * 1000) / 10 : 0 }));
};
const countBy = (list, key) => withPct(Object.entries(list.reduce((m, x) => {
  const k = x[key] || 'Other'; m[k] = (m[k] || 0) + 1; return m;
}, {})).map(([label, value]) => ({ key: label, label, value })).sort((a, b) => b.value - a.value)
  .map((x, i) => ({ ...x, color: BAR_PALETTE[i % BAR_PALETTE.length] })));
const statusCounts = (list, statuses) => withPct(statuses.map((s) => ({
  key: s, label: statusLabel(s), value: list.filter((x) => x.status === s).length, color: STATUS_COLORS[s],
})));
const periodOf = (dateStr, mode) => {
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  if (mode === 'monthly') {
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` };
  }
  const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return { key: mon.toISOString().slice(0, 10), label: `Wk of ${MONTH_NAMES[mon.getMonth()]} ${mon.getDate()}` };
};
const HISTORY_KEY = 'bh_report_history';
const loadHistory = () => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; } };
const HISTORY_STATUS = {
  Generated: { bg: '#eff6ff', color: '#1d4ed8' },
  Printed: { bg: '#f5f3ff', color: '#6d28d9' },
  'Exported (PDF)': { bg: '#fef2f2', color: '#b91c1c' },
  'Exported (Excel)': { bg: '#f0fdf4', color: '#15803d' },
};

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
    cancelled: { bg: '#f1f5f9', color: '#475569' },
    ongoing: { bg: '#fee2e2', color: '#b91c1c' },
    'follow-up': { bg: '#ffedd5', color: '#c2410c' },
    closed: { bg: '#e0f2fe', color: '#0369a1' },
  };
  const s = styles[status] || { bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
      fontSize: 10, fontWeight: 600, backgroundColor: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {statusLabel(status)}
    </span>
  );
};

/* ── Generated-report building blocks ── */
const SectionTitle = ({ num, children, right }) => (
  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
    <div className="d-flex align-items-center gap-2" style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
      <span style={{ width: 4, height: 16, borderRadius: 2, background: '#059669', display: 'inline-block' }} />
      {num && <span style={{ color: '#059669' }}>{num}.</span>} {children}
    </div>
    {right}
  </div>
);

const Panel = ({ children, className = 'mb-3' }) => (
  <div className={`p-3 rounded-3 ${className}`} style={{ background: '#fff', border: '1px solid #e2e8f0' }}>{children}</div>
);

const KpiCards = ({ items }) => (
  <Row className="g-2 mb-3">
    {items.map((k) => (
      <Col key={k.label} xs={6} md>
        <div className="text-center p-2 rounded-3 h-100" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: k.color, lineHeight: 1.2 }}>{k.value}</div>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{k.label}</div>
        </div>
      </Col>
    ))}
  </Row>
);

const StatusDonut = ({ title, items }) => {
  const total = items.reduce((s, i) => s + i.value, 0);
  const data = items.filter((i) => i.value > 0);
  return (
    <div className="h-100">
      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>{title}</div>
      <div className="d-flex align-items-center gap-3">
        <div style={{ width: 130, height: 130, position: 'relative', flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.length ? data : [{ label: 'None', value: 1, color: '#e2e8f0' }]} dataKey="value" nameKey="label"
                innerRadius={40} outerRadius={60} paddingAngle={data.length > 1 ? 2 : 0} stroke="none">
                {(data.length ? data : [{ color: '#e2e8f0' }]).map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              {data.length > 0 && <Tooltip formatter={(val, name) => [`${val}`, name]} />}
            </PieChart>
          </ResponsiveContainer>
          <div className="position-absolute top-50 start-50 translate-middle text-center" style={{ pointerEvents: 'none' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{total}</div>
            <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>TOTAL</div>
          </div>
        </div>
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          {items.map((i) => (
            <div key={i.key} className="d-flex align-items-center gap-2" style={{ fontSize: 11, marginBottom: 3 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: i.color, flexShrink: 0 }} />
              <span style={{ color: '#374151', flex: 1 }}>{i.label}</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{i.value}</span>
              <span style={{ color: '#94a3b8', width: 40, textAlign: 'right' }}>{i.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PercentTable = ({ firstCol, items }) => {
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <Table size="sm" className="mb-0 align-middle" style={{ fontSize: 12 }}>
      <thead style={{ backgroundColor: '#f9fafb' }}>
        <tr style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>
          <th className="px-3 py-2">{firstCol}</th><th className="py-2 text-end">Count</th>
          <th className="py-2" style={{ width: '45%' }}>Distribution</th><th className="py-2 text-end pe-3">%</th>
        </tr>
      </thead>
      <tbody>
        {items.map((i) => (
          <tr key={i.key}>
            <td className="px-3 py-2"><span className="d-inline-flex align-items-center gap-2">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: i.color }} />{i.label}</span></td>
            <td className="py-2 text-end fw-bold">{i.value}</td>
            <td className="py-2"><div style={{ height: 6, borderRadius: 3, background: '#f1f5f9' }}>
              <div style={{ width: `${i.pct}%`, height: '100%', borderRadius: 3, background: i.color }} /></div></td>
            <td className="py-2 text-end pe-3" style={{ color: '#64748b' }}>{i.pct}%</td>
          </tr>
        ))}
        {!items.length && <tr><td colSpan={4} className="text-center py-3" style={{ color: '#9ca3af' }}>No data.</td></tr>}
      </tbody>
      <tfoot>
        <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
          <td className="px-3 py-2">TOTAL</td><td className="py-2 text-end">{total}</td><td />
          <td className="py-2 text-end pe-3">{total ? '100%' : '0%'}</td>
        </tr>
      </tfoot>
    </Table>
  );
};

/* ════════════════ Main Component ════════════════ */
const Reports = () => {
  const navigate = useNavigate();
  const openHealthRecord = (id) => {
    if (id) navigate(`/admin/health-records?record=${id}`);
  };
  const [viewAppt, setViewAppt] = useState(null);
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
  const [rptStatus, setRptStatus] = useState('all');
  const [rptCategory, setRptCategory] = useState('all');
  const [rptSearch, setRptSearch] = useState('');
  const [rptSort, setRptSort] = useState('date');
  const [rptLoading, setRptLoading] = useState(false);
  const [history, setHistory] = useState(loadHistory);
  const { user } = useAuth();
  const preparedBy = user?.full_name || user?.name || user?.username || 'Administrator';

  /* ── Filtered + summarized view of the generated report ── */
  const rptView = useMemo(() => {
    if (!rptData) return null;
    const kind = rptData.kind;
    const q = rptSearch.trim().toLowerCase();
    const matchQ = (name, code) => !q || formatName(name).toLowerCase().includes(q)
      || String(name || '').toLowerCase().includes(q) || code.toLowerCase().includes(q);
    const order = (list, key) => [...list].sort(rptSort === 'name'
      ? (a, b) => nameSortKey(a[key]).localeCompare(nameSortKey(b[key])) || String(a.date).localeCompare(String(b.date))
      : (a, b) => String(a.date).localeCompare(String(b.date)));
    const useApptFilters = kind === 'appointments';
    const useHrFilters = kind === 'health-records';

    const appts = order((rptData.appointments || []).filter((a) => matchQ(a.name, appointmentCode(a))
      && (!useApptFilters || rptStatus === 'all' || a.status === rptStatus)
      && (!useApptFilters || rptCategory === 'all' || a.service === rptCategory)), 'name');
    const hrs = order((rptData.healthRecords || []).filter((r) => matchQ(r.patient, healthRecordCode(r))
      && (!useHrFilters || rptStatus === 'all' || r.status === rptStatus)
      && (!useHrFilters || rptCategory === 'all' || r.type === rptCategory)), 'patient');

    const trendMap = {};
    const bump = (date, field) => {
      if (!date) return;
      const { key, label } = periodOf(date, rptData.mode);
      trendMap[key] = trendMap[key] || { key, label, appointments: 0, completed: 0, records: 0 };
      trendMap[key][field] += 1;
    };
    appts.forEach((a) => { bump(a.date, 'appointments'); if (a.status === 'completed') bump(a.date, 'completed'); });
    hrs.forEach((r) => bump(r.date, 'records'));

    const apptStatus = statusCounts(appts, APPT_STATUSES);
    const hrStatus = statusCounts(hrs, HR_STATUSES);
    const services = countBy(appts, 'service');
    const types = countBy(hrs, 'type');
    const completed = appts.filter((a) => a.status === 'completed').length;
    const rate = appts.length ? Math.round((completed / appts.length) * 1000) / 10 : 0;
    const followUps = hrs.filter((r) => r.status === 'follow-up').length;
    const patients = new Set([...appts.map((a) => nameSortKey(a.name)), ...hrs.map((r) => nameSortKey(r.patient))].filter(Boolean)).size;
    const get = (arr, k) => arr.find((x) => x.key === k)?.value || 0;

    const kpis = kind === 'appointments' ? [
      { label: 'Total Appointments', value: appts.length, color: '#1d4ed8' },
      { label: 'Completed', value: completed, color: '#16a34a' },
      { label: 'Pending', value: get(apptStatus, 'pending'), color: '#b45309' },
      { label: 'Completion Rate', value: `${rate}%`, color: '#be185d' },
      { label: 'Patients Served', value: patients, color: '#7c3aed' },
    ] : kind === 'health-records' ? [
      { label: 'Total Records', value: hrs.length, color: '#1d4ed8' },
      { label: 'Ongoing', value: get(hrStatus, 'ongoing'), color: '#dc2626' },
      { label: 'Follow-up', value: followUps, color: '#ea580c' },
      { label: 'Closed', value: get(hrStatus, 'closed'), color: '#0284c7' },
      { label: 'Patients', value: patients, color: '#7c3aed' },
    ] : [
      { label: 'Appointments', value: appts.length, color: '#1d4ed8' },
      { label: 'Completed', value: completed, color: '#16a34a' },
      { label: 'Completion Rate', value: `${rate}%`, color: '#be185d' },
      { label: 'Health Records', value: hrs.length, color: '#0284c7' },
      { label: 'For Follow-up', value: followUps, color: '#ea580c' },
      { label: 'Patients', value: patients, color: '#7c3aed' },
    ];

    // Narrative summary of findings
    const period = periodText(rptData.start, rptData.end);
    const topSvc = services[0]; const topType = types[0];
    const lines = [];
    if (kind !== 'health-records') {
      lines.push(appts.length
        ? `From ${period}, the health center recorded ${appts.length} appointment${appts.length === 1 ? '' : 's'}, of which ${completed} ${completed === 1 ? 'was' : 'were'} completed (${rate}% completion rate), ${get(apptStatus, 'pending')} pending, ${get(apptStatus, 'approved')} approved, ${get(apptStatus, 'rejected')} rejected and ${get(apptStatus, 'cancelled')} cancelled.${topSvc ? ` The most availed service was ${topSvc.label} (${topSvc.value}, ${topSvc.pct}%).` : ''}`
        : `No appointments were recorded from ${period} for the selected filters.`);
    }
    if (kind !== 'appointments') {
      lines.push(hrs.length
        ? `${kind === 'overall' ? 'A total of' : `From ${period}, a total of`} ${hrs.length} health record${hrs.length === 1 ? ' was' : 's were'} documented: ${get(hrStatus, 'ongoing')} ongoing, ${followUps} for follow-up and ${get(hrStatus, 'closed')} closed.${topType ? ` Most records were ${topType.label} (${topType.value}).` : ''}`
        : `No health records were documented from ${period} for the selected filters.`);
    }
    lines.push(`${patients} unique patient${patients === 1 ? '' : 's'} ${patients === 1 ? 'is' : 'are'} included in this report.`);

    const filterParts = [];
    if (rptSearch.trim()) filterParts.push(`Search: "${rptSearch.trim()}"`);
    if (rptStatus !== 'all' && kind !== 'overall') filterParts.push(`Status: ${statusLabel(rptStatus)}`);
    if (rptCategory !== 'all' && kind !== 'overall') filterParts.push(`${kind === 'appointments' ? 'Service' : 'Type'}: ${rptCategory}`);
    filterParts.push(`Sorted by ${rptSort === 'name' ? 'patient name (A–Z)' : 'date'}`);

    return {
      kind, appts, hrs, apptStatus, hrStatus, services, types, kpis, completed, rate, followUps, patients,
      summary: lines.join(' '),
      trend: Object.values(trendMap).sort((a, b) => a.key.localeCompare(b.key)),
      meta: {
        title: `${rptData.mode === 'weekly' ? 'Weekly' : 'Monthly'} ${REPORT_TITLES[kind]}`,
        period, reportNo: rptData.reportNo, generatedAt: rptData.generatedAt, preparedBy,
        filters: filterParts.join('; '),
      },
    };
  }, [rptData, rptSearch, rptSort, rptStatus, rptCategory, preparedBy]);

  const updateHistory = useCallback((reportNo, patch) => {
    setHistory((list) => {
      const next = patch === null
        ? list.filter((h) => h.reportNo !== reportNo)
        : list.map((h) => (h.reportNo === reportNo ? { ...h, ...patch } : h));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

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
      'Date': a.date || '', 'Time': a.time || '', ...nameFields(a.name),
      'Service': a.service || '', 'Status': a.status || '',
      'Handled By': a.handled_by || '', 'Notes': a.notes || '',
    }));
    if (apptRows.length === 0) apptRows.push({ 'Date': 'No records', 'Time': '', 'Last Name': '', 'First Name': '', 'Middle Name': '', 'Service': '', 'Status': '', 'Handled By': '', 'Notes': '' });
    const ws2 = XLSX.utils.json_to_sheet(apptRows);
    ws2['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Appointments');

    /* --- Sheet 3: All Vaccinations --- */
    const filteredVacc = selectedService === 'all'
      ? vaccinations
      : vaccinations.filter(v => v.vaccine?.toLowerCase().includes(selectedService.toLowerCase().split(' ')[0]));
    const vaccRows = filteredVacc.map(v => ({
      'Date': v.date || '', ...nameFields(v.patient), 'Vaccine': v.vaccine || '',
      'Dose': v.dose || '', 'Status': v.status || '',
      'Administered By': v.administered_by || '', 'Site': v.site || '', 'Notes': v.notes || '',
    }));
    if (vaccRows.length === 0) vaccRows.push({ 'Date': 'No records', 'Last Name': '', 'First Name': '', 'Middle Name': '', 'Vaccine': '', 'Dose': '', 'Status': '', 'Administered By': '', 'Site': '', 'Notes': '' });
    const ws3 = XLSX.utils.json_to_sheet(vaccRows);
    ws3['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 24 }];
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

  /* ── Official report metadata (heading) for ad-hoc exports ── */
  const quickMeta = (title, start, end, filters, kind = 'service') => {
    const now = new Date();
    const iso = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d);
    return { title, period: periodText(iso(start), iso(end)), reportNo: makeReportNo(kind, now), generatedAt: now, preparedBy, filters };
  };

  /* ── Main page PDF export ── */
  const handleExportPDF = async () => {
    const svcLabel = selectedService === 'all' ? 'All Services' : selectedService;
    const meta = quickMeta(`${cap(dateMode)} Health Center Analytics Report`, startDate, endDate, `Service: ${svcLabel}`);
    const sections = [
      { type: 'subtitle', text: 'Summary' },
      { type: 'stats', items: [
        { label: 'Total Appointments', value: totals.totalAppointments },
        { label: 'Completed', value: totals.totalCompleted },
        { label: 'Pending', value: totals.totalPending },
        { label: 'Completion Rate', value: `${totals.completionRate}%` },
      ]},
      { type: 'subtitle', text: 'Appointments' },
      { type: 'table', headers: ['Date', 'Time', ...NAME_HEADERS, 'Service', 'Status', 'Handled By'],
        rows: filteredAppointments.slice(0, 200).map(a => [a.date, a.time || '', ...nameColumns(a.name), a.service || '', statusLabel(a.status), a.handled_by || '']) },
      { type: 'subtitle', text: 'Service Breakdown' },
      { type: 'table', headers: ['Service', 'Count', 'Percentage'],
        rows: serviceBreakdown.map(s => [s.name, String(s.value), `${s.pct}%`]) },
    ];
    savePdf(await buildReportPdf(meta, sections), meta);
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
  const resetReportFilters = () => { setRptStatus('all'); setRptCategory('all'); setRptSearch(''); setRptSort('date'); };
  const openReportModal = (type) => {
    const d = new Date(); d.setMonth(d.getMonth() - 3); d.setDate(1);
    setReportModal(type);
    setRptDateMode('monthly');
    setRptStartDate(d);
    setRptEndDate(new Date());
    setRptData(null);
    resetReportFilters();
    setRptLoading(false);
  };

  /* ── Generate separate report (also reused to re-open a report from history) ── */
  const generateReport = async (opts = {}) => {
    const kind = opts.kind || reportModal;
    const start = opts.start || rptStartDate?.toISOString().slice(0, 10);
    const end = opts.end || rptEndDate?.toISOString().slice(0, 10);
    const mode = opts.mode || rptDateMode;
    if (!kind || !start || !end) return;
    setRptLoading(true);
    try {
      const [apptRes, hrRes] = await Promise.all([
        kind !== 'health-records'
          ? supabase.from('appointments').select('id, name, date, time, status, service, handled_by, notes')
            .is('deleted_at', null).gte('date', start).lte('date', end).order('date', { ascending: true })
          : { data: [] },
        kind !== 'appointments'
          ? supabase.from('health_records').select('id, patient, type, diagnosis, doctor, date, status, notes, prescription')
            .is('deleted_at', null).gte('date', start).lte('date', end).order('date', { ascending: true })
          : { data: [] },
      ]);
      const generatedAt = new Date();
      const reportNo = opts.reportNo || makeReportNo(kind, generatedAt);
      const appointments = apptRes.data || [];
      const healthRecords = hrRes.data || [];
      setRptData({ kind, mode, start, end, reportNo, generatedAt: generatedAt.toISOString(), appointments, healthRecords });
      if (!opts.reportNo) {
        const entry = {
          reportNo, kind, mode, start, end, preparedBy, status: 'Generated',
          title: `${mode === 'weekly' ? 'Weekly' : 'Monthly'} ${REPORT_TITLES[kind]}`,
          records: appointments.length + healthRecords.length, generatedAt: generatedAt.toISOString(),
        };
        setHistory((list) => {
          const next = [entry, ...list].slice(0, 30);
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
          return next;
        });
      }
    } catch (err) {
      console.error('Report generation error:', err);
    } finally {
      setRptLoading(false);
    }
  };

  const reopenReport = (h) => {
    setReportModal(h.kind);
    setRptDateMode(h.mode);
    setRptStartDate(new Date(`${h.start}T00:00:00`));
    setRptEndDate(new Date(`${h.end}T00:00:00`));
    setRptData(null);
    resetReportFilters();
    generateReport({ kind: h.kind, start: h.start, end: h.end, mode: h.mode, reportNo: h.reportNo });
  };

  /* ── Row builders shared by screen, PDF and Excel ── */
  const apptPdfRows = (list) => list.map((a) => [appointmentCode(a), a.date, a.time || '', ...nameColumns(a.name), a.service || '', statusLabel(a.status), a.handled_by || '']);
  const hrPdfRows = (list) => list.map((r) => [healthRecordCode(r), r.date, ...nameColumns(r.patient), r.type || '', r.diagnosis || '', statusLabel(r.status)]);
  const pctRows = (items) => items.map((s) => [s.label, String(s.value), `${s.pct}%`]);
  const pctFoot = (items, label = 'TOTAL') => [label, String(items.reduce((s, i) => s + i.value, 0)), items.length ? '100%' : '0%'];

  const reportSections = (v) => {
    const sections = [
      { type: 'subtitle', text: 'I. Summary Report' },
      { type: 'paragraph', text: v.summary },
      { type: 'stats', items: v.kpis },
    ];
    let n = 1;
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
    const sub = (text) => { n += 1; sections.push({ type: 'subtitle', text: `${roman[n - 1]}. ${text}` }); };
    if (v.kind !== 'health-records') {
      sub('Report Status – Appointments');
      sections.push({ type: 'bars', items: v.apptStatus });
      sections.push({ type: 'table', headers: ['Status', 'Count', 'Percentage'], rows: pctRows(v.apptStatus), foot: pctFoot(v.apptStatus) });
    }
    if (v.kind !== 'appointments') {
      sub('Report Status – Health Records');
      sections.push({ type: 'bars', items: v.hrStatus });
      sections.push({ type: 'table', headers: ['Status', 'Count', 'Percentage'], rows: pctRows(v.hrStatus), foot: pctFoot(v.hrStatus) });
    }
    if (v.kind !== 'health-records' && v.services.length) {
      sub('Service Breakdown');
      sections.push({ type: 'table', headers: ['Service', 'Count', 'Percentage'], rows: pctRows(v.services), foot: pctFoot(v.services) });
    }
    if (v.kind !== 'appointments' && v.types.length) {
      sub('Record Type Breakdown');
      sections.push({ type: 'table', headers: ['Record Type', 'Count', 'Percentage'], rows: pctRows(v.types), foot: pctFoot(v.types) });
    }
    if (v.kind !== 'health-records') {
      sub(`List of Appointments (${v.appts.length})`);
      sections.push({ type: 'table', headers: ['Appt. No.', 'Date', 'Time', ...NAME_HEADERS, 'Service', 'Status', 'Handled By'], rows: apptPdfRows(v.appts) });
    }
    if (v.kind !== 'appointments') {
      sub(`List of Health Records (${v.hrs.length})`);
      sections.push({ type: 'table', headers: ['Record No.', 'Date', ...NAME_HEADERS, 'Type', 'Diagnosis', 'Status'], rows: hrPdfRows(v.hrs) });
    }
    return sections;
  };

  /* ── Export separate report as Excel ── */
  const exportReport = () => {
    if (!rptView) return;
    const v = rptView;
    const wb = XLSX.utils.book_new();
    const summary = [
      { Item: 'Summary of Findings', Value: v.summary },
      ...v.kpis.map((k) => ({ Item: k.label, Value: k.value })),
    ];
    addSheet(wb, 'Summary', v.meta, summary, [26, 90], 'Summary Report');
    const statusRows = [
      ...(v.kind !== 'health-records' ? v.apptStatus.map((s) => ({ Category: 'Appointments', Status: s.label, Count: s.value, Percentage: `${s.pct}%` })) : []),
      ...(v.kind !== 'appointments' ? v.hrStatus.map((s) => ({ Category: 'Health Records', Status: s.label, Count: s.value, Percentage: `${s.pct}%` })) : []),
    ];
    addSheet(wb, 'Report Status', v.meta, statusRows, [18, 14, 10, 12]);
    if (v.kind !== 'health-records') {
      addSheet(wb, 'Appointments', v.meta, v.appts.map((a) => ({
        'Appt. No.': appointmentCode(a), Date: a.date, Time: a.time || '', ...nameFields(a.name),
        Service: a.service || '', Status: statusLabel(a.status), 'Handled By': a.handled_by || '', Notes: a.notes || '',
      })), [16, 12, 9, 16, 16, 14, 20, 12, 16, 40]);
      addSheet(wb, 'Service Breakdown', v.meta, v.services.map((s) => ({ Service: s.label, Count: s.value, Percentage: `${s.pct}%` })), [26, 10, 12]);
    }
    if (v.kind !== 'appointments') {
      addSheet(wb, 'Health Records', v.meta, v.hrs.map((r) => ({
        'Record No.': healthRecordCode(r), Date: r.date, ...nameFields(r.patient), Type: r.type || '',
        Diagnosis: r.diagnosis || '', Doctor: r.doctor || '', Status: statusLabel(r.status),
        Prescription: typeof r.prescription === 'string' ? r.prescription : '', Notes: r.notes || '',
      })), [16, 12, 16, 16, 14, 14, 32, 16, 12, 20, 40]);
      addSheet(wb, 'Type Breakdown', v.meta, v.types.map((t) => ({ 'Record Type': t.label, Count: t.value, Percentage: `${t.pct}%` })), [22, 10, 12]);
    }
    saveWorkbook(wb, v.meta);
    updateHistory(v.meta.reportNo, { status: 'Exported (Excel)' });
  };

  /* ── PDF export / print for separate reports ── */
  const exportReportPDF = async () => {
    if (!rptView) return;
    savePdf(await buildReportPdf(rptView.meta, reportSections(rptView)), rptView.meta);
    updateHistory(rptView.meta.reportNo, { status: 'Exported (PDF)' });
  };
  const printReport = async () => {
    if (!rptView) return;
    const v = rptView;
    await printPdf(v.meta, () => buildReportPdf(v.meta, reportSections(v)));
    updateHistory(v.meta.reportNo, { status: 'Printed' });
  };

  /* ── PDF export for per-service report ── */
  const exportSvcReportPDF = async () => {
    if (!svcReportData || !svcModal) return;
    const { totals: t, dateRange } = svcReportData;
    const meta = quickMeta(`${cap(svcDateMode)} ${svcModal.name} Service Report`, dateRange.start, dateRange.end, `Service: ${svcModal.name}`);
    const sections = [
      { type: 'subtitle', text: 'Summary' },
      { type: 'stats', items: [
        { label: 'Total', value: t.total },
        { label: 'Completed', value: t.completed },
        { label: 'Pending', value: t.pending },
        { label: 'Approved', value: t.approved },
        { label: 'Rate', value: `${t.rate}%` },
      ]},
      { type: 'subtitle', text: 'Appointments' },
      { type: 'table', headers: ['Date', 'Time', ...NAME_HEADERS, 'Status', 'Handled By'],
        rows: svcReportData.appointments.slice(0, 200).map(a => [a.date, a.time || '', ...nameColumns(a.name), statusLabel(a.status), a.handled_by || '']) },
    ];
    if (svcReportData.vaccinations.length) {
      sections.push({ type: 'subtitle', text: 'Vaccinations' });
      sections.push({ type: 'table', headers: ['Date', ...NAME_HEADERS, 'Vaccine', 'Dose', 'Status'],
        rows: svcReportData.vaccinations.map(v => [v.date, ...nameColumns(v.patient), v.vaccine || '', v.dose || '', v.status || '']) });
    }
    savePdf(await buildReportPdf(meta, sections), meta);
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
      'Date': a.date || '', 'Time': a.time || '', ...nameFields(a.name),
      'Status': a.status || '', 'Handled By': a.handled_by || '', 'Notes': a.notes || '',
    }));
    if (apptRows.length === 0) apptRows.push({ 'Date': 'No records', 'Time': '', 'Last Name': '', 'First Name': '', 'Middle Name': '', 'Status': '', 'Handled By': '', 'Notes': '' });
    const ws2 = XLSX.utils.json_to_sheet(apptRows);
    ws2['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Appointments');

    // Sheet 3: Vaccinations
    const vaccRows = vaccs.map(v => ({
      'Date': v.date || '', ...nameFields(v.patient), 'Vaccine': v.vaccine || '',
      'Dose': v.dose || '', 'Status': v.status || '', 'Administered By': v.administered_by || '',
    }));
    if (vaccRows.length === 0) vaccRows.push({ 'Date': 'No records', 'Last Name': '', 'First Name': '', 'Middle Name': '', 'Vaccine': '', 'Dose': '', 'Status': '', 'Administered By': '' });
    const ws3 = XLSX.utils.json_to_sheet(vaccRows);
    ws3['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 16 }];
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
              <div className="bh-dp-wrapper bh-dp-main">
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

      {/* ── Report History ── */}
      <Card className="border-0 rounded-4 bh-fade-up"
        style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', animationDelay: '0.2s' }}>
        <Card.Body className="p-0">
          <div className="p-4 pb-3 d-flex flex-wrap gap-2 justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <History size={18} color="#059669" />
              <div>
                <div className="fw-bold" style={{ fontSize: 15, color: '#111827' }}>Report History</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  {history.length} generated report{history.length === 1 ? '' : 's'} &bull; status updates when a report is printed or exported
                </div>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-1">
              {Object.entries(HISTORY_STATUS).map(([label, c]) => (
                <span key={label} style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: c.bg, color: c.color }}>
                  {label}: {history.filter((h) => h.status === label).length}
                </span>
              ))}
            </div>
          </div>
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th className="px-4 py-3 border-0">Report</th>
                  <th className="py-3 border-0">Period Covered</th>
                  <th className="py-3 border-0">Records</th>
                  <th className="py-3 border-0">Generated</th>
                  <th className="py-3 border-0">Status</th>
                  <th className="py-3 text-end pe-4 border-0">Action</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: 13 }}>
                {history.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-4" style={{ color: '#9ca3af', fontSize: 12 }}>
                    No reports generated yet. Open the Overall, Appointments or Health Records report above and click Generate Report.
                  </td></tr>
                )}
                {history.map((h) => {
                  const st = HISTORY_STATUS[h.status] || HISTORY_STATUS.Generated;
                  return (
                    <tr key={h.reportNo}>
                      <td className="px-4 py-3">
                        <div className="d-flex align-items-center gap-3">
                          <div className="d-flex align-items-center justify-content-center rounded-3"
                            style={{ width: 36, height: 36, flexShrink: 0, background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#047857' }}>
                            <FileText size={16} />
                          </div>
                          <div>
                            <div className="fw-semibold" style={{ color: '#111827' }}>{h.title}</div>
                            <div style={{ fontSize: 11, color: '#047857', fontWeight: 700, fontFamily: 'ui-monospace, Consolas, monospace' }}>{h.reportNo}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3" style={{ color: '#6b7280', fontSize: 12 }}>{periodText(h.start, h.end)}</td>
                      <td className="py-3" style={{ color: '#374151', fontSize: 12, fontWeight: 600 }}>{h.records}</td>
                      <td className="py-3" style={{ color: '#6b7280', fontSize: 12 }}>
                        {dateTimeText(h.generatedAt)}
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>by {h.preparedBy}</div>
                      </td>
                      <td className="py-3">
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>
                          {h.status}
                        </span>
                      </td>
                      <td className="py-3 text-end pe-4" style={{ whiteSpace: 'nowrap' }}>
                        <Button size="sm" variant="light" className="border-0 d-inline-flex align-items-center gap-1 rounded-3 me-1"
                          style={{ background: '#f0fdf4', padding: '6px 12px' }} onClick={() => reopenReport(h)}>
                          <Eye size={13} color="#16a34a" />
                          <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Open</span>
                        </Button>
                        <Button size="sm" variant="light" className="border-0 rounded-3 p-1 px-2" title="Remove from history"
                          onClick={() => updateHistory(h.reportNo, null)}>
                          <X size={14} color="#dc2626" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* ── Preview Modal ── */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} centered size="lg" fullscreen="md-down">
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
      <Modal show={!!svcModal} onHide={() => setSvcModal(null)} centered size="lg" fullscreen="md-down">
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
              <div className="table-responsive" style={{ maxHeight: 200, overflowY: 'auto' }}>
                <Table hover size="sm" className="mb-0 align-middle">
                  <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
                    <tr style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>
                      <th className="px-3 py-2">Date</th>
                      <th className="py-2">Last Name</th><th className="py-2">First Name</th><th className="py-2">Middle Name</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 d-none d-sm-table-cell">Handled By</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: 12 }}>
                    {svcReportData.appointments.slice(0, 20).map((a) => (
                      <tr key={a.id} onClick={() => setViewAppt(a)} style={{ cursor: 'pointer' }} title="View appointment details">
                        <td className="px-3 py-2" style={{ color: '#6b7280' }}>{a.date}</td>
                        <td className="py-2" style={{ color: '#111827', fontWeight: 600 }}>{nameColumns(a.name)[0]}</td><td className="py-2" style={{ color: '#111827' }}>{nameColumns(a.name)[1]}</td><td className="py-2" style={{ color: '#6b7280' }}>{nameColumns(a.name)[2]}</td>
                        <td className="py-2"><StatusBadge status={a.status} /></td>
                        <td className="py-2 d-none d-sm-table-cell" style={{ color: '#6b7280' }}>{a.handled_by || '-'}</td>
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
      <Modal show={!!reportModal} onHide={() => setReportModal(null)} centered size="lg" fullscreen="md-down">
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
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{rptView ? `${rptView.meta.reportNo} · ${rptView.meta.period}` : 'Select date range and generate report'}</div>
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
                <button onClick={() => generateReport()}
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
          {rptLoading && !rptData && (
            <div className="d-flex align-items-center justify-content-center gap-2 py-5" style={{ color: '#64748b', fontSize: 13 }}>
              <Spinner size="sm" animation="border" /> Generating report...
            </div>
          )}
          {rptView && (() => {
            const v = rptView;
            const totalRows = v.kind === 'appointments' ? rptData.appointments.length
              : v.kind === 'health-records' ? rptData.healthRecords.length
                : rptData.appointments.length + rptData.healthRecords.length;
            const shownRows = v.kind === 'appointments' ? v.appts.length
              : v.kind === 'health-records' ? v.hrs.length : v.appts.length + v.hrs.length;
            const statusOptions = v.kind === 'appointments' ? APPT_STATUSES : HR_STATUSES;
            const categoryOptions = [...new Set((v.kind === 'appointments' ? rptData.appointments.map((a) => a.service) : rptData.healthRecords.map((r) => r.type)).filter(Boolean))].sort();
            const filtersActive = rptSearch.trim() || rptStatus !== 'all' || rptCategory !== 'all' || rptSort !== 'date';
            const trendBars = v.kind === 'appointments'
              ? [['appointments', 'Appointments', '#3b82f6'], ['completed', 'Completed', '#16a34a']]
              : v.kind === 'health-records' ? [['records', 'Health Records', '#f59e0b']]
                : [['appointments', 'Appointments', '#3b82f6'], ['completed', 'Completed', '#16a34a'], ['records', 'Health Records', '#f59e0b']];
            let sec = 0;
            const num = () => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][sec++];
            return (
              <>
                {/* ── Official report heading ── */}
                <div className="rounded-3 mb-3" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
                  <div className="d-flex align-items-center gap-3 px-3 py-3" style={{ borderBottom: '3px solid #059669' }}>
                    <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                      style={{ width: 46, height: 46, background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                      <Activity size={24} color="#fff" />
                    </div>
                    <div className="flex-grow-1 text-center">
                      <div style={{ fontSize: 11, color: '#475569' }}>{ORG.country}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em' }}>{ORG.office}</div>
                      <div style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>{ORG.system}</div>
                    </div>
                    <div style={{ width: 46 }} className="d-none d-md-block" />
                  </div>
                  <div className="text-center px-3 pt-3">
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{v.meta.title}</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Period Covered: <strong>{v.meta.period}</strong></div>
                  </div>
                  <Row className="g-0 m-3 rounded-2 overflow-hidden" style={{ border: '1px solid #e2e8f0', fontSize: 11 }}>
                    {[
                      ['Report No.', v.meta.reportNo],
                      ['Date Generated', dateTimeText(v.meta.generatedAt)],
                      ['Prepared by', v.meta.preparedBy],
                      ['Filters Applied', v.meta.filters],
                    ].map(([label, value]) => (
                      <Col key={label} xs={12} md={6} className="d-flex" style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <div className="px-2 py-1 fw-bold flex-shrink-0" style={{ width: 110, background: '#f8fafc', color: '#475569' }}>{label}</div>
                        <div className="px-2 py-1" style={{ color: '#0f172a' }}>{value}</div>
                      </Col>
                    ))}
                  </Row>
                </div>

                {/* ── Filtering ── */}
                <div className="p-3 rounded-3 mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                    <div className="d-flex align-items-center gap-2" style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                      <Filter size={15} /> Filter Report
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Showing {shownRows} of {totalRows} records</span>
                    </div>
                    {filtersActive && (
                      <button onClick={resetReportFilters} className="border-0 bg-transparent d-flex align-items-center gap-1 p-0"
                        style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                        <X size={13} /> Clear filters
                      </button>
                    )}
                  </div>
                  <Row className="g-2">
                    <Col xs={12} md={v.kind === 'overall' ? 8 : 5}>
                      <div className="position-relative">
                        <Search size={14} color="#94a3b8" className="position-absolute" style={{ left: 10, top: 9 }} />
                        <Form.Control size="sm" value={rptSearch} onChange={(e) => setRptSearch(e.target.value)}
                          placeholder={`Search patient name or ${v.kind === 'health-records' ? 'HR' : v.kind === 'appointments' ? 'APT' : 'APT / HR'} no.`}
                          style={{ fontSize: 12, paddingLeft: 30, borderRadius: 8 }} />
                      </div>
                    </Col>
                    {v.kind !== 'overall' && (
                      <>
                        <Col xs={6} md={2}>
                          <Form.Select size="sm" value={rptStatus} onChange={(e) => setRptStatus(e.target.value)} style={{ fontSize: 12, borderRadius: 8 }}>
                            <option value="all">All Statuses</option>
                            {statusOptions.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                          </Form.Select>
                        </Col>
                        <Col xs={6} md={2}>
                          <Form.Select size="sm" value={rptCategory} onChange={(e) => setRptCategory(e.target.value)} style={{ fontSize: 12, borderRadius: 8 }}>
                            <option value="all">{v.kind === 'appointments' ? 'All Services' : 'All Types'}</option>
                            {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                          </Form.Select>
                        </Col>
                      </>
                    )}
                    <Col xs={12} md={v.kind === 'overall' ? 4 : 3}>
                      <Form.Select size="sm" value={rptSort} onChange={(e) => setRptSort(e.target.value)} style={{ fontSize: 12, borderRadius: 8 }}>
                        <option value="date">Sort by Date</option>
                        <option value="name">Sort by Patient Name (A–Z)</option>
                      </Form.Select>
                    </Col>
                  </Row>
                </div>

                {/* ── Summary Report ── */}
                <Panel>
                  <SectionTitle num={num()}>Summary Report</SectionTitle>
                  <p className="mb-0" style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.6, textAlign: 'justify' }}>{v.summary}</p>
                </Panel>

                {/* ── Report Dashboard ── */}
                <Panel>
                  <SectionTitle num={num()}>Report Dashboard</SectionTitle>
                  <KpiCards items={v.kpis} />
                  <Row className="g-3 mb-2">
                    {v.kind !== 'health-records' && (
                      <Col xs={12} md={v.kind === 'overall' ? 6 : 5}><StatusDonut title="Appointment Status" items={v.apptStatus} /></Col>
                    )}
                    {v.kind !== 'appointments' && (
                      <Col xs={12} md={v.kind === 'overall' ? 6 : 5}><StatusDonut title="Health Record Status" items={v.hrStatus} /></Col>
                    )}
                    <Col xs={12} md={v.kind === 'overall' ? 12 : 7}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                        {rptData.mode === 'weekly' ? 'Weekly' : 'Monthly'} Trend
                      </div>
                      {v.trend.length ? (
                        <ResponsiveContainer width="100%" height={150}>
                          <BarChart data={v.trend} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} />
                            {trendBars.map(([key, name, color]) => (
                              <Bar key={key} dataKey={key} name={name} fill={color} radius={[4, 4, 0, 0]} maxBarSize={22} />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="d-flex align-items-center justify-content-center" style={{ height: 150, fontSize: 12, color: '#9ca3af' }}>No data for the selected filters.</div>
                      )}
                    </Col>
                  </Row>
                  <Row className="g-3">
                    {v.kind !== 'health-records' && (
                      <Col xs={12} md={v.kind === 'overall' ? 6 : 12}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Service Breakdown</div>
                        <PercentTable firstCol="Service" items={v.services} />
                      </Col>
                    )}
                    {v.kind !== 'appointments' && (
                      <Col xs={12} md={v.kind === 'overall' ? 6 : 12}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Record Type Breakdown</div>
                        <PercentTable firstCol="Record Type" items={v.types} />
                      </Col>
                    )}
                  </Row>
                </Panel>

                {/* ── Report Status ── */}
                <Panel>
                  <SectionTitle num={num()}>Report Status</SectionTitle>
                  <Row className="g-3">
                    {v.kind !== 'health-records' && (
                      <Col xs={12} md={v.kind === 'overall' ? 6 : 12}>
                        {v.kind === 'overall' && <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Appointments</div>}
                        <PercentTable firstCol="Appointment Status" items={v.apptStatus} />
                      </Col>
                    )}
                    {v.kind !== 'appointments' && (
                      <Col xs={12} md={v.kind === 'overall' ? 6 : 12}>
                        {v.kind === 'overall' && <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Health Records</div>}
                        <PercentTable firstCol="Health Record Status" items={v.hrStatus} />
                      </Col>
                    )}
                  </Row>
                </Panel>

                {/* ── Lists ── */}
                {v.kind !== 'health-records' && (
                  <Panel>
                    <SectionTitle num={num()} right={<span style={{ fontSize: 11, color: '#94a3b8' }}>Click a row to view details</span>}>
                      List of Appointments ({v.appts.length})
                    </SectionTitle>
                    <div className="table-responsive" style={{ maxHeight: 280, overflowY: 'auto' }}>
                      <Table hover size="sm" className="mb-0 align-middle">
                        <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
                          <tr style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>
                            <th className="px-3 py-2">Appt. No.</th><th className="py-2">Date</th><th className="py-2">Last Name</th><th className="py-2">First Name</th><th className="py-2">Middle Name</th>
                            <th className="py-2">Service</th><th className="py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody style={{ fontSize: 12 }}>
                          {v.appts.map((a) => (
                            <tr key={a.id} onClick={() => setViewAppt(a)} style={{ cursor: 'pointer' }} title="View appointment details">
                              <td className="px-3 py-2" style={{ color: '#047857', fontWeight: 700, fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 11 }}>{appointmentCode(a)}</td>
                              <td className="py-2" style={{ color: '#6b7280', whiteSpace: 'nowrap' }}>{a.date}</td>
                              <td className="py-2" style={{ color: '#111827', fontWeight: 600 }}>{nameColumns(a.name)[0]}</td><td className="py-2" style={{ color: '#111827' }}>{nameColumns(a.name)[1]}</td><td className="py-2" style={{ color: '#6b7280' }}>{nameColumns(a.name)[2]}</td>
                              <td className="py-2" style={{ color: '#6b7280' }}>{a.service}</td>
                              <td className="py-2"><StatusBadge status={a.status} /></td>
                            </tr>
                          ))}
                          {!v.appts.length && <tr><td colSpan={7} className="text-center py-3" style={{ color: '#9ca3af' }}>No appointments match the selected filters.</td></tr>}
                        </tbody>
                      </Table>
                    </div>
                  </Panel>
                )}
                {v.kind !== 'appointments' && (
                  <Panel className="mb-0">
                    <SectionTitle num={num()} right={<span style={{ fontSize: 11, color: '#94a3b8' }}>Click a row to open the record</span>}>
                      List of Health Records ({v.hrs.length})
                    </SectionTitle>
                    <div className="table-responsive" style={{ maxHeight: 280, overflowY: 'auto' }}>
                      <Table hover size="sm" className="mb-0 align-middle">
                        <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
                          <tr style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>
                            <th className="px-3 py-2">Record No.</th><th className="py-2">Date</th><th className="py-2">Last Name</th><th className="py-2">First Name</th><th className="py-2">Middle Name</th>
                            <th className="py-2">Type</th><th className="py-2">Diagnosis</th><th className="py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody style={{ fontSize: 12 }}>
                          {v.hrs.map((r) => (
                            <tr key={r.id} onClick={() => openHealthRecord(r.id)} style={{ cursor: 'pointer' }} title="Open health record">
                              <td className="px-3 py-2" style={{ color: '#047857', fontWeight: 700, fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 11 }}>{healthRecordCode(r)}</td>
                              <td className="py-2" style={{ color: '#6b7280', whiteSpace: 'nowrap' }}>{r.date}</td>
                              <td className="py-2" style={{ color: '#111827', fontWeight: 600 }}>{nameColumns(r.patient)[0]}</td><td className="py-2" style={{ color: '#111827' }}>{nameColumns(r.patient)[1]}</td><td className="py-2" style={{ color: '#6b7280' }}>{nameColumns(r.patient)[2]}</td>
                              <td className="py-2" style={{ color: '#6b7280' }}>{r.type}</td>
                              <td className="py-2" style={{ color: '#374151', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.diagnosis}</td>
                              <td className="py-2"><StatusBadge status={r.status} /></td>
                            </tr>
                          ))}
                          {!v.hrs.length && <tr><td colSpan={8} className="text-center py-3" style={{ color: '#9ca3af' }}>No health records match the selected filters.</td></tr>}
                        </tbody>
                      </Table>
                    </div>
                  </Panel>
                )}
              </>
            );
          })()}

          {!rptData && !rptLoading && (
            <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: 200, color: '#9ca3af' }}>
              <Calendar size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>Select a date range and click Generate Report</div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #f1f5f9' }}>
          <Button variant="light" size="sm" onClick={() => setReportModal(null)} className="rounded-3">Close</Button>
          <Button size="sm" onClick={printReport} variant="outline-secondary" className="rounded-3 d-flex align-items-center gap-1" disabled={!rptView}>
            <Printer size={14} /> Print
          </Button>
          <Button size="sm" onClick={exportReportPDF}
            className="rounded-3 d-flex align-items-center gap-1 border-0" disabled={!rptView}
            style={{ background: '#dc2626' }}>
            <FileDown size={14} /> PDF
          </Button>
          <Button size="sm" onClick={exportReport}
            className="rounded-3 d-flex align-items-center gap-1 border-0" disabled={!rptView}
            style={{ background: '#0f172a' }}>
            <FileSpreadsheet size={14} /> Excel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Appointment detail (view only) */}
      <Modal show={!!viewAppt} onHide={() => setViewAppt(null)} centered
        style={{ zIndex: 1065 }} backdropClassName="bh-stacked-backdrop">
        <Modal.Header closeButton style={{ borderBottom: '1px solid #f1f5f9' }}>
          <Modal.Title className="d-flex align-items-center gap-2" style={{ fontSize: 16, fontWeight: 700 }}>
            <Calendar size={18} color="#10b981" /> Appointment Details
          </Modal.Title>
        </Modal.Header>
        {viewAppt && (
          <Modal.Body className="p-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{formatName(viewAppt.name) || '—'}</div>
                <div style={{ fontSize: 12, color: '#047857', fontWeight: 700, fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace' }}>{appointmentCode(viewAppt)}</div>
              </div>
              <StatusBadge status={viewAppt.status} />
            </div>
            <Row className="g-2">
              {[
                ['Service', viewAppt.service],
                ['Date', viewAppt.date ? new Date(`${viewAppt.date}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''],
                ['Time', (() => {
                  const m = String(viewAppt.time || '').match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
                  return m ? `${Number(m[1]) % 12 || 12}:${m[2]} ${Number(m[1]) >= 12 ? 'PM' : 'AM'}` : viewAppt.time;
                })()],
                ['Handled By', viewAppt.handled_by],
              ].map(([label, value]) => (
                <Col xs={6} key={label}>
                  <div className="p-2 rounded-3 h-100" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{value || '—'}</div>
                  </div>
                </Col>
              ))}
            </Row>
            <div className="mt-3">
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Notes</div>
              <div className="p-2 rounded-3" style={{ background: '#fefce8', border: '1px solid #fde68a', fontSize: 12, color: '#713f12', whiteSpace: 'pre-wrap' }}>
                {viewAppt.notes || 'No notes.'}
              </div>
            </div>
          </Modal.Body>
        )}
        <Modal.Footer style={{ borderTop: '1px solid #f1f5f9' }}>
          <Button size="sm" variant="secondary" onClick={() => setViewAppt(null)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Reports;
