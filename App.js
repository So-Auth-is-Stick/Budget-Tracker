import { useState, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import PinScreen from './components/PinScreen';
import FeedScreen from './components/FeedScreen';
import CalendarScreen from './components/CalendarScreen';
import BudgetScreen from './components/BudgetScreen';
import PlannerScreen from './components/PlannerScreen';
import { ThemeProvider, useTheme } from './components/theme';
import { loadCategories } from './components/categories';
import { loadTransactions, addTransactions } from './components/storage';
import { loadGoals } from './components/goals';
import { loadRecurring, saveRecurring } from './components/recurring';
import { processRecurring } from './components/recurringEngine';

function Main() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState('main');
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [recurringRules, setRecurringRules] = useState([]);

  useEffect(() => {
    async function init() {
      const [cats, txs, gls, rules] = await Promise.all([
        loadCategories(), loadTransactions(), loadGoals(), loadRecurring(),
      ]);
      setCategories(cats);
      setGoals(gls);
      const { newTx, updatedRules } = processRecurring(rules);
      if (newTx.length > 0) {
        setTransactions(await addTransactions(newTx));
        await saveRecurring(updatedRules);
        setRecurringRules(updatedRules);
      } else {
        setTransactions(txs);
        setRecurringRules(rules);
      }
    }
    init();
  }, []);

  const statusBar = <StatusBar style={t.isDark ? 'light' : 'dark'} />;

  if (!unlocked) {
    return (<>{statusBar}<PinScreen onUnlock={() => setUnlocked(true)} /></>);
  }

  const tabs = [['budget', 'Budget'], ['main', 'Balance'], ['cal', 'Calendar'], ['planner', 'Planner']];

  return (
    <View style={styles.root}>
      {statusBar}
      {tab === 'budget' && <BudgetScreen categories={categories} setCategories={setCategories} transactions={transactions} />}
      {tab === 'main' && (
        <FeedScreen categories={categories} setCategories={setCategories} transactions={transactions} setTransactions={setTransactions} goals={goals} />
      )}
      {tab === 'cal' && (
        <CalendarScreen categories={categories} transactions={transactions} setTransactions={setTransactions} goals={goals} setGoals={setGoals} />
      )}
      {tab === 'planner' && (
        <PlannerScreen categories={categories} goals={goals} setGoals={setGoals} recurringRules={recurringRules} setRecurringRules={setRecurringRules} />
      )}
      <View style={styles.tabBar}>
        {tabs.map(([key, label]) => (
          <TouchableOpacity key={key} onPress={() => setTab(key)} style={styles.tabBtn}>
            <Text style={{ color: tab === key ? t.accent : t.inkDim }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Main />
    </ThemeProvider>
  );
}

const makeStyles = (t) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: t.surface, paddingBottom: 24, paddingTop: 12, borderTopColor: t.edge, borderTopWidth: 1 },
  tabBtn: { flex: 1, alignItems: 'center' },
});