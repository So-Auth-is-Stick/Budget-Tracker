import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PinScreen from './components/PinScreen';
import FeedScreen from './components/FeedScreen';
import CalendarScreen from './components/CalendarScreen';
import BudgetScreen from './components/BudgetScreen';
import PlannerScreen from './components/PlannerScreen';
import AddTransactionSheet from './components/AddTransactionSheet';
import DuePlansModal from './components/DuePlansModal';
import { ThemeProvider, useTheme } from './components/theme';
import { PrefsProvider, usePrefs } from './components/prefs';
import { ToastProvider, useToast } from './components/toast';
import { loadCategories } from './components/categories';
import { loadTransactions, addTransaction, addTransactions } from './components/storage';
import { loadGoals, updateGoal } from './components/goals';
import { loadRecurring, saveRecurring } from './components/recurring';
import { processRecurring } from './components/recurringEngine';
import { syncReminders } from './components/notifications';
import { useTxActions } from './components/txActions';
import { todayStr } from './components/dateUtils';
import { useToday } from './components/useToday';
import * as haptic from './components/haptics';

const RELOCK_AFTER_MS = 2 * 60 * 1000;

const TABS = [
  { key: 'budget', label: 'Budget', icon: 'pie-chart' },
  { key: 'main', label: 'Balance', icon: 'wallet' },
  { key: 'plus' },
  { key: 'cal', label: 'Calendar', icon: 'calendar' },
  { key: 'planner', label: 'Planner', icon: 'flag' },
];

