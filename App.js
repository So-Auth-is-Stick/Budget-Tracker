import { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import PinScreen from './components/PinScreen';
import FeedScreen from './components/FeedScreen';
import CalendarScreen from './components/CalendarScreen';
import BudgetScreen from './components/BudgetScreen';
import PlannerScreen from './components/PlannerScreen';
import { loadCategories } from './components/categories';
import { loadTransactions, addTransactions } from './components/storage';
import { loadGoals } from './components/goals';
import { loadRecurring, saveRecurring } from './components/recurring';
import { processRecurring } from './components/recurringEngine';

export default function App() {
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
        const merged = await addTransactions(newTx);
        setTransactions(merged);
        await saveRecurring(updatedRules);
        setRecurringRules(updatedRules);
      } else {
        setTransactions(txs);
        setRecurringRules(rules);
      }
    }
    init();
  }, []);

  if (!unlocked) return <PinScreen onUnlock={() => setUnlocked(true)} />;

  return (
    <View style={{ flex: 1, backgroundColor: '#0F1A18' }}>
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
        <TouchableOpacity onPress={() => setTab('budget')} style={styles.tabBtn}>
          <Text style={{ color: tab === 'budget' ? '#E8B84B' : '#9FB0A8' }}>Budget</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('main')} style={styles.tabBtn}>
          <Text style={{ color: tab === 'main' ? '#E8B84B' : '#9FB0A8' }}>Balance</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('cal')} style={styles.tabBtn}>
          <Text style={{ color: tab === 'cal' ? '#E8B84B' : '#9FB0A8' }}>Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('planner')} style={styles.tabBtn}>
          <Text style={{ color: tab === 'planner' ? '#E8B84B' : '#9FB0A8' }}>Planner</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: '#16241F', paddingBottom: 24, paddingTop: 12, borderTopColor: '#2A3B34', borderTopWidth: 1 },
  tabBtn: { flex: 1, alignItems: 'center' },
});