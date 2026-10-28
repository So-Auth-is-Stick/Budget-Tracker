// Backup & restore: everything (except your PIN) in one .json file you can keep in Drive, Gmail, etc.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { todayStr } from './dateUtils';

export const DATA_KEYS = ['budget_transactions', 'budget_categories', 'budget_goals', 'budget_recurring', 'budget_theme', 'budget_prefs'];
const PRE_RESTORE_KEY = 'budget_prerestore_snapshot';

async function snapshot() {
  const pairs = await AsyncStorage.multiGet(DATA_KEYS);
  const data = {};
  pairs.forEach(([k, v]) => {
    if (v == null) return;
    try { data[k] = JSON.parse(v); } catch (e) { data[k] = v; } // theme is a plain string
  });
  return data;
}

export function summarize(data) {
  const n = (k) => (Array.isArray(data[k]) ? data[k].length : 0);
  return { transactions: n('budget_transactions'), tags: n('budget_categories'), plans: n('budget_goals'), recurring: n('budget_recurring') };
}

// Creates the file and opens the share sheet (Drive, Gmail, Files, Messenger...)
export async function exportBackup() {
  const data = await snapshot();
  const payload = { app: 'ledger', format: 1, exportedAt: new Date().toISOString(), data };
  const file = new File(Paths.cache, `ledger-backup-${todayStr()}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(payload));
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save your Ledger backup', UTI: 'public.json' });
  return summarize(data);
}

// Lets the user pick a backup file. Returns { payload, summary } or null if they cancelled.
export async function pickBackup() {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', 'application/octet-stream', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets || !res.assets.length) return null;
  const text = await new File(res.assets[0].uri).text();
  let payload;
  try { payload = JSON.parse(text); } catch (e) { throw new Error('That file is not a Ledger backup (it could not be read as JSON).'); }
  if (!payload || payload.app !== 'ledger' || typeof payload.data !== 'object') {
    throw new Error('That file is not a Ledger backup.');
  }
  if (!Array.isArray(payload.data.budget_transactions) || !Array.isArray(payload.data.budget_categories)) {
    throw new Error('This backup looks damaged: it has no transactions or tags list.');
  }
  return { payload, summary: summarize(payload.data) };
}

// Replaces current data with the backup. The current data is kept aside so it can be put back.
export async function restoreBackup(payload) {
  const before = await snapshot();
  await AsyncStorage.setItem(PRE_RESTORE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), data: before }));
  await writeData(payload.data);
}

export async function hasUndoRestore() {
  return !!(await AsyncStorage.getItem(PRE_RESTORE_KEY));
}

export async function undoRestore() {
  const raw = await AsyncStorage.getItem(PRE_RESTORE_KEY);
  if (!raw) return false;
  await writeData(JSON.parse(raw).data);
  await AsyncStorage.removeItem(PRE_RESTORE_KEY);
  return true;
}

async function writeData(data) {
  const sets = [];
  const removes = [];
  DATA_KEYS.forEach((k) => {
    if (data[k] === undefined) { if (k !== 'budget_theme' && k !== 'budget_prefs') removes.push(k); return; }
    sets.push([k, typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k])]);
  });
  if (sets.length) await AsyncStorage.multiSet(sets);
  if (removes.length) await AsyncStorage.multiRemove(removes);
}
