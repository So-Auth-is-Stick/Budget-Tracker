export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Sunday-to-Saturday week containing the given date
export function getWeekRange(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 = Sunday
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const toStr = (x) => x.toISOString().slice(0, 10);
  return { start: toStr(start), end: toStr(end) };
}