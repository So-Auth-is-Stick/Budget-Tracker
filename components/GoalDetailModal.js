import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import DatePickerModal from './DatePickerModal';
import { daysUntil } from './dateUtils';

export default function GoalDetailModal({ visible, goal, onClose, onAddFunds, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [fundsInput, setFundsInput] = useState('');
  const [label, setLabel] = useState('');
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    if (goal) {
      setEditing(false); setFundsInput('');
      setLabel(goal.label); setTarget(String(goal.targetAmount));
      setNote(goal.note || ''); setDueDate(goal.dueDate || null);
    }
  }, [goal]);

  if (!goal) return null;
  const pct = Math.min(100, (goal.savedAmount / goal.targetAmount) * 100);
  const remaining = goal.dueDate ? daysUntil(goal.dueDate) : null;

  const handleAddFunds = () => {
    const value = parseFloat(fundsInput);
    if (!value || value <= 0) return;
    onAddFunds(goal.id, value);
    setFundsInput('');
  };
  const handleSaveEdit = () => {
    const t = parseFloat(target);
    if (!label.trim() || !t || t <= 0) return;
    onUpdate(goal.id, { label: label.trim(), targetAmount: t, note: note.trim(), dueDate });
  };
  const confirmDelete = () => {
    Alert.alert('Delete this goal?', goal.label, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { onDelete(goal.id); onClose(); } },
    ]);
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {!editing ? (
              <>
                <Text style={styles.title}>🎯 {goal.label}</Text>
                <Text style={styles.amt}>₱{goal.savedAmount.toFixed(0)} / ₱{goal.targetAmount.toFixed(0)}</Text>
                <View style={styles.track}><View style={[styles.fill, { width: `${pct}%` }]} /></View>
                {remaining !== null && (
                  <Text style={[styles.due, remaining < 0 && { color: '#D97A55' }]}>
                    {remaining < 0 ? `Overdue by ${Math.abs(remaining)} day(s)` : remaining === 0 ? 'Due today' : `Due in ${remaining} day(s)`} — {goal.dueDate}
                  </Text>
                )}
                {!!goal.note && <Text style={styles.note}>{goal.note}</Text>}

                <Text style={styles.fieldLabel}>Add funds</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#5E6F68" value={fundsInput} onChangeText={setFundsInput} />
                  <TouchableOpacity style={styles.addFundsBtn} onPress={handleAddFunds}><Text style={{ color: '#1B1200', fontWeight: '600' }}>Add</Text></TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}><Text style={{ color: '#E8B84B', fontWeight: '600' }}>Edit goal</Text></TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}><Text style={{ color: '#D97A55', fontWeight: '600' }}>Delete goal</Text></TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={{ marginTop: 14 }}><Text style={{ color: '#9FB0A8', textAlign: 'center' }}>Close</Text></TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.title}>Edit goal</Text>
                <TextInput style={styles.textField} placeholder="Name" placeholderTextColor="#5E6F68" value={label} onChangeText={setLabel} />
                <TextInput style={styles.textField} keyboardType="decimal-pad" placeholder="Target amount" placeholderTextColor="#5E6F68" value={target} onChangeText={setTarget} />
                <TextInput style={styles.textField} placeholder="Note (optional)" placeholderTextColor="#5E6F68" value={note} onChangeText={setNote} />
                <TouchableOpacity style={styles.dateBtn} onPress={() => setDatePickerVisible(true)}>
                  <Text style={{ color: '#F4EFE6' }}>{dueDate ? `Due ${dueDate}` : 'Set a due date (optional)'}</Text>
                </TouchableOpacity>
                {!!dueDate && <TouchableOpacity onPress={() => setDueDate(null)}><Text style={{ color: '#5E6F68', fontSize: 12, marginBottom: 12 }}>Clear date</Text></TouchableOpacity>}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}><Text style={{ color: '#1B1200', fontWeight: '600' }}>Save changes</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setEditing(false)} style={{ marginTop: 12 }}><Text style={{ color: '#9FB0A8', textAlign: 'center' }}>Cancel</Text></TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
      <DatePickerModal visible={datePickerVisible} initialDate={dueDate} onConfirm={(d) => { setDueDate(d); setDatePickerVisible(false); }} onClose={() => setDatePickerVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#16241F', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  title: { color: '#F4EFE6', fontSize: 18, marginBottom: 8 },
  amt: { color: '#E8B84B', fontSize: 30, fontWeight: '700', marginBottom: 10 },
  track: { height: 8, backgroundColor: '#1D2E27', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  fill: { height: '100%', borderRadius: 4, backgroundColor: '#E8B84B' },
  due: { color: '#9FB0A8', fontSize: 12.5, marginBottom: 10 },
  note: { color: '#F4EFE6', fontSize: 13.5, marginBottom: 16 },
  fieldLabel: { color: '#5E6F68', fontSize: 12, marginBottom: 6 },
  input: { backgroundColor: '#1D2E27', borderRadius: 12, color: '#F4EFE6', padding: 12, fontSize: 18, textAlign: 'center' },
  addFundsBtn: { backgroundColor: '#E8B84B', paddingHorizontal: 18, borderRadius: 12, justifyContent: 'center' },
  editBtn: { borderColor: '#E8B84B', borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
  deleteBtn: { borderColor: '#D97A55', borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  textField: { backgroundColor: '#1D2E27', borderRadius: 12, color: '#F4EFE6', padding: 12, fontSize: 14.5, marginBottom: 12 },
  dateBtn: { backgroundColor: '#1D2E27', borderRadius: 12, padding: 12, marginBottom: 6 },
  saveBtn: { backgroundColor: '#E8B84B', padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 6 },
});