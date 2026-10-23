import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import PinScreen from './components/PinScreen';
import FeedScreen from './components/FeedScreen';
import CalendarScreen from './components/CalendarScreen';
import BudgetScreen from './components/BudgetScreen';
import PlannerScreen from './components/PlannerScreen';
import AddTransactionSheet from './components/AddTransactionSheet';
import DuePlansModal from './components/DuePlansModal';
import { ThemeProvider, useTheme } from './components/theme';
import { loadCategories } from './components/categories';
import { loadTransactions, addTransaction, addTransactions } from './components/storage';
import { loadGoals, updateGoal } from './components/goals';
import { loadRecurring, saveRecurring } from './components/recurring';
import { processRecurring } from './components/recurringEngine';
import { todayStr } from './components/dateUtils';
import { useToday } from './components/useToday';

function Main() {
  const { theme: t } = useTheme();
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
  const [dueOpen, setDueOpen] = useState(false);

  // Creates any recurring transactions that have come due. Safe to run repeatedly.
  const runRecurring = useCallback(async () => {
    const rules = await loadRecurring();
    const { newTx, updatedRules } = processRecurring(rules);
    if (newTx.length > 0) {
      setTransactions(await addTransactions(newTx));
      await saveRecurring(updatedRules);
      setRecurringRules(updatedRules);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [cats, txs, gls, rules] = await Promise.all([
        loadCategories(), loadTransactions(), loadGoals(), loadRecurring(),
      ]);
      setCategories(cats);
      setTransactions(txs);
      setGoals(gls);
      setRecurringRules(rules);
      await runRecurring();
    })();
  }, [runRecurring]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') runRecurring();
    });
    return () => sub.remove();
  }, [runRecurring]);

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

  const handleAddTransaction = async (tx) => setTransactions(await addTransaction(tx));

  // Turns a plan into a real expense dated today, and releases the money set aside for it
  const handleCommit = async (goal, { amount, category, note }) => {
    const tx = { id: Date.now(), type: 'expense', amount, category, note, date: todayStr(), goalId: goal.id };
    setTransactions(await addTransaction(tx));
    setGoals(await updateGoal(goal.id, {
      committed: true, committedAt: Date.now(), committedDate: todayStr(), committedAmount: amount,
    }));
  };

  // "Remind me tomorrow" shouldn't move the plan in the list, so it doesn't touch updatedAt
  const handleLater = async (goal) => setGoals(await updateGoal(goal.id, { dueDismissedOn: today }, false));

  const statusBar = <StatusBar style={t.isDark ? 'light' : 'dark'} />;

  if (!unlocked) {
    return (<>{statusBar}<PinScreen onUnlock={() => setUnlocked(true)} /></>);
  }

  const renderTab = (key, label, badge = 0) => (
    <TouchableOpacity key={key} onPress={() => setTab(key)} style={styles.tabBtn}>
      <Text style={{ color: tab === key ? t.accent : t.inkDim }}>{label}</Text>
      {badge > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      {statusBar}
      {tab === 'budget' && <BudgetScreen categories={categories} setCategories={setCategories} transactions={transactions} />}
      {tab === 'main' && (
        <FeedScreen
          categories={categories} setCategories={setCategories}
          transactions={transactions} setTransactions={setTransactions}
          goals={goals}
        />
      )}
      {tab === 'cal' && (
        <CalendarScreen
          categories={categories} transactions={transactions} setTransactions={setTransactions}
          goals={goals} setGoals={setGoals} onCommitGoal={handleCommit}
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
        {renderTab('budget', 'Budget')}
        {renderTab('main', 'Balance')}
        <View style={styles.plusSlot}>
          <TouchableOpacity style={styles.plusBtn} onPress={() => setAddVisible(true)} accessibilityLabel="Add transaction">
            <Text style={styles.plusText}>+</Text>
          </TouchableOpacity>
        </View>
        {renderTab('cal', 'Calendar')}
        {renderTab('planner', 'Planner', dueGoals.length)}
      </View>

      <AddTransactionSheet visible={addVisible} onClose={() => setAddVisible(false)} categories={categories} onSave={handleAddTransaction} />
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
      <SafeAreaProvider>
        <Main />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const makeStyles = (t, insets) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  tabBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.surface, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 10) + 6,
    borderTopColor: t.edge, borderTopWidth: 1,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  plusSlot: { flex: 1, alignItems: 'center' },
  plusBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' },
  plusText: { color: t.onAccent, fontSize: 30, lineHeight: 34, fontWeight: '500' },
  badge: { position: 'absolute', top: 2, right: '22%', minWidth: 16, height: 16, borderRadius: 8, backgroundColor: t.spend, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});
