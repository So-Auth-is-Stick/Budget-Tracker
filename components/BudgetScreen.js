import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { updateCategory } from './categories';
import { loadGoals, addGoal, updateGoal, deleteGoal } from './goals';
import { todayStr, monthOf } from './dateUtils';

export default function BudgetScreen({ categories, setCategories, transactions }) {
  const [goals, setGoals] = useState([]);
  const [budgetModalCat, setBudgetModalCat] = useState(null);
  const [budgetInput, setBudgetInput] = useState('');

  const [addGoalVisible, setAddGoalVisible] = useState(false);
  const [newGoalLabel, setNewGoalLabel] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalNote, setNewGoalNote] = useState('');

  const [fundsModalGoal, setFundsModalGoal] = useState(null);
  const [fundsInput, setFundsInput] = useState('');

  useEffect(() => { loadGoals().then(setGoals); }, []);

  const currentMonth = monthOf(todayStr());
  const expenseCats = categories.filter((c) => c.type === 'expense');

  const spentThisMonth = (categoryId) =>
    transactions
      .filter((t) => t.type === 'expense' && t.category === categoryId && monthOf(t.date) === currentMonth)
      .reduce((sum, t) => sum + t.amount, 0);

  const openBudgetModal = (cat) => {
    setBudgetModalCat(cat);
    setBudgetInput(cat.budget ? String(cat.budget) : '');
  };
  const saveBudget = async () => {
    const value = parseFloat(budgetInput);
    const updated = await updateCategory(budgetModalCat.id, { budget: value > 0 ? value : 0 });
    setCategories(updated);
    setBudgetModalCat(null);
  };

  const openAddGoal = () => {
    setNewGoalLabel(''); setNewGoalTarget(''); setNewGoalNote('');
    setAddGoalVisible(true);
  };
  const saveNewGoal = async () => {
    const target = parseFloat(newGoalTarget);
    if (!newGoalLabel.trim() || !target || target <= 0) return;
    const updated = await addGoal({
      id: 'goal_' + Date.now(),
      label: newGoalLabel.trim(),
      targetAmount: target,
      savedAmount: 0,
      note: newGoalNote.trim(),
    });
    setGoals(updated);
    setAddGoalVisible(false);
  };

  const openAddFunds = (goal) => { setFundsModalGoal(goal); setFundsInput(''); };
  const saveFunds = async () => {
    const value = parseFloat(fundsInput);
    if (!value || value <= 0) return;
    const updated = await updateGoal(fundsModalGoal.id, {
      savedAmount: fundsModalGoal.savedAmount + value,
    });
    setGoals(updated);
    setFundsModalGoal(null);
  };

  const confirmDeleteGoal = (goal) => {
    Alert.alert('Delete this goal?', goal.label, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => setGoals(await deleteGoal(goal.id)) },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        <Text style={styles.sectionTitle}>Monthly budgets</Text>
        {expenseCats.length === 0 && <Text style={styles.empty}>No spending tags yet.</Text>}
        {expenseCats.map((cat) => {
          const spent = spentThisMonth(cat.id);
          const budget = cat.budget || 0;
          const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
          const over = budget > 0 && spent > budget;
          return (
            <TouchableOpacity key={cat.id} style={styles.budgetRow} onPress={() => openBudgetModal(cat)}>
              <View style={styles.budgetTop}>
                <Text style={styles.budgetName}>{cat.icon} {cat.label}</Text>
                <Text style={[styles.budgetAmt, over && { color: '#D97A55' }]}>
                  ₱{spent.toFixed(0)} {budget > 0 ? `/ ₱${budget.toFixed(0)}` : '(no budget set)'}
                </Text>
              </View>
              {budget > 0 && (
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${pct}%`, backgroundColor: over ? '#D97A55' : cat.color }]} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={styles.divider} />

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Savings & upcoming payments</Text>
          <TouchableOpacity onPress={openAddGoal}><Text style={styles.addLink}>+ Add</Text></TouchableOpacity>
        </View>
        {goals.length === 0 && <Text style={styles.empty}>Nothing set aside yet.</Text>}
        {goals.map((g) => {
          const pct = Math.min(100, (g.savedAmount / g.targetAmount) * 100);
          return (
            <TouchableOpacity key={g.id} style={styles.budgetRow} onLongPress={() => confirmDeleteGoal(g)} onPress={() => openAddFunds(g)}>
              <View style={styles.budgetTop}>
                <Text style={styles.budgetName}>{g.label}</Text>
                <Text style={styles.budgetAmt}>₱{g.savedAmount.toFixed(0)} / ₱{g.targetAmount.toFixed(0)}</Text>
              </View>
              {!!g.note && <Text style={styles.goalNote}>{g.note}</Text>}
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: '#E8B84B' }]} />
              </View>
            </TouchableOpacity>
          );
        })}
        <Text style={styles.hint}>Tap a goal to add funds. Long-press to delete.</Text>
      </ScrollView>

      {/* Set budget modal */}
      <Modal visible={!!budgetModalCat} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{budgetModalCat?.icon} {budgetModalCat?.label} budget</Text>
            <TextInput
              style={styles.input} keyboardType="decimal-pad" placeholder="Monthly limit"
              placeholderTextColor="#5E6F68" value={budgetInput} onChangeText={setBudgetInput} autoFocus
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveBudget}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setBudgetModalCat(null)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add goal modal */}
      <Modal visible={addGoalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New savings goal</Text>
            <TextInput style={styles.textField} placeholder="Name (e.g. Emergency fund, New phone)" placeholderTextColor="#5E6F68" value={newGoalLabel} onChangeText={setNewGoalLabel} />
            <TextInput style={styles.textField} keyboardType="decimal-pad" placeholder="Target amount" placeholderTextColor="#5E6F68" value={newGoalTarget} onChangeText={setNewGoalTarget} />
            <TextInput style={styles.textField} placeholder="Note (optional, e.g. 'due December')" placeholderTextColor="#5E6F68" value={newGoalNote} onChangeText={setNewGoalNote} />
            <TouchableOpacity style={styles.saveBtn} onPress={saveNewGoal}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setAddGoalVisible(false)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add funds modal */}
      <Modal visible={!!fundsModalGoal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add funds — {fundsModalGoal?.label}</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#5E6F68" value={fundsInput} onChangeText={setFundsInput} autoFocus />
            <TouchableOpacity style={styles.saveBtn} onPress={saveFunds}><Text style={styles.saveBtnText}>Add</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setFundsModalGoal(null)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1A18', paddingTop: 60 },
  sectionTitle: { color: '#9FB0A8', fontSize: 13, paddingHorizontal: 20, marginBottom: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  addLink: { color: '#E8B84B', fontSize: 13, fontWeight: '600', marginBottom: 10 },
  empty: { color: '#5E6F68', fontSize: 13, paddingHorizontal: 20, marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#2A3B34', marginVertical: 22, marginHorizontal: 20 },
  budgetRow: { paddingHorizontal: 20, paddingVertical: 10 },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  budgetName: { color: '#F4EFE6', fontSize: 14.5 },
  budgetAmt: { color: '#9FB0A8', fontSize: 13 },
  goalNote: { color: '#5E6F68', fontSize: 12, marginBottom: 6 },
  track: { height: 7, backgroundColor: '#1D2E27', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  hint: { color: '#5E6F68', fontSize: 11.5, paddingHorizontal: 20, marginTop: 10 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#16241F', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  sheetTitle: { color: '#F4EFE6', fontSize: 16, marginBottom: 16 },
  input: { fontSize: 28, color: '#F4EFE6', textAlign: 'center', marginBottom: 18, borderBottomColor: '#2A3B34', borderBottomWidth: 1, paddingBottom: 8 },
  textField: { backgroundColor: '#1D2E27', borderRadius: 12, color: '#F4EFE6', padding: 12, fontSize: 14.5, marginBottom: 12 },
  saveBtn: { backgroundColor: '#E8B84B', padding: 14, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: '#1B1200', fontWeight: '600' },
  cancel: { color: '#9FB0A8', textAlign: 'center', marginTop: 12 },
});