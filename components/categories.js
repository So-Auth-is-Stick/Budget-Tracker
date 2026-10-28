import AsyncStorage from '@react-native-async-storage/async-storage';
import { serial } from './serial';

const CATS_KEY = 'budget_categories';

const DEFAULT_CATEGORIES = [
  { id: 'food', label: 'Food', icon: '🍜', color: '#D97A55', type: 'expense' },
  { id: 'transport', label: 'Transport', icon: '🚌', color: '#C9954A', type: 'expense' },
  { id: 'bills', label: 'Bills', icon: '💡', color: '#B85C7A', type: 'expense' },
  { id: 'other_exp', label: 'Other', icon: '🧩', color: '#8A8A8A', type: 'expense' },
  { id: 'salary', label: 'Salary', icon: '💼', color: '#7FC29B', type: 'income' },
  { id: 'other_inc', label: 'Other', icon: '💵', color: '#8A8A8A', type: 'income' },
];

export async function loadCategories() {
  const raw = await AsyncStorage.getItem(CATS_KEY);
  if (raw) return JSON.parse(raw);
  await AsyncStorage.setItem(CATS_KEY, JSON.stringify(DEFAULT_CATEGORIES));
  return DEFAULT_CATEGORIES;
}

export async function saveCategories(list) {
  await AsyncStorage.setItem(CATS_KEY, JSON.stringify(list));
}

export function addCategory(cat) {
  return serial(CATS_KEY, async () => {
    const list = await loadCategories();
    list.push(cat);
    await saveCategories(list);
    return list;
  });
}

export function updateCategory(id, changes) {
  return serial(CATS_KEY, async () => {
    const list = await loadCategories();
    const updated = list.map((c) => (c.id === id ? { ...c, ...changes } : c));
    await saveCategories(updated);
    return updated;
  });
}

export function deleteCategory(id) {
  return serial(CATS_KEY, async () => {
    const list = await loadCategories();
    const filtered = list.filter((c) => c.id !== id);
    await saveCategories(filtered);
    return filtered;
  });
}

export function findCategory(categories, id) {
  return categories.find((c) => c.id === id) || { label: id, icon: '◦', color: '#8A8A8A' };
}

export const COLOR_PALETTE = [
  '#D97A55', '#C9954A', '#B85C7A', '#9C6ADE', '#5E9AD9',
  '#4FB0A5', '#7FC29B', '#5FB88C', '#8FCB77', '#E8B84B', '#8A8A8A',
];
