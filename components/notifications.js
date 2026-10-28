// Local reminders (no internet, nothing leaves the phone). Rebuilt from scratch whenever data changes,
// so editing or deleting a plan never leaves a stale reminder behind.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { findCategory } from './categories';
import { peso } from './format';

const CHANNEL = 'reminders';
const MORNING_HOUR = 9;
const supported = Platform.OS !== 'web';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export async function ensurePermission(ask = false) {
  if (!supported) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Reminders', importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: [0, 200], lightColor: '#E8B84B',
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!ask || !current.canAskAgain) return false;
    const res = await Notifications.requestPermissionsAsync();
    return !!res.granted;
  } catch (e) {
    return false;
  }
}

const pad = (n) => String(n).padStart(2, '0');
const dateStrOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const at = (dateStr, hour, minute = 0) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
};

// Next calendar day this rule fires (today counts if it fires today)
export function nextRecurringDate(rule, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (rule.frequency === 'weekly') {
    const diff = ((rule.dayOfWeek || 0) - today.getDay() + 7) % 7;
    const d = new Date(today); d.setDate(d.getDate() + diff);
    return dateStrOf(d);
  }
  if (rule.frequency === 'semimonthly') {
    const end = (y, mo) => new Date(y, mo + 1, 0).getDate();
    const y = today.getFullYear(), mo = today.getMonth();
    const cands = [new Date(y, mo, 15), new Date(y, mo, end(y, mo)), new Date(y, mo + 1, 15)];
    return dateStrOf(cands.find((c) => c >= today));
  }
  const day = Math.min(rule.dayOfMonth || 1, 28);
  let d = new Date(today.getFullYear(), today.getMonth(), day);
  if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, day);
  return dateStrOf(d);
}

// Pure planner, so it can be tested: returns the list of reminders that should exist
export function planReminders({ goals = [], rules = [], categories = [], transactions = [], prefs }, now = new Date()) {
  const out = [];
  const todayStr = dateStrOf(now);
  const future = (date) => date.getTime() > now.getTime() + 30 * 1000;

  if (prefs.notifyPlans) {
    goals.filter((g) => !g.committed && g.dueDate).forEach((g) => {
      const left = Math.max(0, g.targetAmount - g.savedAmount);
      const dayBefore = at(g.dueDate, MORNING_HOUR); dayBefore.setDate(dayBefore.getDate() - 1);
      if (future(dayBefore)) {
        out.push({ id: `plan-pre-${g.id}`, date: dayBefore, title: `${g.icon || '🎯'} ${g.label} is due tomorrow`,
          body: left > 0 ? `${peso(g.savedAmount, 0)} of ${peso(g.targetAmount, 0)} set aside. ${peso(left, 0)} to go.` : 'Fully funded and ready to commit.' });
      }
      const onDay = at(g.dueDate, MORNING_HOUR);
      if (future(onDay)) {
        out.push({ id: `plan-due-${g.id}`, date: onDay, title: `${g.icon || '🎯'} ${g.label} is due today`, body: 'Open Ledger to commit it to your spending.' });
      }
    });
  }

  if (prefs.notifyRecurring) {
    rules.filter((r) => r.active).forEach((r) => {
      let ds = nextRecurringDate(r, now);
      let when = at(ds, MORNING_HOUR);
      if (!future(when)) { // today's already passed: use the one after
        const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
        ds = nextRecurringDate(r, tomorrow); when = at(ds, MORNING_HOUR);
      }
      const cat = findCategory(categories, r.category);
      const sign = r.type === 'income' ? '+' : '−';
      out.push({ id: `rec-${r.id}`, date: when, title: `🔁 ${r.note || cat.label} today`,
        body: `${sign}${peso(r.amount, 0)} (${cat.label}) will be recorded when you open Ledger.` });
    });
  }

  if (prefs.notifyDaily) {
    const loggedToday = transactions.some((tx) => tx.date === todayStr);
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, prefs.dailyHour, prefs.dailyMinute);
      if (i === 0 && loggedToday) continue;
      if (!future(d)) continue;
      out.push({ id: `daily-${dateStrOf(d)}`, date: d, title: '✏️ Anything to log today?', body: 'A few seconds now keeps your budget honest.' });
    }
  }
  return out;
}

let syncing = Promise.resolve();
export function syncReminders(state) {
  if (!supported) return Promise.resolve(0);
  // serialise calls so two quick changes can't interleave
  syncing = syncing.then(async () => {
    try {
      if (!(await ensurePermission(false))) return 0;
      await Notifications.cancelAllScheduledNotificationsAsync();
      const list = planReminders(state).slice(0, 60);
      for (const r of list) {
        await Notifications.scheduleNotificationAsync({
          identifier: r.id,
          content: { title: r.title, body: r.body, data: { kind: r.id.split('-')[0] } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: CHANNEL },
        });
      }
      return list.length;
    } catch (e) {
      return 0;
    }
  });
  return syncing;
}

export async function sendTestNotification() {
  if (!(await ensurePermission(true))) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: '👋 Reminders are on', body: 'This is how Ledger will nudge you.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, channelId: CHANNEL },
  });
  return true;
}
