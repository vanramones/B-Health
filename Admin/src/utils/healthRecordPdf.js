import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../config/supabase';
import { healthRecordCode, patientCode, appointmentCode } from './recordCodes';

const STATUS_LABEL = { ongoing: 'Ongoing Treatment', 'follow-up': 'For Follow-up', closed: 'Closed / Completed' };
const APPT_STATUS = { pending: 'Pending', approved: 'Approved', completed: 'Completed', rejected: 'Rejected', cancelled: 'Cancelled' };
const NA = 'Not provided';
const GREEN = [5, 150, 105];
const INK = [15, 23, 42];
const MUTED = [100, 116, 139];

const val = (v) => (v === null || v === undefined || String(v).trim() === '' ? NA : String(v).trim());
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const fmtDate = (d) => {
  if (!d) return NA;
  const date = new Date(String(d).length === 10 ? `${d}T00:00:00` : d);
  return isNaN(date) ? String(d) : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const fmtTime = (t) => {
  if (!t) return NA;
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!m) return String(t);
  if (m[3]) return `${Number(m[1])}:${m[2]} ${m[3].toUpperCase()}`;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
};

const fmtDateTime = (s) => {
  const [d, ...rest] = String(s).trim().split(/\s+/);
  return `${fmtDate(d)}, ${fmtTime(rest.join(' '))}`;
};

const fmtPhone = (p) => {
  const digits = String(p || '').replace(/\D/g, '');
  if (!digits) return NA;
  const local = digits.startsWith('63') ? `0${digits.slice(2)}` : digits.startsWith('0') ? digits : `0${digits}`;
  return local.length === 11 ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : local;
};

const ageAt = (birthdate, onDate) => {
  if (!birthdate) return null;
  const b = new Date(`${birthdate}T00:00:00`);
  const ref = onDate ? new Date(`${onDate}T00:00:00`) : new Date();
  if (isNaN(b)) return null;
  let age = ref.getFullYear() - b.getFullYear();
  if (ref < new Date(ref.getFullYear(), b.getMonth(), b.getDate())) age -= 1;
  return age >= 0 ? age : null;
};

const pad = (n, len = 5) => String(n ?? 0).padStart(len, '0');

const parseNotes = (notes) => {
  const history = [];
  const free = [];
  String(notes || '').split(/\n+/).map((l) => l.trim()).filter(Boolean).forEach((line) => {
    const m = line.match(/^\[RESCHEDULED by ([^\]]+)\]\s*Appointment moved from (.+?) to (.+?)\.?$/i);
    if (!m) { free.push(line); return; }
    if (m[2].trim() === m[3].trim()) return;
    history.push([fmtDateTime(m[2]), fmtDateTime(m[3]), m[1].trim()]);
  });
  return { history, free: free.join('\n') };
};

const fetchContext = async (record) => {
  try {
    const name = (record.patient || '').trim();
    const [userRes, apptRes] = await Promise.all([
      supabase.from('users')
        .select('id, created_at, full_name, phone, purok, email, birthdate, gender, blood_type, civil_status, occupation, philhealth_no, emergency_name, emergency_relationship, emergency_phone')
        .ilike('full_name', name).limit(1),
      record.date
        ? supabase.from('appointments').select('id, service, date, time, status, handled_by')
          .ilike('name', name).eq('date', record.date).is('deleted_at', null)
          .order('updated_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);
    const appts = apptRes.data || [];
    return {
      user: userRes.data?.[0] || null,
      appt: appts.find((a) => a.status === 'completed') || appts[0] || null,
    };
  } catch {
    return { user: null, appt: null };
  }
};

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="11" fill="#ffffff"/>
  <g transform="translate(12 12)" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>
  </g>
</svg>`;

let logoCache = null;
const loadLogo = () => {
  if (logoCache) return logoCache;
  logoCache = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      canvas.getContext('2d').drawImage(img, 0, 0, 256, 256);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { logoCache = null; resolve(null); };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(LOGO_SVG)}`;
  });
  return logoCache;
};

