// Numbers behind the Insights screen. Pure functions: no React, easy to test.
import { prevMonthOf } from './dateUtils';

const shiftDay = (ds, n) => { const d = new Date(ds + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export const daysInMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};
export const nextMonthOf = (month) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m, 1));
  return d.toISOString().slice(0, 7);
};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthLabel = (month) => `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function monthStats(transactions, month, today) {
  const inMonth = transactions.filter((tx) => tx.date.slice(0, 7) === month);
  const exp = inMonth.filter((tx) => tx.type === 'expense');
  const inc = inMonth.filter((tx) => tx.type === 'income');
  const spent = exp.reduce((s, tx) => s + tx.amount, 0);
  const earned = inc.reduce((s, tx) => s + tx.amount, 0);
  const dim = daysInMonth(month);
  const isCurrent = today.slice(0, 7) === month;
  const isFuture = month > today.slice(0, 7);
  const daysElapsed = isFuture ? 0 : isCurrent ? Number(today.slice(8, 10)) : dim;

  // spending per day of month
  const daily = Array.from({ length: dim }, () => 0);
  exp.forEach((tx) => { daily[Number(tx.date.slice(8, 10)) - 1] += tx.amount; });

  const avgPerDay = daysElapsed > 0 ? spent / daysElapsed : 0;
  const projected = isCurrent ? avgPerDay * dim : spent;

  const byCat = {};
  exp.forEach((tx) => { byCat[tx.category] = (byCat[tx.category] || 0) + tx.amount; });
  const byIncome = {};
  inc.forEach((tx) => { byIncome[tx.category] = (byIncome[tx.category] || 0) + tx.amount; });

  const biggest = [...exp].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const noSpendDays = daily.slice(0, daysElapsed).filter((v) => v === 0).length;

  return { month, spent, earned, net: earned - spent, savingsRate: earned > 0 ? (earned - spent) / earned : null,
    daily, dim, daysElapsed, avgPerDay, projected, byCat, byIncome, biggest, noSpendDays, isCurrent, count: inMonth.length };
}

// Average spend per weekday over the last `weeks` weeks (ending today)
export function weekdayPattern(transactions, today, weeks = 8) {
  const end = new Date(today + 'T00:00:00Z');
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - weeks * 7 + 1);
  const startStr = start.toISOString().slice(0, 10);
  const totals = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) counts[d.getUTCDay()]++;
  transactions.forEach((tx) => {
    if (tx.type !== 'expense' || tx.date < startStr || tx.date > today) return;
    totals[new Date(tx.date + 'T00:00:00Z').getUTCDay()] += tx.amount;
  });
  const avg = totals.map((v, i) => (counts[i] ? v / counts[i] : 0));
  const top = avg.indexOf(Math.max(...avg));
  return { avg, top, topName: WEEKDAYS[top], max: Math.max(1, ...avg) };
}

// Short plain-English observations, most useful first
export function observations(transactions, categories, month, today) {
  const cur = monthStats(transactions, month, today);
  const prev = monthStats(transactions, prevMonthOf(month), today);
  const label = (id) => (categories.find((c) => c.id === id) || { label: id, icon: '◦' });
  const out = [];

  if (cur.isCurrent && cur.daysElapsed >= 5 && prev.spent > 0) {
    const diff = cur.projected - prev.spent;
    const pct = Math.round((diff / prev.spent) * 100);
    if (Math.abs(pct) >= 5) out.push({ icon: pct > 0 ? '📈' : '📉', tone: pct > 0 ? 'bad' : 'good',
      text: `At this pace you'll spend ${pct > 0 ? 'about ' + pct + '% more' : 'about ' + Math.abs(pct) + '% less'} than last month.` });
  }

  // tags that moved the most vs last month (compare same number of days when the month is in progress)
  const sameDays = (list, m, days) => list.filter((tx) => tx.type === 'expense' && tx.date.slice(0, 7) === m && Number(tx.date.slice(8, 10)) <= days);
  const days = cur.isCurrent ? cur.daysElapsed : 31;
  const curTx = sameDays(transactions, month, days);
  const prevTx = sameDays(transactions, prevMonthOf(month), days);
  const sum = (list, id) => list.filter((tx) => tx.category === id).reduce((s, tx) => s + tx.amount, 0);
  const movers = categories.filter((c) => c.type === 'expense').map((c) => {
    const a = sum(curTx, c.id); const b = sum(prevTx, c.id);
    return { c, a, b, diff: a - b, pct: b > 0 ? (a - b) / b : null };
  }).filter((m) => m.b > 0 && Math.abs(m.diff) >= 200 && Math.abs(m.pct) >= 0.15)
    .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));
  movers.slice(0, 2).forEach((m) => {
    const up = m.diff > 0;
    out.push({ icon: m.c.icon, tone: up ? 'bad' : 'good',
      text: `${m.c.label} is ${up ? 'up' : 'down'} ${Math.round(Math.abs(m.pct) * 100)}% compared with the same point last month.` });
  });

  if (cur.savingsRate !== null && cur.earned > 0) {
    const r = Math.round(cur.savingsRate * 100);
    out.push({ icon: r >= 20 ? '💪' : r >= 0 ? '🙂' : '⚠️', tone: r >= 0 ? 'good' : 'bad',
      text: r >= 0 ? `You've kept ${r}% of what you earned this month.` : `You've spent ${Math.abs(r)}% more than you earned this month.` });
  }

  if (cur.daysElapsed >= 7 && cur.noSpendDays > 0) {
    out.push({ icon: '🌿', tone: 'good', text: `${cur.noSpendDays} no-spend ${cur.noSpendDays === 1 ? 'day' : 'days'} so far this month.` });
  }

  const wk = weekdayPattern(transactions, today);
  if (wk.avg[wk.top] > 0) out.push({ icon: '📅', tone: 'neutral', text: `${wk.topName}s are your biggest spending day on average.` });

  const topCat = Object.entries(cur.byCat).sort((a, b) => b[1] - a[1])[0];
  if (topCat && cur.spent > 0) {
    const c = label(topCat[0]);
    out.push({ icon: c.icon, tone: 'neutral', text: `${c.label} is ${Math.round((topCat[1] / cur.spent) * 100)}% of your spending this month.` });
  }
  return out.slice(0, 5);
}

// Days in a row (ending today, or yesterday if today is still empty) with at least one entry
export function loggingStreak(transactions, today) {
  const days = new Set(transactions.map((tx) => tx.date));
  let d = days.has(today) ? today : shiftDay(today, -1);
  let n = 0;
  while (days.has(d)) { n++; d = shiftDay(d, -1); }
  return n;
}

// Entries you repeat a lot (same tag + description), most frequent first, with the latest amount
export function frequentEntries(transactions, type, today, limit = 4) {
  const since = shiftDay(today, -60);
  const counts = {};
  transactions.forEach((tx) => {
    if (tx.type !== type || tx.date < since || !tx.note || tx.goalId) return;
    const note = tx.note.replace(/ \(auto\)$/, '');
    const key = `${tx.category}|${note.toLowerCase()}`;
    const c = (counts[key] = counts[key] || { category: tx.category, note, amount: tx.amount, n: 0, last: '' });
    c.n++;
    if (tx.date >= c.last) { c.last = tx.date; c.amount = tx.amount; } // pre-fill the latest price
  });
  return Object.values(counts).filter((c) => c.n >= 2)
    .sort((a, b) => b.n - a.n || b.last.localeCompare(a.last)).slice(0, limit);
}
