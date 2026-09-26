import AsyncStorage from '@react-native-async-storage/async-storage';

const TX_KEY = 'budget_transactions';

export async function updateTransaction(id, changes) {
  const list = await loadTransactions();
  const updated = list.map((t) => (t.id === id ? { ...t, ...changes } : t));
  await saveTransactions(updated);
  return updated;
}

export async function loadTransactions() {
  const raw = await AsyncStorage.getItem(TX_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveTransactions(list) {
  await AsyncStorage.setItem(TX_KEY, JSON.stringify(list));
}

export async function addTransaction(tx) {
  const list = await loadTransactions();
  list.push(tx);
  await saveTransactions(list);
  return list;
}

export async function deleteTransaction(id) {
  const list = await loadTransactions();
  const filtered = list.filter((t) => t.id !== id);
  await saveTransactions(filtered);
  return filtered;
}

