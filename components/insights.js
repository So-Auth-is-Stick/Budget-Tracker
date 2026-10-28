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
  const when = cur.isCurrent ? 'this month' : `in ${MONTHS[Number(month.slice(5, 7)) - 1]}`;

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
      text: cur.isCurrent ? `${m.c.label} is ${up ? 'up' : 'down'} ${Math.round(Math.abs(m.pct) * 100)}% compared with the same point last month.` : `${m.c.label} was ${up ? 'up' : 'down'} ${Math.round(Math.abs(m.pct) * 100)}% on the month before.` });
  });

  if (cur.savingsRate !== null && cur.earned > 0) {
    const r = Math.round(cur.savingsRate * 100);
    out.push({ icon: r >= 20 ? '💪' : r >= 0 ? '🙂' : '⚠️', tone: r >= 0 ? 'good' : 'bad',
      text: r >= 0 ? `You kept ${r}% of what you earned ${when}.` : `You spent ${Math.abs(r)}% more than you earned ${when}.` });
  }

  if (cur.daysElapsed >= 7 && cur.noSpendDays > 0) {
    out.push({ icon: '🌿', tone: 'good', text: `${cur.noSpendDays} no-spend ${cur.noSpendDays === 1 ? 'day' : 'days'} ${cur.isCurrent ? 'so far this month' : when}.` });
  }

  const wk = weekdayPattern(transactions, today);
  if (wk.avg[wk.top] > 0) out.push({ icon: '📅', tone: 'neutral', text: `${wk.topName}s are your biggest spending day on average.` });

  const topCat = Object.entries(cur.byCat).sort((a, b) => b[1] - a[1])[0];
  if (topCat && cur.spent > 0) {
    const c = label(topCat[0]);
    out.push({ icon: c.icon, tone: 'neutral', text: `${c.label} ${cur.isCurrent ? 'is' : 'was'} ${Math.round((topCat[1] / cur.spent) * 100)}% of your spending ${when}.` });
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

// Longest run of consecutive days with at least one entry
export function longestStreak(transactions) {
  const days = [...new Set(transactions.map((tx) => tx.date))].sort();
  let best = 0, run = 0, prev = null;
  days.forEach((d) => {
    run = prev && shiftDay(prev, 1) === d ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  });
  return best;
}

// Small achievements to make the habit stick. Each: { id, icon, title, hint, earned }
export function badges({ transactions = [], goals = [], categories = [], prefs = {}, today }) {
  const exp = transactions.filter((tx) => tx.type === 'expense');
  const days = new Set(transactions.map((tx) => tx.date));
  const streak = longestStreak(transactions);
  const monthsWith = [...new Set(exp.map((tx) => tx.date.slice(0, 7)))].sort().filter((m) => m < today.slice(0, 7));
  const spentIn = (m) => exp.filter((tx) => tx.date.slice(0, 7) === m).reduce((s, tx) => s + tx.amount, 0);
  let spentLess = false;
  for (let i = 1; i < monthsWith.length; i++) if (prevMonthOf(monthsWith[i]) === monthsWith[i - 1] && spentIn(monthsWith[i]) < spentIn(monthsWith[i - 1])) spentLess = true;
  const monthlyBudget = categories.filter((c) => c.type === 'expense').reduce((s, c) => s + (c.budget || 0), 0);
  const underBudget = monthlyBudget > 0 && monthsWith.some((m) => spentIn(m) <= monthlyBudget);
  // a no-spend day: a past day, after the first entry, with nothing spent
  let noSpend = false;
  if (transactions.length) {
    const first = [...days].sort()[0];
    const spentDays = new Set(exp.map((tx) => tx.date));
    for (let d = first; d < today; d = shiftDay(d, 1)) { if (!spentDays.has(d)) { noSpend = true; break; } }
  }
  return [
    { id: 'first', icon: '🌱', title: 'First step', hint: 'Log your first entry', earned: transactions.length > 0 },
    { id: 'streak7', icon: '🔥', title: 'On a roll', hint: 'Log 7 days in a row', earned: streak >= 7 },
    { id: 'streak30', icon: '☄️', title: 'Habit formed', hint: 'Log 30 days in a row', earned: streak >= 30 },
    { id: 'nospend', icon: '🌿', title: 'No-spend day', hint: 'Get through a day without spending', earned: noSpend },
    { id: 'funded', icon: '💰', title: 'Fully funded', hint: 'Fill a plan to its target', earned: goals.some((g) => g.savedAmount >= g.targetAmount && g.targetAmount > 0) || goals.some((g) => g.committed) },
    { id: 'committed', icon: '🎯', title: 'Plan kept', hint: 'Commit a plan as an expense', earned: goals.some((g) => g.committed) },
    { id: 'backup', icon: '🛡️', title: 'Safe and sound', hint: 'Make your first backup', earned: !!prefs.lastBackupAt },
    { id: 'less', icon: '📉', title: 'Trimmed down', hint: 'Spend less than the month before', earned: spentLess },
    { id: 'budget', icon: '✅', title: 'Within budget', hint: 'Finish a month under your monthly limits', earned: underBudget },
    { id: 'hundred', icon: '💯', title: 'Century', hint: 'Log 100 entries', earned: transactions.length >= 100 },
  ];
}

// Summary of the month that just ended (shown on Balance during the first days of a new month)
export function lastMonthRecap(transactions, categories, today) {
  const m = prevMonthOf(today.slice(0, 7));
  const cur = monthStats(transactions, m, today);
  if (cur.count === 0) return null;
  const before = monthStats(transactions, prevMonthOf(m), today);
  const top = Object.entries(cur.byCat).sort((a, b) => b[1] - a[1])[0];
  const topCat = top ? categories.find((c) => c.id === top[0]) || { label: top[0], icon: '◦' } : null;
  return {
    month: m, spent: cur.spent, earned: cur.earned, net: cur.net,
    keptPct: cur.earned > 0 ? Math.round((cur.net / cur.earned) * 100) : null,
    changePct: before.spent > 0 ? Math.round(((cur.spent - before.spent) / before.spent) * 100) : null,
    top: topCat ? { ...topCat, amount: top[1] } : null,
    noSpendDays: cur.noSpendDays,
  };
}

// Spent / earned for the `n` months ending at `endMonth` (oldest first)
export function monthsTrend(transactions, endMonth, n = 6) {
  const months = [];
  let m = endMonth;
  for (let i = 0; i < n; i++) { months.unshift(m); m = prevMonthOf(m); }
  const rows = months.map((month) => ({ month, spent: 0, earned: 0 }));
  const idx = Object.fromEntries(months.map((mm, i) => [mm, i]));
  transactions.forEach((tx) => {
    const i = idx[tx.date.slice(0, 7)];
    if (i === undefined) return;
    if (tx.type === 'expense') rows[i].spent += tx.amount; else rows[i].earned += tx.amount;
  });
  return rows;
}
