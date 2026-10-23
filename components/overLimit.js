import { getWeekRange, monthOf } from './dateUtils';

// Finds the expenses that pushed a tag past one of its limits.
// Returns { [transactionId]: ['daily' | 'weekly' | 'monthly', ...] }
export function computeOverLimitFlags(transactions, categories) {
  const flags = {};
  categories.forEach((cat) => {
    if (cat.type !== 'expense') return;
    const limits = { daily: cat.dailyBudget || 0, weekly: cat.weeklyBudget || 0, monthly: cat.budget || 0 };
    if (!limits.daily && !limits.weekly && !limits.monthly) return;

    const running = {};
    transactions
      .filter((t) => t.type === 'expense' && t.category === cat.id)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
      .forEach((t) => {
        const keys = {
          daily: 'd' + t.date,
          weekly: 'w' + getWeekRange(t.date).start,
          monthly: 'm' + monthOf(t.date),
        };
        Object.keys(keys).forEach((kind) => {
          if (!limits[kind]) return;
          running[keys[kind]] = (running[keys[kind]] || 0) + t.amount;
          if (running[keys[kind]] > limits[kind]) {
            (flags[t.id] = flags[t.id] || []).push(kind);
          }
        });
      });
  });
  return flags;
}

// How much of a tag was spent in the day / week / month that `date` falls in, up to and including `date`
export function periodSpent(transactions, catId, kind, date) {
  const mine = transactions.filter((t) => t.type === 'expense' && t.category === catId && t.date <= date);
  let inPeriod;
  if (kind === 'daily') {
    inPeriod = mine.filter((t) => t.date === date);
  } else if (kind === 'weekly') {
    const { start } = getWeekRange(date);
    inPeriod = mine.filter((t) => t.date >= start);
  } else {
    inPeriod = mine.filter((t) => monthOf(t.date) === monthOf(date));
  }
  return inPeriod.reduce((s, t) => s + t.amount, 0);
}

export function limitFor(cat, kind) {
  return kind === 'daily' ? cat.dailyBudget : kind === 'weekly' ? cat.weeklyBudget : cat.budget;
}