function Main() {
  const { theme: t } = useTheme();
  const { prefs, reload: reloadPrefs } = usePrefs();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(t, insets), [t, insets]);
  const today = useToday();

  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState('main');
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [recurringRules, setRecurringRules] = useState([]);
  const [addVisible, setAddVisible] = useState(false);
  const [addDate, setAddDate] = useState(null); // pre-picked day when adding from the calendar
  const [dueOpen, setDueOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const backgroundedAt = useRef(null);
  const pendingNote = useRef(null); // message to show once the PIN screen is gone

  // Creates any recurring transactions that have come due. Safe to run repeatedly.
  const runRecurring = useCallback(async () => {
    const rules = await loadRecurring();
    const { newTx, updatedRules } = processRecurring(rules);
    if (newTx.length > 0) {
      setTransactions(await addTransactions(newTx));
      await saveRecurring(updatedRules);
      setRecurringRules(updatedRules);
      pendingNote.current = newTx.length === 1 ? '🔁 Added 1 recurring entry' : `🔁 Added ${newTx.length} recurring entries`;
    }
  }, []);

  useEffect(() => {
    if (unlocked && pendingNote.current) {
      const msg = pendingNote.current; pendingNote.current = null;
      setTimeout(() => toast.show(msg), 600);
    }
  }, [unlocked, transactions, toast]);

  const reloadAll = useCallback(async () => {
    const [cats, txs, gls, rules] = await Promise.all([loadCategories(), loadTransactions(), loadGoals(), loadRecurring()]);
    setCategories(cats);
    setTransactions(txs);
    setGoals(gls);
    setRecurringRules(rules);
    await reloadPrefs();
  }, [reloadPrefs]);

  useEffect(() => {
    (async () => {
      await reloadAll();
      setLoaded(true);
      await runRecurring();
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Back from the background: add due recurring entries, and ask for the PIN again after a while
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgroundedAt.current = Date.now();
      if (state === 'active') {
        if (backgroundedAt.current && Date.now() - backgroundedAt.current > RELOCK_AFTER_MS) setUnlocked(false);
        backgroundedAt.current = null;
        runRecurring();
      }
    });
    return () => sub.remove();
  }, [runRecurring]);

  // Keep scheduled reminders in step with the data (a short pause so typing doesn't reschedule constantly)
  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(() => {
      syncReminders({ goals, rules: recurringRules, categories, transactions, prefs });
    }, 1500);
    return () => clearTimeout(id);
  }, [loaded, goals, recurringRules, categories, transactions, prefs, today]);

  // Plans whose date has come and that haven't been committed yet
  const dueGoals = useMemo(
    () => goals.filter((g) => !g.committed && g.dueDate && g.dueDate <= today),
    [goals, today]
  );
  const promptGoals = useMemo(() => dueGoals.filter((g) => g.dueDismissedOn !== today), [dueGoals, today]);
  const promptKey = promptGoals.map((g) => g.id).join(',');

  useEffect(() => {
    if (unlocked && promptKey) setDueOpen(true);
  }, [unlocked, today, promptKey]);

  const txActions = useTxActions(categories, setTransactions);

  // Turns a plan into a real expense dated today, and releases the money set aside for it
  const handleCommit = async (goal, { amount, category, note }) => {
    const tx = { id: Date.now(), type: 'expense', amount, category, note, date: todayStr(), goalId: goal.id };
    setTransactions(await addTransaction(tx));
    setGoals(await updateGoal(goal.id, {
      committed: true, committedAt: Date.now(), committedDate: todayStr(), committedAmount: amount,
    }));
    haptic.success();
    toast.show(`🎉 ${goal.label} done and recorded`);
  };

  // "Remind me tomorrow" shouldn't move the plan in the list, so it doesn't touch updatedAt
  const handleLater = async (goal) => setGoals(await updateGoal(goal.id, { dueDismissedOn: today }, false));

  const statusBar = <StatusBar style={t.isDark ? 'light' : 'dark'} />;

  if (!unlocked) {
    return (<>{statusBar}<PinScreen onUnlock={() => setUnlocked(true)} /></>);
  }

  const switchTab = (key) => { if (key !== tab) { haptic.tap(); setTab(key); } };

  return (
    <View style={styles.root}>
      {statusBar}
      {tab === 'budget' && <BudgetScreen categories={categories} setCategories={setCategories} transactions={transactions} goals={goals} />}
      {tab === 'main' && (
        <FeedScreen
          categories={categories} setCategories={setCategories}
          transactions={transactions} setTransactions={setTransactions}
          goals={goals} onDataRestored={reloadAll}
        />
      )}
      {tab === 'cal' && (
        <CalendarScreen
          categories={categories} transactions={transactions} setTransactions={setTransactions}
          goals={goals} setGoals={setGoals} onCommitGoal={handleCommit}
          onAddForDate={(d) => { setAddDate(d); setAddVisible(true); }}
        />
      )}
      {tab === 'planner' && (
        <PlannerScreen
          categories={categories} goals={goals} setGoals={setGoals}
          recurringRules={recurringRules} setRecurringRules={setRecurringRules}
          onCommitGoal={handleCommit}
        />
      )}

      <View style={styles.tabBar}>
        {TABS.map((tb) => {
          if (tb.key === 'plus') {
            return (
              <View key="plus" style={styles.plusSlot}>
                <TouchableOpacity style={styles.plusBtn} onPress={() => { haptic.bump(); setAddDate(null); setAddVisible(true); }} accessibilityLabel="Add transaction" activeOpacity={0.8}>
                  <Ionicons name="add" size={32} color={t.onAccent} />
                </TouchableOpacity>
              </View>
            );
          }
          const active = tab === tb.key;
          const badge = tb.key === 'planner' ? dueGoals.length : 0;
          return (
            <TouchableOpacity key={tb.key} onPress={() => switchTab(tb.key)} style={styles.tabBtn} accessibilityRole="tab" accessibilityState={{ selected: active }}>
              <View style={[styles.iconPill, active && { backgroundColor: t.accent + '26' }]}>
                <Ionicons name={active ? tb.icon : tb.icon + '-outline'} size={21} color={active ? t.accent : t.inkDim} />
                {badge > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
              </View>
              <Text style={[styles.tabLabel, { color: active ? t.accent : t.inkDim }, active && { fontWeight: '700' }]}>{tb.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <AddTransactionSheet visible={addVisible} onClose={() => setAddVisible(false)} categories={categories} setCategories={setCategories} transactions={transactions} onSave={txActions.add} initialDate={addDate} />
      <DuePlansModal
        visible={dueOpen}
        goals={promptGoals}
        categories={categories}
        onClose={() => setDueOpen(false)}
        onLater={handleLater}
        onCommit={handleCommit}
      />
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <PrefsProvider>
        <SafeAreaProvider>
          <ToastProvider>
            <Main />
          </ToastProvider>
        </SafeAreaProvider>
      </PrefsProvider>
    </ThemeProvider>
  );
}

const makeStyles = (t, insets) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  tabBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.surface, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 8) + 4,
    borderTopColor: t.edge, borderTopWidth: 1,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 4, gap: 2 },
  iconPill: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 11 },
  plusSlot: { flex: 1, alignItems: 'center' },
  plusBtn: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center',
    marginTop: -22, borderWidth: 4, borderColor: t.surface,
    elevation: 6, shadowColor: t.accent, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  badge: { position: 'absolute', top: -2, right: 6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: t.spend, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});
