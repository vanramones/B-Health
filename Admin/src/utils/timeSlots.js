export const TIME_SLOTS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
];

export const DEFAULT_SLOT_LIMIT = 5;

const parseSchedule = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) || {}; } catch { return {}; }
  }
  return raw;
};

// Capacity for one time slot: per-slot override, else the service's default, else 5. 0 = closed.
export const slotCapacity = (service, time) => {
  const sched = parseSchedule(service?.slot_schedule);
  const v = sched[time];
  if (v !== undefined && v !== null && v !== '' && Number(v) >= 0) return Number(v);
  return service?.slots_per_hour > 0 ? Number(service.slots_per_hour) : DEFAULT_SLOT_LIMIT;
};

export const capacityMap = (service) =>
  Object.fromEntries(TIME_SLOTS.map((t) => [t, slotCapacity(service, t)]));

export const ACTIVE_BOOKING = (a) => !a.deleted_at && !['cancelled', 'rejected'].includes(a.status);

// Remaining slots for one service on one date, given that day's appointments
export const availability = (service, appointments) => {
  const caps = capacityMap(service);
  const booked = {};
  (appointments || []).forEach((a) => {
    if (a.service === service?.name && ACTIVE_BOOKING(a)) booked[a.time] = (booked[a.time] || 0) + 1;
  });
  const times = Object.fromEntries(TIME_SLOTS.map((t) => [t, { cap: caps[t], booked: booked[t] || 0, left: Math.max(0, caps[t] - (booked[t] || 0)) }]));
  const capacity = Object.values(caps).reduce((s, n) => s + n, 0);
  const left = Object.values(times).reduce((s, x) => s + x.left, 0);
  return { capacity, left, booked: capacity - left, times };
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
