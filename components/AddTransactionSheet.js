import { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import DatePickerModal from './DatePickerModal';
import { todayStr, formatLong } from './dateUtils';
import { useTheme, readableOn } from './theme';

export default function AddTransactionSheet({ visible, onClose, categories, onSave }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [type, setType] = useState('expense');
  const [categoryId, setCategoryId] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayStr());
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setType('expense'); setCategoryId(null); setAmount(''); setNote(''); setDate(todayStr());
    }
  }, [visible]);

  const value = parseFloat(amount);
  const valid = value > 0 && !!categoryId;
  const switchType = (next) => { setType(next); setCategoryId(null); };

  const save = async () => {
    if (!valid) return;
    await onSave({ id: Date.now(), type, amount: value, category: categoryId, note: note.trim(), date });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'expense' && { backgroundColor: t.spend + '26', borderColor: t.spend }]}
              onPress={() => switchType('expense')}>
              <Text style={{ color: t.ink }}>Spent</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'income' && { backgroundColor: t.gain + '26', borderColor: t.gain }]}
              onPress={() => switchType('income')}>
              <Text style={{ color: t.ink }}>Earned</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginBottom: 16 }}>
            {categories.filter((c) => c.type === type).map((c) => (
              <TouchableOpacity key={c.id} onPress={() => setCategoryId(c.id)}
                style={[styles.chip, categoryId === c.id && { backgroundColor: c.color, borderColor: c.color }]}>
                <Text style={{ color: categoryId === c.id ? readableOn(c.color) : t.ink }}>{c.icon} {c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={t.inkFaint} value={amount} onChangeText={setAmount} />
          <TextInput style={styles.noteInput} placeholder="Add a description (optional)" placeholderTextColor={t.inkFaint} value={note} onChangeText={setNote} />
          <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerVisible(true)}>
            <Text style={{ color: t.ink }}>📅 {date === todayStr() ? 'Today' : formatLong(date)}</Text>
            <Text style={{ color: t.inkFaint, fontSize: 12 }}>Change date</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.saveBtn, !valid && { opacity: 0.45 }]} onPress={save}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>

          <DatePickerModal visible={pickerVisible} initialDate={date} maxDate={todayStr()}
            onConfirm={(d) => { setDate(d); setPickerVisible(false); }} onClose={() => setPickerVisible(false)} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeBtn: { flex: 1, padding: 11, borderRadius: 12, backgroundColor: t.surface2, borderWidth: 1, borderColor: 'transparent', alignItems: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, borderColor: t.edge, backgroundColor: t.surface2, marginRight: 8 },
  input: { fontSize: 32, color: t.ink, textAlign: 'center', marginBottom: 14, borderBottomColor: t.edge, borderBottomWidth: 1, paddingBottom: 8 },
  noteInput: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 12, fontSize: 14.5, marginBottom: 10 },
  dateBtn: { backgroundColor: t.surface2, borderRadius: 12, padding: 12, marginBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saveBtn: { backgroundColor: t.accent, padding: 14, borderRadius: 14, alignItems: 'center' },
  saveText: { color: t.onAccent, fontWeight: '600' },
  cancel: { color: t.inkDim, textAlign: 'center', marginTop: 12 },
});
