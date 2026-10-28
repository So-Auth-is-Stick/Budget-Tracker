import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme, readableOn } from './theme';
import { peso } from './format';

// Turns a plan into a real expense. Used from the plan's detail sheet and from the "Due now" prompt.
export default function CommitGoalModal({ visible, goal, categories, onClose, onConfirm }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible && goal) {
      setAmount(String(goal.targetAmount)); setNote(goal.label); setCategoryId(null); setBusy(false);
    }
  }, [visible, goal]);

  if (!goal) return null;
  const value = parseFloat(amount);
  const valid = value > 0 && !!categoryId && !busy;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    await onConfirm({ amount: value, category: categoryId, note: note.trim() || goal.label });
    setBusy(false);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <Text style={styles.title}>Commit: {goal.label}</Text>
          <Text style={styles.sub}>
            This records an expense for today
            {goal.savedAmount > 0 ? ` and releases the ${peso(goal.savedAmount, 0)} you set aside.` : '.'}
          </Text>

          <Text style={styles.fieldLabel}>Amount paid</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />

          <Text style={styles.fieldLabel}>Record it under</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginBottom: 14 }}>
            {categories.filter((c) => c.type === 'expense').map((c) => (
              <TouchableOpacity key={c.id} onPress={() => setCategoryId(c.id)}
                style={[styles.chip, categoryId === c.id && { backgroundColor: c.color, borderColor: c.color }]}>
                <Text style={{ color: categoryId === c.id ? readableOn(c.color) : t.ink }}>{c.icon} {c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput style={styles.noteInput} placeholder="Description" placeholderTextColor={t.inkFaint} value={note} onChangeText={setNote} />

          <TouchableOpacity style={[styles.confirmBtn, !valid && { opacity: 0.45 }]} onPress={submit}>
            <Text style={styles.confirmText}>Record expense</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Not now</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: t.surface, borderRadius: 22, padding: 20 },
  title: { color: t.ink, fontSize: 17, fontWeight: '600', marginBottom: 6 },
  sub: { color: t.inkDim, fontSize: 13, marginBottom: 16, lineHeight: 18 },
  fieldLabel: { color: t.inkFaint, fontSize: 12, marginBottom: 6 },
  input: { fontSize: 28, color: t.ink, textAlign: 'center', marginBottom: 16, borderBottomColor: t.edge, borderBottomWidth: 1, paddingBottom: 6 },
  chip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, borderColor: t.edge, backgroundColor: t.surface2, marginRight: 8 },
  noteInput: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 12, fontSize: 14.5, marginBottom: 16 },
  confirmBtn: { backgroundColor: t.accent, padding: 14, borderRadius: 14, alignItems: 'center' },
  confirmText: { color: t.onAccent, fontWeight: '600' },
  cancel: { color: t.inkDim, textAlign: 'center', marginTop: 12 },
});
