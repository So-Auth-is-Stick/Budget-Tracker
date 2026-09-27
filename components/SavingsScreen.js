import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Modal } from 'react-native';
import { addGoal, updateGoal, deleteGoal } from './goals';
import DatePickerModal from './DatePickerModal';
import GoalDetailModal from './GoalDetailModal';
import { daysUntil } from './dateUtils';

export default function SavingsScreen({ goals, setGoals }) {
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
    const t = parseFloat(target);
    if (!label.trim() || !t || t <= 0) return;
    setGoals(await addGoal({ id: 'goal_' + Date.now(), label: label.trim(), targetAmount: t, savedAmount: 0, note: note.trim(), dueDate }));
    setAddVisible(false);
  };
  const handleAddFunds = async (id, value) => {
    const g = goals.find((x) => x.id === id);
    const updated = await updateGoal(id, { savedAmount: g.savedAmount + value });
    setGoals(updated);
    setDetailGoal(updated.find((x) => x.id === id));
  };
  const handleUpdate = async (id, changes) => {
    const updated = await updateGoal(id, changes);
    setGoals(updated);
    setDetailGoal(null);
  };
  const handleDelete = async (id) => setGoals(await deleteGoal(id));

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Total saved</Text>
        <Text style={styles.heroAmt}>₱{totalSaved.toFixed(2)}</Text>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Savings & upcoming payments</Text>
        <TouchableOpacity onPress={openAdd}><Text style={styles.addLink}>+ Add</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 20 }}>
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
                <Text style={[styles.due, remaining < 0 && { color: '#D97A55' }]}>
                  {remaining < 0 ? `Overdue by ${Math.abs(remaining)}d` : remaining === 0 ? 'Due today' : `Due in ${remaining}d`}
                </Text>
              )}
              {!!g.note && <Text style={styles.note}>{g.note}</Text>}
              <Text style={styles.amt}>₱{g.savedAmount.toFixed(0)} / ₱{g.targetAmount.toFixed(0)}</Text>
              <View style={styles.track}><View style={[styles.fill, { width: `${pct}%` }]} /></View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal visible={addVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New savings goal</Text>
            <TextInput style={styles.textField} placeholder="Name (e.g. Emergency fund, Rent)" placeholderTextColor="#5E6F68" value={label} onChangeText={setLabel} />
            <TextInput style={styles.textField} keyboardType="decimal-pad" placeholder="Target amount" placeholderTextColor="#5E6F68" value={target} onChangeText={setTarget} />
            <TextInput style={styles.textField} placeholder="Note (optional)" placeholderTextColor="#5E6F68" value={note} onChangeText={setNote} />
            <TouchableOpacity style={styles.dateBtn} onPress={() => setDatePickerVisible(true)}>
              <Text style={{ color: '#F4EFE6' }}>{dueDate ? `Due ${dueDate}` : 'Set a due date (optional)'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={saveNew}><Text style={{ color: '#1B1200', fontWeight: '600' }}>Save</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setAddVisible(false)}><Text style={{ color: '#9FB0A8', textAlign: 'center', marginTop: 12 }}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
      <DatePickerModal visible={datePickerVisible} initialDate={dueDate} onConfirm={(d) => { setDueDate(d); setDatePickerVisible(false); }} onClose={() => setDatePickerVisible(false)} />
      <GoalDetailModal visible={!!detailGoal} goal={detailGoal} onClose={() => setDetailGoal(null)} onAddFunds={handleAddFunds} onUpdate={handleUpdate} onDelete={handleDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1A18', paddingTop: 60 },
  heroCard: { backgroundColor: '#1D2E27', borderRadius: 20, padding: 20, marginHorizontal: 20, marginBottom: 20 },
  heroLabel: { color: '#9FB0A8', fontSize: 13, marginBottom: 6 },
  heroAmt: { color: '#E8B84B', fontSize: 30, fontWeight: '700' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  sectionTitle: { color: '#9FB0A8', fontSize: 13 },
  addLink: { color: '#E8B84B', fontSize: 13, fontWeight: '600' },
  empty: { color: '#5E6F68', fontSize: 13 },
  card: { backgroundColor: '#E8B84B14', borderColor: '#E8B84B40', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8B84B30', alignItems: 'center', justifyContent: 'center' },
  name: { color: '#F4EFE6', fontSize: 15, fontWeight: '600' },
  due: { color: '#9FB0A8', fontSize: 12, marginBottom: 6 },
  note: { color: '#9FB0A8', fontSize: 12.5, marginBottom: 8 },
  amt: { color: '#F4EFE6', fontSize: 13, marginBottom: 6 },
  track: { height: 7, backgroundColor: '#0F1A18', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: '#E8B84B' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#16241F', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  sheetTitle: { color: '#F4EFE6', fontSize: 16, marginBottom: 16 },
  textField: { backgroundColor: '#1D2E27', borderRadius: 12, color: '#F4EFE6', padding: 12, fontSize: 14.5, marginBottom: 12 },
  dateBtn: { backgroundColor: '#1D2E27', borderRadius: 12, padding: 12, marginBottom: 16 },
  saveBtn: { backgroundColor: '#E8B84B', padding: 14, borderRadius: 14, alignItems: 'center' },
});