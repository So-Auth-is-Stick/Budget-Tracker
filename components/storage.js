import AsyncStorage from '@react-native-async-storage/async-storage';
import { serial } from './serial';

const TX_KEY = 'budget_transactions';

export async function loadTransactions() {
  const raw = await AsyncStorage.getItem(TX_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveTransactions(list) {
  await AsyncStorage.setItem(TX_KEY, JSON.stringify(list));
}

export function addTransaction(tx) {
  return serial(TX_KEY, async () => {
    const list = await loadTransactions();
    list.push(tx);
    await saveTransactions(list);
    return list;
  });
}

export function deleteTransaction(id) {
  return serial(TX_KEY, async () => {
    const list = await loadTransactions();
    const filtered = list.filter((t) => t.id !== id);
    await saveTransactions(filtered);
    return filtered;
  });
}

export function updateTransaction(id, changes) {
  return serial(TX_KEY, async () => {
    const list = await loadTransactions();
    const updated = list.map((t) => (t.id === id ? { ...t, ...changes } : t));
    await saveTransactions(updated);
    return updated;
  });
}

export function addTransactions(newList) {
  return serial(TX_KEY, async () => {
    const list = await loadTransactions();
    const merged = [...list, ...newList];
    await saveTransactions(merged);
    return merged;
  });
}

// Moves every entry from one tag to another (used when a tag is deleted)
export function reassignCategory(fromId, toId) {
  return serial(TX_KEY, async () => {
    const list = await loadTransactions();
    const updated = list.map((t) => (t.category === fromId ? { ...t, category: toId } : t));
    await saveTransactions(updated);
    return updated;
  });
}

// When an account is deleted its entries fall back to the default account
export function clearAccount(accountId) {
  return serial(TX_KEY, async () => {
    const list = await loadTransactions();
    const updated = list.map((t) => {
      if (t.account !== accountId) return t;
      const { account, ...rest } = t;
      return rest;
    });
    await saveTransactions(updated);
    return updated;
  });
}
