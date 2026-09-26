import AsyncStorage from '@react-native-async-storage/async-storage';

const GOALS_KEY = 'budget_goals';

export async function loadGoals() {
  const raw = await AsyncStorage.getItem(GOALS_KEY);
  return raw ? JSON.parse(raw) : [];
}
export async function saveGoals(list) {
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(list));
}
export async function addGoal(goal) {
  const list = await loadGoals();
  list.push(goal);
  await saveGoals(list);
  return list;
}
export async function updateGoal(id, changes) {
  const list = await loadGoals();
  const updated = list.map((g) => (g.id === id ? { ...g, ...changes } : g));
  await saveGoals(updated);
  return updated;
}
export async function deleteGoal(id) {
  const list = await loadGoals();
  const filtered = list.filter((g) => g.id !== id);
  await saveGoals(filtered);
  return filtered;
}