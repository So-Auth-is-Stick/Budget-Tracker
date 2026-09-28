export function prevMonthOf(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function getWeekRange(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay();
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - day);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const toStr = (x) => x.toISOString().slice(0, 10);
  return { start: toStr(start), end: toStr(end) };
}

export function monthOf(dateStr) {
  return dateStr.slice(0, 7);
}

export function daysUntil(dateStr) {
  const target = new Date(dateStr + 'T00:00:00Z');
  const today = new Date(todayStr() + 'T00:00:00Z');
  return Math.round((target - today) / 86400000);
}