import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { loadLogo } from './healthRecordPdf';

export const ORG = {
  country: 'Republic of the Philippines',
  office: 'BARANGAY HEALTH CENTER',
  system: 'B-Health: Barangay Digital Health System',
};

const INK = [15, 23, 42];
const MUTED = [100, 116, 139];
const GREEN = [5, 150, 105];
const hex = (h) => [1, 3, 5].map((i) => parseInt(String(h || '#64748b').slice(i, i + 2), 16));

export const longDate = (iso) => (iso
  ? new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  : '');
export const periodText = (start, end) => `${longDate(start)} – ${longDate(end)}`;
export const dateTimeText = (d) => new Date(d).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export const makeReportNo = (kind, d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  const tag = { appointments: 'APT', 'health-records': 'HR', overall: 'OVR' }[kind] || 'SVC';
  return `RPT-${tag}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

/*
 * meta: { title, period, reportNo, generatedAt, preparedBy, filters }
 * sections: { type: 'subtitle' | 'info' | 'paragraph' | 'stats' | 'bars' | 'table', ... }
 */
export const buildReportPdf = async (meta, sections) => {
  const logo = await loadLogo();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14;
  const W = pageW - M * 2;

  // ── Letterhead ──
  if (logo) doc.addImage(logo, 'PNG', M, 9, 18, 18);
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(ORG.country, pageW / 2, 13, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text(ORG.office, pageW / 2, 19.5, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.setTextColor(...GREEN);
  doc.text(ORG.system, pageW / 2, 25, { align: 'center' });
  doc.setDrawColor(...GREEN); doc.setLineWidth(0.8);
  doc.line(M, 30, pageW - M, 30);
  doc.setLineWidth(0.2);

  // ── Title + period ──
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text(String(meta.title).toUpperCase(), pageW / 2, 39, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  doc.text(`Period Covered: ${meta.period}`, pageW / 2, 45, { align: 'center' });

  // ── Report details box ──
  const rows = [
    ['Report No.', meta.reportNo, 'Date Generated', dateTimeText(meta.generatedAt)],
    ['Prepared by', meta.preparedBy, 'Filters Applied', meta.filters || 'None'],
  ];
  autoTable(doc, {
    startY: 49, body: rows, theme: 'grid', margin: { left: M, right: M },
    styles: { fontSize: 8, cellPadding: 1.8, lineColor: [226, 232, 240], lineWidth: 0.2, textColor: INK },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 26 },
      1: { cellWidth: W / 2 - 26 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 28 },
    },
  });
  let y = doc.lastAutoTable.finalY + 8;
  const ensure = (h) => { if (y + h > pageH - 22) { doc.addPage(); y = 18; } };

  sections.forEach((sec) => {
    if (sec.type === 'subtitle') {
      ensure(14);
      doc.setFillColor(...GREEN);
      doc.rect(M, y - 4.5, 1.6, 6, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...INK);
      doc.text(sec.text, M + 4, y);
      y += 5;
    }
    if (sec.type === 'info') {
      ensure(6);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED);
      doc.text(sec.text, M, y);
      y += 5;
    }
    if (sec.type === 'paragraph') {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...INK);
      const lines = doc.splitTextToSize(sec.text, W);
      ensure(lines.length * 4.4 + 3);
      doc.text(lines, M, y + 1);
      y += lines.length * 4.4 + 4;
    }
    if (sec.type === 'stats') {
      ensure(24);
      const colW = W / sec.items.length;
      sec.items.forEach((item, i) => {
        const x = M + i * colW;
        doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, colW - 3, 19, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...hex(item.color || '#0f172a'));
        doc.text(String(item.value), x + (colW - 3) / 2, y + 9, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MUTED);
        doc.text(item.label, x + (colW - 3) / 2, y + 15, { align: 'center' });
      });
      y += 25;
    }
    if (sec.type === 'bars') {
      const max = Math.max(1, ...sec.items.map((b) => b.value));
      const labelW = 38; const barW = W - labelW - 30;
      ensure(sec.items.length * 7 + 4);
      sec.items.forEach((b) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...INK);
        doc.text(doc.splitTextToSize(b.label, labelW - 2)[0], M, y + 3.5);
        doc.setFillColor(241, 245, 249);
        doc.rect(M + labelW, y, barW, 5, 'F');
        if (b.value) { doc.setFillColor(...hex(b.color)); doc.rect(M + labelW, y, (barW * b.value) / max, 5, 'F'); }
        doc.setFont('helvetica', 'bold');
        doc.text(`${b.value} (${b.pct}%)`, M + labelW + barW + 3, y + 3.8);
        y += 7;
      });
      y += 3;
    }
    if (sec.type === 'table') {
      ensure(18);
      autoTable(doc, {
        startY: y, head: [sec.headers], body: sec.rows.length ? sec.rows : [['No records found for the selected filters.', ...sec.headers.slice(1).map(() => '')]],
        theme: 'grid', margin: { left: M, right: M, bottom: 22 },
        headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { cellPadding: 2.2, lineColor: [226, 232, 240], lineWidth: 0.2 },
        foot: sec.foot ? [sec.foot] : undefined,
        footStyles: { fillColor: [241, 245, 249], textColor: INK, fontStyle: 'bold', fontSize: 8 },
      });
      y = doc.lastAutoTable.finalY + 8;
    }
  });

  // ── Signatories ──
  ensure(34);
  y += 6;
  const colW = W / 2;
  [['Prepared by:', meta.preparedBy, 'Barangay Health Worker / Administrator'], ['Noted by:', '', 'Barangay Health Officer / Midwife']]
    .forEach(([label, name, role], i) => {
      const x = M + i * colW;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
      doc.text(label, x, y);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...INK);
      if (name) doc.text(String(name).toUpperCase(), x + (colW - 12) / 2, y + 13, { align: 'center' });
      doc.setDrawColor(...INK); doc.line(x, y + 15, x + colW - 12, y + 15);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED);
      doc.text(role, x + (colW - 12) / 2, y + 19.5, { align: 'center' });
    });

  // ── Footer ──
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240); doc.line(M, pageH - 13, pageW - M, pageH - 13);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MUTED);
    doc.text(`${ORG.system}  ·  ${meta.reportNo}`, M, pageH - 8.5);
    doc.text('CONFIDENTIAL – For official use only', pageW / 2, pageH - 8.5, { align: 'center' });
    doc.text(`Page ${i} of ${pages}`, pageW - M, pageH - 8.5, { align: 'right' });
  }
  return doc;
};

export const fileSafe = (s) => String(s).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');

export const savePdf = (doc, meta) => doc.save(`${fileSafe(meta.title)}-${meta.reportNo}.pdf`);

// Open the window synchronously (before any await) so pop-up blockers allow it.
export const printPdf = async (meta, buildDoc) => {
  const win = window.open('', '_blank');
  const doc = await buildDoc();
  doc.autoPrint();
  if (win) win.location.href = doc.output('bloburl');
  else savePdf(doc, meta);
};

/* ── Excel: every sheet starts with the official heading ── */
export const headingRows = (meta, sheetTitle) => [
  [ORG.country], [ORG.office], [ORG.system], [],
  [`${String(meta.title).toUpperCase()}${sheetTitle ? ` – ${sheetTitle.toUpperCase()}` : ''}`],
  ['Period Covered:', meta.period],
  ['Report No.:', meta.reportNo],
  ['Date Generated:', dateTimeText(meta.generatedAt)],
  ['Prepared by:', meta.preparedBy],
  ['Filters Applied:', meta.filters || 'None'],
  [],
];

export const addSheet = (wb, name, meta, rows, widths, sheetTitle = name) => {
  const head = headingRows(meta, sheetTitle);
  const ws = XLSX.utils.aoa_to_sheet(head);
  const cols = Math.max(2, rows[0] ? Object.keys(rows[0]).length : 2);
  XLSX.utils.sheet_add_json(ws, rows.length ? rows : [{ Result: 'No records found for the selected filters.' }], { origin: head.length });
  ws['!merges'] = [0, 1, 2, 4].map((r) => ({ s: { r, c: 0 }, e: { r, c: cols - 1 } }));
  ws['!cols'] = (widths || []).map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
};

export const saveWorkbook = (wb, meta) => XLSX.writeFile(wb, `${fileSafe(meta.title)}-${meta.reportNo}.xlsx`);
