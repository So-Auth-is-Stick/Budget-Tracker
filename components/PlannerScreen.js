import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addGoal, updateGoal, deleteGoal, canCommit } from './goals';
import DatePickerModal from './DatePickerModal';
import GoalDetailModal from './GoalDetailModal';
import RecurringManager from './RecurringManager';
import { sortByRecent } from './sortUtils';
import { useToday } from './useToday';
import { useTheme } from './theme';

export default function PlannerScreen({ categories, goals, setGoals, recurringRules, setRecurringRules, onCommitGoal }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const today = useToday();
  const [addVisible, setAddVisible] = useState(false);
  const [label, setLabel] = useState('');
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [detailGoal, setDetailGoal] = useState(null);
  const [startCommit, setStartCommit] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recurringToken, setRecurringToken] = useState(0); // bump to open the recurring 'new' sheet

  // Most recently changed first
  const activeGoals = sortByRecent(goals.filter((g) => !g.committed));
  const doneGoals = sortByRecent(goals.filter((g) => g.committed), 'committedAt');
  const totalSaved = activeGoals.reduce((s, g) => s + g.savedAmount, 0);

  const openDetail = (goal, commitFirst) => { setStartCommit(commitFirst); setDetailGoal(goal); };
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
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {menuOpen && <TouchableOpacity activeOpacity={1} style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} />}
      <View style={styles.heroWrap}>
        <View style={styles.heroCard}>
          <View>
            <Text style={styles.heroLabel}>Total saved</Text>
            <Text style={styles.heroAmt}>₱{totalSaved.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.plusBtn} onPress={() => setMenuOpen((v) => !v)} accessibilityLabel="Add new">
            <Text style={styles.plusText}>{menuOpen ? '×' : '+'}</Text>
          </TouchableOpacity>
        </View>
        {menuOpen && (
          <View style={styles.menu}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); openAdd(); }}>
              <Text style={styles.menuText}>🎯  Savings / payment</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); setRecurringToken((n) => n + 1); }}>
              <Text style={styles.menuText}>🔁  Recurring</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 20 }}>
        <Text style={styles.sectionTitle}>Savings & upcoming payments</Text>
        {activeGoals.length === 0 && <Text style={styles.empty}>Nothing set aside yet.</Text>}
        {activeGoals.map((g) => {
          const pct = Math.min(100, (g.savedAmount / g.targetAmount) * 100);
          const ready = canCommit(g, today);
          return (
            <TouchableOpacity key={g.id} style={styles.card} onPress={() => openDetail(g, false)}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}><Text style={{ fontSize: 14 }}>🎯</Text></View>
                <Text style={styles.name} numberOfLines={1}>{g.label}</Text>
                {ready && (
                  <TouchableOpacity style={styles.commitPill} onPress={() => openDetail(g, true)}>
                    <Text style={styles.commitPillText}>Commit</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.track}><View style={[styles.fill, { width: `${pct}%` }]} /></View>
              <Text style={styles.amt}>₱{g.savedAmount.toFixed(0)} / ₱{g.targetAmount.toFixed(0)}</Text>
            </TouchableOpacity>
          );
        })}

        {doneGoals.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Completed</Text>
            {doneGoals.map((g) => (
              <TouchableOpacity key={g.id} style={styles.doneRow} onPress={() => openDetail(g, false)}>
                <Text style={styles.doneName}>✅ {g.label}</Text>
                <Text style={styles.doneAmt}>₱{(g.committedAmount ?? g.targetAmount).toFixed(0)}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={styles.divider} />
        <RecurringManager categories={categories} rules={recurringRules} setRules={setRecurringRules} openAddToken={recurringToken} />
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

      <GoalDetailModal
        visible={!!detailGoal}
        goal={detailGoal}
        categories={categories}
        startCommit={startCommit}
        onClose={() => setDetailGoal(null)}
        onAdjustFunds={handleAdjust}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onCommit={onCommitGoal}
      />
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  heroWrap: { marginHorizontal: 20, marginBottom: 20, zIndex: 10 },
  heroCard: { backgroundColor: t.surface2, borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plusBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' },
  plusText: { color: t.onAccent, fontSize: 26, lineHeight: 30, fontWeight: '500' },
  menuBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 },
  menu: { position: 'absolute', top: 66, right: 14, backgroundColor: t.surface, borderColor: t.edge, borderWidth: 1, borderRadius: 14, paddingVertical: 4, minWidth: 190, elevation: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  menuItem: { paddingVertical: 13, paddingHorizontal: 16 },
  menuText: { color: t.ink, fontSize: 14.5 },
  menuDivider: { height: 1, backgroundColor: t.edge },
  heroLabel: { color: t.inkDim, fontSize: 13, marginBottom: 6 },
  heroAmt: { color: t.accent, fontSize: 30, fontWeight: '700' },
  sectionTitle: { color: t.inkDim, fontSize: 13, marginBottom: 10 },
  empty: { color: t.inkFaint, fontSize: 13, marginBottom: 10 },
  divider: { height: 1, backgroundColor: t.edge, marginVertical: 22 },
  card: { backgroundColor: t.accent + '18', borderColor: t.accent + '55', borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: t.accent + '35', alignItems: 'center', justifyContent: 'center' },
  name: { color: t.ink, fontSize: 15, fontWeight: '600', flex: 1 },
  amt: { color: t.inkDim, fontSize: 11.5, marginTop: 6 },
  track: { height: 7, backgroundColor: t.bg, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: t.accent },
  commitPill: { backgroundColor: t.accent, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 12 },
  commitPillText: { color: t.onAccent, fontWeight: '700', fontSize: 12 },
  doneRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomColor: t.edge, borderBottomWidth: 1 },
  doneName: { color: t.inkDim, fontSize: 14 },
  doneAmt: { color: t.inkDim, fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  sheetTitle: { color: t.ink, fontSize: 16, marginBottom: 16 },
  textField: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 12, fontSize: 14.5, marginBottom: 12 },
  dateBtn: { backgroundColor: t.surface2, borderRadius: 12, padding: 12, marginBottom: 16 },
  saveBtn: { backgroundColor: t.accent, padding: 14, borderRadius: 14, alignItems: 'center' },
  saveText: { color: t.onAccent, fontWeight: '600' },
  cancel: { color: t.inkDim, textAlign: 'center', marginTop: 12 },
});
