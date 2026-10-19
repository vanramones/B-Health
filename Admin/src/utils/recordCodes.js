const pad = (n) => String(n ?? 0).padStart(5, '0');

const yearOf = (...dates) => {
  for (const d of dates) {
    const y = String(d || '').slice(0, 4);
    if (/^\d{4}$/.test(y)) return y;
  }
  return String(new Date().getFullYear());
};

export const healthRecordCode = (r) => (r?.id ? `HR-${yearOf(r.date, r.created_at)}-${pad(r.id)}` : '');

export const appointmentCode = (a) => (a?.id ? `APT-${yearOf(a.date, a.created_at)}-${pad(a.id)}` : '');

export const patientCode = (u) => (u?.id ? `PT-${yearOf(u.created_at)}-${pad(u.id)}` : '');
