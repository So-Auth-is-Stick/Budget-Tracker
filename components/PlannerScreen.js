import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Modal } from 'react-native';
import { addGoal, updateGoal, deleteGoal } from './goals';
import DatePickerModal from './DatePickerModal';
import GoalDetailModal from './GoalDetailModal';
import RecurringManager from './RecurringManager';
import { daysUntil } from './dateUtils';
import { useTheme } from './theme';

export default function PlannerScreen({ categories, goals, setGoals, recurringRules, setRecurringRules }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [addVisible, setAddVisible] = useState(false);
  const [label, setLabel] = useState('');
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [detailGoal, setDetailGoal] = useState(null);

  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);

  const openAdd = () => { setLabel(''); setTarget(''); setNote(''); setDueDate(null); setAddVisible(true); };
  const saveNew = async () => {
    const tg = parseFloat(target);
    if (!label.trim() || !tg || tg <= 0) return;
    setGoals(await addGoal({ id: 'goal_' + Date.now(), label: label.trim(), targetAmount: tg, savedAmount: 0, note: note.trim(), dueDate }));
    setAddVisible(false);
  };
  const handleAdjust = async (id, delta) => {
    const g = goals.find((x) => x.id === id);
    const updated = await updateGoal(id, { savedAmount: Math.max(0, g.savedAmount + delta) });
    setGoals(updated);
    setDetailGoal(updated.find((x) => x.id === id));
  };
  const handleUpdate = async (id, changes) => { setGoals(await updateGoal(id, changes)); setDetailGoal(null); };
  const handleDelete = async (id) => setGoals(await deleteGoal(id));

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Total saved</Text>
        <Text style={styles.heroAmt}>₱{totalSaved.toFixed(2)}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 20 }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Savings & upcoming payments</Text>
          <TouchableOpacity onPress={openAdd}><Text style={styles.addLink}>+ Add</Text></TouchableOpacity>
        </View>
        {goals.length === 0 && <Text style={styles.empty}>Nothing set aside yet.</Text>}
        {goals.map((g) => {
          const pct = Math.min(100, (g.savedAmount / g.targetAmount) * 100);
          const remaining = g.dueDate ? daysUntil(g.dueDate) : null;
          return (
            <TouchableOpacity key={g.id} style={styles.card} onPress={() => setDetailGoal(g)}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}><Text style={{ fontSize: 16 }}>🎯</Text></View>
                <Text style={styles.name}>{g.label}</Text>
              </View>
              {remaining !== null && (
                <Text style={[styles.due, remaining < 0 && { color: t.spend }]}>
                  {remaining < 0 ? `Overdue by ${Math.abs(remaining)}d` : remaining === 0 ? 'Due today' : `Due in ${remaining}d`}
                </Text>
              )}
              {!!g.note && <Text style={styles.note}>{g.note}</Text>}
              <Text style={styles.amt}>₱{g.savedAmount.toFixed(0)} / ₱{g.targetAmount.toFixed(0)}</Text>
              <View style={styles.track}><View style={[styles.fill, { width: `${pct}%` }]} /></View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.divider} />
        <RecurringManager categories={categories} rules={recurringRules} setRules={setRecurringRules} />
      </ScrollView>

      <Modal visible={addVisible} animationType="slide" transparent onRequestClose={() => setAddVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New savings goal</Text>
            <TextInput style={styles.textField} placeholder="Name (e.g. Emergency fund, Rent)" placeholderTextColor={t.inkFaint} value={label} onChangeText={setLabel} />
            <TextInput style={styles.textField} keyboardType="decimal-pad" placeholder="Target amount" placeholderTextColor={t.inkFaint} value={target} onChangeText={setTarget} />
            <TextInput style={styles.textField} placeholder="Note (optional)" placeholderTextColor={t.inkFaint} value={note} onChangeText={setNote} />
            <TouchableOpacity style={styles.dateBtn} onPress={() => setDatePickerVisible(true)}>
              <Text style={{ color: t.ink }}>{dueDate ? `Due ${dueDate}` : 'Set a due date (optional)'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={saveNew}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setAddVisible(false)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
            <DatePickerModal visible={datePickerVisible} initialDate={dueDate} onConfirm={(d) => { setDueDate(d); setDatePickerVisible(false); }} onClose={() => setDatePickerVisible(false)} />
          </View>
        </View>
      </Modal>

      <GoalDetailModal visible={!!detailGoal} goal={detailGoal} onClose={() => setDetailGoal(null)} onAdjustFunds={handleAdjust} onUpdate={handleUpdate} onDelete={handleDelete} />
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg, paddingTop: 60 },
  heroCard: { backgroundColor: t.surface2, borderRadius: 20, padding: 20, marginHorizontal: 20, marginBottom: 20 },
  heroLabel: { color: t.inkDim, fontSize: 13, marginBottom: 6 },
  heroAmt: { color: t.accent, fontSize: 30, fontWeight: '700' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: t.inkDim, fontSize: 13 },
  addLink: { color: t.accent, fontSize: 13, fontWeight: '600' },
  empty: { color: t.inkFaint, fontSize: 13, marginBottom: 10 },
  divider: { height: 1, backgroundColor: t.edge, marginVertical: 22 },
  card: { backgroundColor: t.accent + '18', borderColor: t.accent + '55', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: t.accent + '35', alignItems: 'center', justifyContent: 'center' },
  name: { color: t.ink, fontSize: 15, fontWeight: '600' },
  due: { color: t.inkDim, fontSize: 12, marginBottom: 6 },
  note: { color: t.inkDim, fontSize: 12.5, marginBottom: 8 },
  amt: { color: t.ink, fontSize: 13, marginBottom: 6 },
  track: { height: 7, backgroundColor: t.bg, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: t.accent },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  sheetTitle: { color: t.ink, fontSize: 16, marginBottom: 16 },
  textField: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 12, fontSize: 14.5, marginBottom: 12 },
  dateBtn: { backgroundColor: t.surface2, borderRadius: 12, padding: 12, marginBottom: 16 },
  saveBtn: { backgroundColor: t.accent, padding: 14, borderRadius: 14, alignItems: 'center' },
  saveText: { color: t.onAccent, fontWeight: '600' },
  cancel: { color: t.inkDim, textAlign: 'center', marginTop: 12 },
});