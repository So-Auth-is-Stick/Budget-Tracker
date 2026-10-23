import AsyncStorage from '@react-native-async-storage/async-storage';

const REC_KEY = 'budget_recurring';

export async function loadRecurring() {
  const raw = await AsyncStorage.getItem(REC_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveRecurring(list) {
  await AsyncStorage.setItem(REC_KEY, JSON.stringify(list));
}

export async function addRecurring(rule) {
  const list = await loadRecurring();
  list.push({ updatedAt: Date.now(), ...rule });
  await saveRecurring(list);
  return list;
}

export async function updateRecurring(id, changes) {
  const list = await loadRecurring();
  const updated = list.map((r) => (r.id === id ? { ...r, ...changes, updatedAt: Date.now() } : r));
  await saveRecurring(updated);
  return updated;
}

export async function deleteRecurring(id) {
  const list = await loadRecurring();
  const filtered = list.filter((r) => r.id !== id);
  await saveRecurring(filtered);
  return filtered;
}
