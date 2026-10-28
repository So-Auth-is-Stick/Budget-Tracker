// App-wide settings (haptics, notifications, fingerprint...). Stored separately from your money data.
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setMasked } from './format';

const PREFS_KEY = 'budget_prefs';

export const DEFAULT_PREFS = {
  haptics: true,
  biometric: false,
  notifyPlans: true,      // morning reminder on a plan's due date
  notifyRecurring: true,  // heads-up the day a recurring entry is added
  notifyDaily: false,     // evening "did you log today?" nudge
  dailyHour: 20,
  dailyMinute: 0,
  lastBackupAt: null,
  hideAmounts: false,     // privacy: show ₱•••• instead of numbers
  backupNudgeAt: null,
  recapDismissed: null,
  onboarded: false,
  lastAccount: null,
};

let current = { ...DEFAULT_PREFS };
export const getPrefs = () => current; // for code outside React (haptics)

const PrefsContext = createContext({ prefs: DEFAULT_PREFS, setPref: () => {}, reload: async () => {} });

export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(current);
  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then((raw) => {
      if (!raw) return;
      try { current = { ...DEFAULT_PREFS, ...JSON.parse(raw) }; setPrefs(current); } catch (e) {}
    });
  }, []);
  const setPref = useCallback((key, value) => {
    current = { ...current, [key]: value };
    setPrefs(current);
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify(current));
  }, []);
  // After a restore, read everything again
  const reload = useCallback(async () => {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    try { current = { ...DEFAULT_PREFS, ...(raw ? JSON.parse(raw) : {}) }; } catch (e) { current = { ...DEFAULT_PREFS }; }
    setPrefs(current);
  }, []);
  setMasked(prefs.hideAmounts); // applied during render so every amount on screen follows it
  const value = useMemo(() => ({ prefs, setPref, reload }), [prefs, setPref, reload]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export const usePrefs = () => useContext(PrefsContext);
