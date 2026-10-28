// IOUs ("utang"): money you lent or borrowed. Kept separate from your spending so stats stay honest.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { serial } from './serial';

export const IOU_KEY = 'budget_iou';

export async function loadIous() {
  const raw = await AsyncStorage.getItem(IOU_KEY);
  return raw ? JSON.parse(raw) : [];
}
async function save(list) { await AsyncStorage.setItem(IOU_KEY, JSON.stringify(list)); return list; }

export function addIou(iou) {
  return serial(IOU_KEY, async () => {
    const list = await loadIous();
    const now = Date.now();
    return save([...list, { createdAt: now, updatedAt: now, paid: 0, payments: [], ...iou }]);
  });
}
export function updateIou(id, changes) {
  return serial(IOU_KEY, async () => {
    const list = await loadIous();
    return save(list.map((x) => (x.id === id ? { ...x, ...changes, updatedAt: Date.now() } : x)));
  });
}
export function deleteIou(id) {
  return serial(IOU_KEY, async () => {
    const list = await loadIous();
    return save(list.filter((x) => x.id !== id));
  });
}
// Partial or full repayment. Settles automatically once everything is paid.
export function recordPayment(id, amount, date) {
  return serial(IOU_KEY, async () => {
    const list = await loadIous();
    return save(list.map((x) => {
      if (x.id !== id) return x;
      const paid = Math.min(x.amount, Math.round(((x.paid || 0) + amount) * 100) / 100);
      const payments = [...(x.payments || []), { amount, date }];
      return { ...x, paid, payments, settled: paid >= x.amount, settledAt: paid >= x.amount ? date : null, updatedAt: Date.now() };
    }));
  });
}

export const remainingOf = (x) => Math.max(0, x.amount - (x.paid || 0));
export function iouTotals(list) {
  const open = list.filter((x) => !x.settled);
  return {
    owedToMe: open.filter((x) => x.direction === 'lent').reduce((s, x) => s + remainingOf(x), 0),
    iOwe: open.filter((x) => x.direction === 'borrowed').reduce((s, x) => s + remainingOf(x), 0),
  };
}
