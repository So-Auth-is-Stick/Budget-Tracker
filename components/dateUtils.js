const pad = (n) => String(n).padStart(2, '0');
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The phone's local calendar date. (toISOString() is UTC, which would make
// "today" flip at 8 AM in the Philippines instead of at midnight.)
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Sunday-to-Saturday week containing the date. Pure calendar math in UTC,
// so it never shifts by a day whatever the timezone.
export function getWeekRange(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - d.getUTCDay());
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const toStr = (x) => x.toISOString().slice(0, 10);
  return { start: toStr(start), end: toStr(end) };
}

export function monthOf(dateStr) {
  return dateStr.slice(0, 7);
}

export function prevMonthOf(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}

// positive = days remaining, negative = overdue, 0 = today
export function daysUntil(dateStr) {
  const target = new Date(dateStr + 'T00:00:00Z');
  const today = new Date(todayStr() + 'T00:00:00Z');
  return Math.round((target - today) / 86400000);
}

// "Mon, Oct 19"
export function formatLong(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return `${DOW[d.getUTCDay()]}, ${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
