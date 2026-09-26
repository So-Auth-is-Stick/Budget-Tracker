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