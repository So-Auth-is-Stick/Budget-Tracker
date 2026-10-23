import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayStr } from './dateUtils';

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
  const now = Date.now();
  list.push({ createdAt: now, updatedAt: now, ...goal });
  await saveGoals(list);
  return list;
}

// Every update moves the goal to the top of the list, unless touch is false
export async function updateGoal(id, changes, touch = true) {
  const list = await loadGoals();
  const updated = list.map((g) =>
    g.id === id ? { ...g, ...changes, ...(touch ? { updatedAt: Date.now() } : {}) } : g
  );
  await saveGoals(updated);
  return updated;
}

export async function deleteGoal(id) {
  const list = await loadGoals();
  const filtered = list.filter((g) => g.id !== id);
  await saveGoals(filtered);
  return filtered;
}

export const isFullyFunded = (g) => g.targetAmount > 0 && g.savedAmount >= g.targetAmount;
export const isDue = (g, today = todayStr()) => !!g.dueDate && g.dueDate <= today;
// A plan can be committed (recorded as an expense) once it is fully funded or its date has come
export const canCommit = (g, today = todayStr()) => !g.committed && (isFullyFunded(g) || isDue(g, today));