const buildHealthRecordPdf = (record, { logo, user, appt } = {}) => {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageW - margin * 2;
  const recordNo = healthRecordCode(record);

  // ── Letterhead ──
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageW, 32, 'F');
  const textX = logo ? margin + 23 : margin;
  if (logo) doc.addImage(logo, 'PNG', margin, 7, 18, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Republic of the Philippines', textX, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('BARANGAY HEALTH CENTER', textX, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('B-Health Barangay Health Center Digital System', textX, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('RECORD NO.', pageW - margin, 12, { align: 'right' });
  doc.setFontSize(12);
  doc.text(recordNo, pageW - margin, 18.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Date issued: ${fmtDate(new Date().toISOString().slice(0, 10))}`, pageW - margin, 24, { align: 'right' });

  // ── Title ──
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PATIENT HEALTH RECORD', pageW / 2, 43, { align: 'center' });
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.6);
  doc.line(pageW / 2 - 32, 46, pageW / 2 + 32, 46);
  doc.setLineWidth(0.2);

  const sectionHead = (title, y) => {
    doc.setFillColor(...GREEN);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(title, margin + 3, y + 4.8);
    return y + 7;
  };

  const tableStyle = {
    theme: 'grid',
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, textColor: INK, cellPadding: { top: 1.6, bottom: 1.6, left: 3, right: 3 }, lineColor: [203, 213, 225], lineWidth: 0.2 },
  };

  const labelCol = { fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252] };
  const grid = (rows, startY) => {
    autoTable(doc, {
      ...tableStyle,
      startY,
      body: rows,
      columnStyles: {
        0: { ...labelCol, cellWidth: 34 }, 1: { cellWidth: contentW / 2 - 34 },
        2: { ...labelCol, cellWidth: 34 }, 3: { cellWidth: contentW / 2 - 34 },
      },
    });
    return doc.lastAutoTable.finalY + 5;
  };

  const age = ageAt(user?.birthdate, record.date);
  const ageSex = [age !== null ? `${age} yrs old` : null, user?.gender ? cap(user.gender) : null].filter(Boolean).join(' / ') || NA;

  // ── I. Patient Information ──
  let y = sectionHead('I. PATIENT INFORMATION', 51);
  y = grid([
    ['Patient Name', val(record.patient), 'Patient ID', user ? patientCode(user) : NA],
    ['Date of Birth', user?.birthdate ? fmtDate(user.birthdate) : NA, 'Age / Sex', ageSex],
    ['Civil Status', val(cap(user?.civil_status)), 'Blood Type', val(user?.blood_type)],
    ['Address', user?.purok ? `${user.purok}, Barangay` : NA, 'Contact No.', fmtPhone(user?.phone)],
    ['Occupation', val(user?.occupation), 'PhilHealth No.', val(user?.philhealth_no)],
    ['Emergency Contact', user?.emergency_name
      ? `${user.emergency_name}${user.emergency_relationship ? ` (${user.emergency_relationship})` : ''}`
      : NA, 'Emergency No.', fmtPhone(user?.emergency_phone)],
  ], y);

  // ── II. Consultation Details ──
  y = sectionHead('II. CONSULTATION DETAILS', y);
  y = grid([
    ['Date of Visit', fmtDate(record.date), 'Time', appt ? fmtTime(appt.time) : NA],
    ['Service Availed', val(appt?.service || record.type), 'Record Type', val(record.type)],
    ['Attending Staff', val(record.doctor || appt?.handled_by), 'Appointment Ref.', appt ? `${appointmentCode(appt)} (${APPT_STATUS[appt.status] || appt.status})` : NA],
  ], y);

  // ── III. Assessment & Treatment ──
  const rx = typeof record.prescription === 'string' && record.prescription.trim() ? record.prescription.trim() : 'None prescribed';
  y = sectionHead('III. ASSESSMENT & TREATMENT', y);
  autoTable(doc, {
    ...tableStyle,
    startY: y,
    body: [
      ['Diagnosis / Findings', val(record.diagnosis)],
      ['Prescription / Medication', rx],
      ['Treatment Status', STATUS_LABEL[record.status] || val(record.status)],
    ],
    columnStyles: { 0: { ...labelCol, cellWidth: 48 } },
  });
  y = doc.lastAutoTable.finalY + 5;

  // ── IV. Clinical Notes ──
  const { history, free } = parseNotes(record.notes);
  y = sectionHead('IV. CLINICAL NOTES / REMARKS', y);
  autoTable(doc, {
    ...tableStyle,
    startY: y,
    body: [[free || 'No additional clinical remarks.']],
    styles: { ...tableStyle.styles, minCellHeight: 10, textColor: free ? INK : MUTED },
  });
  y = doc.lastAutoTable.finalY + 5;

  if (history.length) {
    y = sectionHead('V. APPOINTMENT SCHEDULE HISTORY', y);
    autoTable(doc, {
      ...tableStyle,
      startY: y,
      head: [['Original Schedule', 'Rescheduled To', 'Rescheduled By']],
      body: history,
      headStyles: { fillColor: [241, 245, 249], textColor: INK, fontStyle: 'bold' },
    });
    y = doc.lastAutoTable.finalY + 5;
  }

  // ── Signatures ──
  let sigY = Math.max(y + 16, pageH - 46);
  if (sigY > pageH - 24) { doc.addPage(); sigY = 50; }
  const sigW = 68;
  const sig = (x, name, role) => {
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    if (name) doc.text(name, x + sigW / 2, sigY - 2, { align: 'center' });
    doc.setDrawColor(100, 116, 139);
    doc.line(x, sigY, x + sigW, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(role, x + sigW / 2, sigY + 4.5, { align: 'center' });
  };
  sig(margin, record.doctor || appt?.handled_by || '', 'Attending Health Staff (Signature over Printed Name)');
  sig(pageW - margin - sigW, '', 'Barangay Health Officer / Midwife');

  // ── Footer on every page ──
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageH - 13, pageW - margin, pageH - 13);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated ${new Date().toLocaleString('en-US')}  •  ${recordNo}  •  CONFIDENTIAL (RA 10173 Data Privacy Act)`, margin, pageH - 8.5);
    doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 8.5, { align: 'right' });
  }

  return doc;
};

const fileName = (record) =>
  `Health-Record-${(record.patient || 'patient').replace(/[^a-z0-9]+/gi, '-')}-${record.id ?? ''}.pdf`;

const prepare = async (record) => {
  const [logo, ctx] = await Promise.all([loadLogo(), fetchContext(record)]);
  return buildHealthRecordPdf(record, { logo, ...ctx });
};

export const downloadHealthRecordPdf = async (record) => {
  (await prepare(record)).save(fileName(record));
};

export const printHealthRecordPdf = async (record) => {
  const win = window.open('', '_blank');
  const doc = await prepare(record);
  doc.autoPrint();
  if (win) win.location.href = doc.output('bloburl');
  else doc.save(fileName(record));
};
