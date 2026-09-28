import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import DatePickerModal from './DatePickerModal';
import { daysUntil } from './dateUtils';
import { useTheme } from './theme';

export default function GoalDetailModal({ visible, goal, onClose, onAdjustFunds, onUpdate, onDelete }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [editing, setEditing] = useState(false);
  const [fundsInput, setFundsInput] = useState('');
  const [label, setLabel] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    if (goal) {
      setEditing(false); setFundsInput('');
      setLabel(goal.label); setTarget(String(goal.targetAmount)); setSaved(String(goal.savedAmount));
      setNote(goal.note || ''); setDueDate(goal.dueDate || null);
    }
  }, [goal]);

  if (!goal) return null;
  const pct = Math.min(100, (goal.savedAmount / goal.targetAmount) * 100);
  const remaining = goal.dueDate ? daysUntil(goal.dueDate) : null;

  const handleAdd = () => {
    const v = parseFloat(fundsInput);
    if (!v || v <= 0) return;
    onAdjustFunds(goal.id, v);
  };
  const handleWithdraw = () => {
    const v = parseFloat(fundsInput);
    if (!v || v <= 0) return;
    if (v > goal.savedAmount) {
      Alert.alert('Not enough saved', `Only ₱${goal.savedAmount.toFixed(2)} is saved in this goal.`);
      return;
    }
    onAdjustFunds(goal.id, -v);
  };
  const handleSaveEdit = () => {
    const tg = parseFloat(target);
    const sv = parseFloat(saved);
    if (!label.trim() || !tg || tg <= 0 || isNaN(sv)) return;
    onUpdate(goal.id, { label: label.trim(), targetAmount: tg, savedAmount: Math.max(0, sv), note: note.trim(), dueDate });
  };
  const confirmDelete = () => {
    Alert.alert('Delete this goal?', goal.label, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { onDelete(goal.id); onClose(); } },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {!editing ? (
            <>
              <Text style={styles.title}>🎯 {goal.label}</Text>
              <Text style={styles.amt}>₱{goal.savedAmount.toFixed(0)} / ₱{goal.targetAmount.toFixed(0)}</Text>
              <View style={styles.track}><View style={[styles.fill, { width: `${pct}%` }]} /></View>
              {remaining !== null && (
                <Text style={[styles.due, remaining < 0 && { color: t.spend }]}>
                  {remaining < 0 ? `Overdue by ${Math.abs(remaining)} day(s)` : remaining === 0 ? 'Due today' : `Due in ${remaining} day(s)`} — {goal.dueDate}
                </Text>
              )}
              {!!goal.note && <Text style={styles.note}>{goal.note}</Text>}

              <Text style={styles.fieldLabel}>Adjust saved amount</Text>
              <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={t.inkFaint} value={fundsInput} onChangeText={setFundsInput} />
              <View style={styles.adjustRow}>
                <TouchableOpacity style={[styles.adjustBtn, { backgroundColor: t.accent }]} onPress={handleAdd}>
                  <Text style={{ color: t.onAccent, fontWeight: '600' }}>+ Add</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.adjustBtn, { borderColor: t.spend, borderWidth: 1 }]} onPress={handleWithdraw}>
                  <Text style={{ color: t.spend, fontWeight: '600' }}>− Withdraw</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}><Text style={{ color: t.accent, fontWeight: '600' }}>Edit goal</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}><Text style={{ color: t.spend, fontWeight: '600' }}>Delete goal</Text></TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={{ marginTop: 14 }}><Text style={{ color: t.inkDim, textAlign: 'center' }}>Close</Text></TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Edit goal</Text>
              <TextInput style={styles.textField} placeholder="Name" placeholderTextColor={t.inkFaint} value={label} onChangeText={setLabel} />
              <Text style={styles.fieldLabel}>Target amount</Text>
              <TextInput style={styles.textField} keyboardType="decimal-pad" value={target} onChangeText={setTarget} />
              <Text style={styles.fieldLabel}>Saved so far</Text>
              <TextInput style={styles.textField} keyboardType="decimal-pad" value={saved} onChangeText={setSaved} />
              <TextInput style={styles.textField} placeholder="Note (optional)" placeholderTextColor={t.inkFaint} value={note} onChangeText={setNote} />
              <TouchableOpacity style={styles.dateBtn} onPress={() => setDatePickerVisible(true)}>
                <Text style={{ color: t.ink }}>{dueDate ? `Due ${dueDate}` : 'Set a due date (optional)'}</Text>
              </TouchableOpacity>
              {!!dueDate && <TouchableOpacity onPress={() => setDueDate(null)}><Text style={{ color: t.inkFaint, fontSize: 12, marginBottom: 12 }}>Clear date</Text></TouchableOpacity>}
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}><Text style={{ color: t.onAccent, fontWeight: '600' }}>Save changes</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setEditing(false)} style={{ marginTop: 12 }}><Text style={{ color: t.inkDim, textAlign: 'center' }}>Cancel</Text></TouchableOpacity>
            </>
          )}
          <DatePickerModal visible={datePickerVisible} initialDate={dueDate} onConfirm={(d) => { setDueDate(d); setDatePickerVisible(false); }} onClose={() => setDatePickerVisible(false)} />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  title: { color: t.ink, fontSize: 18, marginBottom: 8 },
  amt: { color: t.accent, fontSize: 30, fontWeight: '700', marginBottom: 10 },
  track: { height: 8, backgroundColor: t.surface2, borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  fill: { height: '100%', borderRadius: 4, backgroundColor: t.accent },
  due: { color: t.inkDim, fontSize: 12.5, marginBottom: 10 },
  note: { color: t.ink, fontSize: 13.5, marginBottom: 14 },
  fieldLabel: { color: t.inkFaint, fontSize: 12, marginBottom: 6 },
  input: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 12, fontSize: 18, textAlign: 'center', marginBottom: 10 },
  adjustRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  adjustBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  editBtn: { borderColor: t.accent, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
  deleteBtn: { borderColor: t.spend, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  textField: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 12, fontSize: 14.5, marginBottom: 12 },
  dateBtn: { backgroundColor: t.surface2, borderRadius: 12, padding: 12, marginBottom: 6 },
  saveBtn: { backgroundColor: t.accent, padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 6 },
});