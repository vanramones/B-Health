import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../config/supabase';
import { healthRecordCode, patientCode, appointmentCode } from './recordCodes';
import { splitName } from './nameFormat';

const STATUS_LABEL = { ongoing: 'Ongoing Treatment', 'follow-up': 'For Follow-up', closed: 'Closed / Completed' };
const APPT_STATUS = { pending: 'Pending', approved: 'Approved', completed: 'Completed', rejected: 'Rejected', cancelled: 'Cancelled' };
const NA = 'Not provided';
const GREEN = [5, 150, 105];
const INK = [15, 23, 42];
const MUTED = [100, 116, 139];
const BLANK = '______________';

const val = (v) => (v === null || v === undefined || String(v).trim() === '' ? NA : String(v).trim());
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const fmtDate = (d) => {
  if (!d) return NA;
  const date = new Date(String(d).length === 10 ? `${d}T00:00:00` : d);
  return isNaN(date) ? String(d) : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const fmtStamp = (d) => {
  if (!d) return NA;
  const date = new Date(d);
  return isNaN(date) ? String(d) : date.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
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

// Splits the notes field into reschedule history, follow-up instruction, system notes and real remarks
const parseNotes = (notes) => {
  const history = [];
  const free = [];
  const system = [];
  let followUp = null;
  String(notes || '').split(/\n+/).map((l) => l.trim()).filter(Boolean).forEach((line) => {
    const m = line.match(/^\[RESCHEDULED by ([^\]]+)\]\s*Appointment moved from (.+?) to (.+?)\.?$/i);
    if (m) {
      if (m[2].trim() !== m[3].trim()) history.push([fmtDateTime(m[2]), fmtDateTime(m[3]), m[1].trim()]);
      return;
    }
    if (line.startsWith('[FOLLOW-UP]')) {
      const text = line.replace('[FOLLOW-UP]', '').trim();
      const when = text.match(/on ([A-Z][a-z]+, [A-Z][a-z]+ \d{1,2}, \d{4})/);
      followUp = { text, date: when ? when[1] : null };
      return;
    }
    if (/^auto-generated/i.test(line)) { system.push(line); return; }
    free.push(line);
  });
  return { history, free: free.join('\n'), system: system.join('\n'), followUp };
};

const fetchContext = async (record) => {
  try {
    const name = (record.patient || '').trim();
    const [userRes, apptRes, visitsRes, allApptsRes] = await Promise.all([
      supabase.from('users')
        .select('id, created_at, full_name, phone, purok, email, birthdate, gender, blood_type, civil_status, occupation, philhealth_no, emergency_name, emergency_relationship, emergency_phone')
        .ilike('full_name', name).limit(1),
      record.date
        ? supabase.from('appointments').select('id, service, date, time, status, handled_by, notes, created_at')
          .ilike('name', name).eq('date', record.date).is('deleted_at', null)
          .order('updated_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from('health_records').select('id, date, type, diagnosis, status, doctor')
        .ilike('patient', name).is('deleted_at', null).order('date', { ascending: false }),
      supabase.from('appointments').select('id, status').ilike('name', name).is('deleted_at', null),
    ]);
    const appts = apptRes.data || [];
    return {
      user: userRes.data?.[0] || null,
      appt: appts.find((a) => a.status === 'completed') || appts[0] || null,
      visits: visitsRes.data || [],
      allAppts: allApptsRes.data || [],
    };
  } catch {
    return { user: null, appt: null, visits: [], allAppts: [] };
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
export const loadLogo = () => {
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

const buildHealthRecordPdf = (record, { logo, user, appt, visits = [], allAppts = [] } = {}) => {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageW - margin * 2;
  const recordNo = healthRecordCode(record);
  const issued = new Date();

  // ── Letterhead ──
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageW, 32, 'F');
  const textX = logo ? margin + 23 : margin;
  if (logo) doc.addImage(logo, 'PNG', margin, 7, 18, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text('Republic of the Philippines', textX, 11);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text('BARANGAY HEALTH CENTER', textX, 18);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text('B-Health: Barangay Digital Health System', textX, 24);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('RECORD NO.', pageW - margin, 12, { align: 'right' });
  doc.setFontSize(12);
  doc.text(recordNo, pageW - margin, 18.5, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(`Date issued: ${fmtDate(issued.toISOString().slice(0, 10))}`, pageW - margin, 24, { align: 'right' });

  // ── Title ──
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text('PATIENT HEALTH RECORD', pageW / 2, 42, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
  doc.text('Individual Treatment Record (ITR)', pageW / 2, 47, { align: 'center' });
  doc.setDrawColor(...GREEN); doc.setLineWidth(0.6);
  doc.line(pageW / 2 - 32, 49.5, pageW / 2 + 32, 49.5);
  doc.setLineWidth(0.2);

  let section = 0;
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  const sectionHead = (title, y, minSpace = 30) => {
    let top = y;
    if (top + minSpace > pageH - 20) { doc.addPage(); top = 18; }
    doc.setFillColor(...GREEN);
    doc.rect(margin, top, contentW, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.text(`${ROMAN[section++]}. ${title}`, margin + 3, top + 4.8);
    return top + 7;
  };

  const tableStyle = {
    theme: 'grid',
    margin: { left: margin, right: margin, top: 18, bottom: 20 },
    styles: { fontSize: 9, textColor: INK, cellPadding: { top: 1.6, bottom: 1.6, left: 3, right: 3 }, lineColor: [203, 213, 225], lineWidth: 0.2 },
  };
  const labelCol = { fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252] };
  const grid = (rows, startY, labelW = 34) => {
    autoTable(doc, {
      ...tableStyle, startY, body: rows,
      columnStyles: {
        0: { ...labelCol, cellWidth: labelW }, 1: { cellWidth: contentW / 2 - labelW },
        2: { ...labelCol, cellWidth: labelW }, 3: { cellWidth: contentW / 2 - labelW },
      },
    });
    return doc.lastAutoTable.finalY + 5;
  };
  const pairs = (rows, startY, labelW = 52) => {
    autoTable(doc, { ...tableStyle, startY, body: rows, columnStyles: { 0: { ...labelCol, cellWidth: labelW } } });
    return doc.lastAutoTable.finalY + 5;
  };
  const listTable = (head, body, startY, empty) => {
    autoTable(doc, {
      ...tableStyle, startY, head: [head],
      body: body.length ? body : [[empty, ...head.slice(1).map(() => '')]],
      headStyles: { fillColor: [241, 245, 249], textColor: INK, fontStyle: 'bold', fontSize: 8.5 },
      styles: { ...tableStyle.styles, fontSize: 8.5 },
    });
    return doc.lastAutoTable.finalY + 5;
  };

  const name = splitName(record.patient || user?.full_name);
  const age = ageAt(user?.birthdate, record.date);
  const notes = parseNotes(record.notes);
  const service = appt?.service || record.type;
  const staff = record.doctor || appt?.handled_by || '';

  // ── I. Patient Information ──
  let y = sectionHead('PATIENT INFORMATION', 54);
  y = grid([
    ['Last Name', val(name.last), 'Patient ID', user ? patientCode(user) : NA],
    ['First Name', val([name.first, name.suffix].filter(Boolean).join(' ')), 'Date Registered', user?.created_at ? fmtDate(user.created_at) : NA],
    ['Middle Name', val(name.middle), 'Date of Birth', user?.birthdate ? fmtDate(user.birthdate) : NA],
    ['Age', age !== null ? `${age} years old` : NA, 'Sex', val(cap(user?.gender))],
    ['Civil Status', val(cap(user?.civil_status)), 'Blood Type', val(user?.blood_type)],
    ['Occupation', val(user?.occupation), 'PhilHealth No.', val(user?.philhealth_no)],
    ['Address', user?.purok ? `${user.purok}, Barangay` : NA, 'Contact No.', fmtPhone(user?.phone)],
    ['Email Address', val(user?.email), 'Emergency No.', fmtPhone(user?.emergency_phone)],
    ['Emergency Contact', user?.emergency_name
      ? `${user.emergency_name}${user.emergency_relationship ? ` (${user.emergency_relationship})` : ''}`
      : NA, 'Relationship', val(cap(user?.emergency_relationship))],
  ], y);

  // ── II. Consultation Details ──
  y = sectionHead('CONSULTATION DETAILS', y);
  y = grid([
    ['Date of Visit', fmtDate(record.date), 'Time', appt ? fmtTime(appt.time) : NA],
    ['Service Availed', val(service), 'Record Type', val(record.type)],
    ['Mode of Visit', appt ? 'Scheduled (B-Health app)' : 'Walk-in', 'Appointment Ref.', appt ? `${appointmentCode(appt)} (${APPT_STATUS[appt.status] || appt.status})` : 'None'],
    ['Attending Staff', val(staff), 'Date Booked', appt?.created_at ? fmtDate(appt.created_at) : NA],
  ], y);
  y = pairs([['Reason for Visit / Chief Complaint', appt?.notes?.trim() || `Availed ${val(service)} service at the health center.`]], y - 5);

  // ── III. Vital Signs (filled in by hand at the clinic) ──
  y = sectionHead('VITAL SIGNS & ANTHROPOMETRICS', y);
  y = grid([
    ['Blood Pressure', `${BLANK} mmHg`, 'Temperature', `${BLANK} °C`],
    ['Pulse Rate', `${BLANK} bpm`, 'Respiratory Rate', `${BLANK} cpm`],
    ['Weight', `${BLANK} kg`, 'Height', `${BLANK} cm`],
    ['BMI', `${BLANK} kg/m2`, 'O2 Saturation', `${BLANK} %`],
  ], y);
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
  doc.text('To be measured and filled in by the attending health staff during the visit.', margin, y - 2);
  y += 2;

  // ── IV. Assessment & Treatment ──
  const rx = typeof record.prescription === 'string' && record.prescription.trim() ? record.prescription.trim() : 'None prescribed';
  const plan = record.status === 'follow-up'
    ? `Patient advised to return for a follow-up check-up${notes.followUp?.date ? ` on ${notes.followUp.date}` : ''}.`
    : record.status === 'ongoing'
      ? 'Continue treatment and monitoring as advised by the attending health staff.'
      : notes.followUp
        ? 'Follow-up visit completed. Patient advised to return if symptoms recur or worsen.'
        : 'Consultation completed. Patient advised to return if symptoms recur or worsen.';
  y = sectionHead('ASSESSMENT & TREATMENT', y);
  y = pairs([
    ['Diagnosis / Findings', val(record.diagnosis)],
    ['Prescription / Medication', rx],
    ['Treatment Plan / Advice', plan],
    ['Treatment Status', STATUS_LABEL[record.status] || val(record.status)],
  ], y);

  // ── V. Follow-up ──
  if (record.status === 'follow-up' || notes.followUp) {
    y = sectionHead('FOLLOW-UP SCHEDULE', y);
    y = pairs([
      ['Follow-up Date', notes.followUp?.date || 'To be scheduled'],
      ['Follow-up Status', record.status === 'follow-up' ? 'Pending – patient has not yet returned' : 'Completed – patient has returned for follow-up'],
      ['Instructions', notes.followUp?.text || 'Please return to the Barangay Health Center for your follow-up check-up.'],
    ], y);
  }

  // ── VI. Clinical Notes ──
  y = sectionHead('CLINICAL NOTES / REMARKS', y);
  autoTable(doc, {
    ...tableStyle, startY: y,
    body: [[notes.free || 'No additional clinical remarks.']],
    styles: { ...tableStyle.styles, minCellHeight: 10, textColor: notes.free ? INK : MUTED },
  });
  y = doc.lastAutoTable.finalY + 5;

  // ── VII. Reschedule history ──
  if (notes.history.length) {
    y = sectionHead('APPOINTMENT SCHEDULE HISTORY', y);
    y = listTable(['Original Schedule', 'Rescheduled To', 'Rescheduled By'], notes.history, y, '');
  }

  // ── VIII. Patient visit history ──
  const previous = visits.filter((v) => v.id !== record.id);
  const doneAppts = allAppts.filter((a) => a.status === 'completed').length;
  y = sectionHead('PATIENT VISIT HISTORY', y);
  y = grid([
    ['Total Health Records', String(visits.length || 1), 'Appointments', `${allAppts.length} total, ${doneAppts} completed`],
    ['First Recorded Visit', fmtDate(visits[visits.length - 1]?.date || record.date), 'Latest Visit', fmtDate(visits[0]?.date || record.date)],
  ], y, 38);
  y = listTable(
    ['Record No.', 'Date', 'Type', 'Diagnosis / Findings', 'Status'],
    previous.slice(0, 8).map((v) => [healthRecordCode(v), fmtDate(v.date), v.type || '', v.diagnosis || '', STATUS_LABEL[v.status] || cap(v.status || '')]),
    y - 5,
    'No previous health records.',
  );
  if (previous.length > 8) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text(`Showing the 8 most recent of ${previous.length} previous records.`, margin, y - 2);
    y += 2;
  }

  // ── IX. Record information ──
  y = sectionHead('RECORD INFORMATION', y);
  y = grid([
    ['Record Created', fmtStamp(record.created_at), 'Last Updated', fmtStamp(record.updated_at || record.created_at)],
    ['Record Source', notes.system ? 'Auto-generated from completed appointment' : 'Encoded by health staff', 'Encoded by', val(staff)],
  ], y);

  // ── Certification + signatures ──
  if (y + 52 > pageH - 20) { doc.addPage(); y = 22; }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...INK);
  const cert = doc.splitTextToSize('This is to certify that the information contained in this record is true and correct based on the records of the Barangay Health Center. This document is issued upon request for whatever legal purpose it may serve.', contentW);
  doc.text(cert, margin, y + 2);
  const sigY = Math.max(y + cert.length * 4 + 20, pageH - 40);
  const sigW = (contentW - 12) / 3;
  [
    [name.first || name.last ? `${[name.first, name.middle && `${name.middle[0]}.`, name.last].filter(Boolean).join(' ')}` : '', 'Patient / Guardian'],
    [staff, 'Attending Health Staff'],
    ['', 'Barangay Health Officer / Midwife'],
  ].forEach(([who, role], i) => {
    const x = margin + i * (sigW + 6);
    doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    if (who) doc.text(String(who).toUpperCase(), x + sigW / 2, sigY - 2, { align: 'center' });
    doc.setDrawColor(100, 116, 139);
    doc.line(x, sigY, x + sigW, sigY);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text(role, x + sigW / 2, sigY + 4, { align: 'center' });
    doc.text('Signature over Printed Name', x + sigW / 2, sigY + 7.5, { align: 'center' });
  });

  // ── Footer on every page ──
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageH - 13, pageW - margin, pageH - 13);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
    doc.text(`Generated ${issued.toLocaleString('en-US')}  •  ${recordNo}  •  CONFIDENTIAL (RA 10173 Data Privacy Act)`, margin, pageH - 8.5);
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
