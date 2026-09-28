import { todayStr, monthOf, getWeekRange } from './dateUtils';

export function processRecurring(rules, today = todayStr()) {
  const newTx = [];
  const updatedRules = rules.map((r) => ({ ...r }));

  updatedRules.forEach((rule, idx) => {
    if (!rule.active) return;

    if (rule.frequency === 'monthly') {
      const period = monthOf(today);
      if (rule.lastGeneratedPeriod === period) return;
      const day = Math.min(rule.dayOfMonth || 1, 28);
      const scheduledDate = `${period}-${String(day).padStart(2, '0')}`;
      if (scheduledDate <= today) {
        newTx.push({
          id: Date.now() + idx,
          type: rule.type, amount: rule.amount, category: rule.category,
          note: rule.note ? rule.note + ' (auto)' : 'Recurring', date: scheduledDate,
        });
        rule.lastGeneratedPeriod = period;
      }
    } else if (rule.frequency === 'weekly') {
      const { start } = getWeekRange(today);
      if (rule.lastGeneratedPeriod === start) return;
      const d = new Date(start + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + (rule.dayOfWeek || 0));
      const scheduledDate = d.toISOString().slice(0, 10);
      if (scheduledDate <= today) {
        newTx.push({
          id: Date.now() + idx,
          type: rule.type, amount: rule.amount, category: rule.category,
          note: rule.note ? rule.note + ' (auto)' : 'Recurring', date: scheduledDate,
        });
        rule.lastGeneratedPeriod = start;
      }
    }
  });

  return { newTx, updatedRules };
}