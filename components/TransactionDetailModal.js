import { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { findCategory } from './categories';
import { useTheme, readableOn } from './theme';

export default function TransactionDetailModal({ visible, item, categories, onClose, onDelete, onSave }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState(null);

  useEffect(() => {
    if (item) {
      setAmount(String(item.amount));
      setNote(item.note || '');
      setCategoryId(item.category);
      setEditing(false);
    }
  }, [item]);

  if (!item) return null;
  const cat = findCategory(categories, item.category);
  const sign = item.type === 'income' ? '+' : '−';
  const amountColor = item.type === 'income' ? t.gain : t.spend;

  const confirmDelete = () => {
    Alert.alert('Delete this entry?', `${cat.icon} ${cat.label} — ${sign}₱${item.amount.toFixed(2)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { onDelete(item.id); onClose(); } },
    ]);
  };

  const handleSaveEdit = () => {
    const value = parseFloat(amount);
    if (!value || value <= 0 || !categoryId) return;
    onSave(item.id, { amount: value, note: note.trim(), category: categoryId });
    setEditing(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {!editing ? (
            <>
              <Text style={styles.tag}>{cat.icon} {cat.label}</Text>
              <Text style={[styles.amount, { color: amountColor }]}>{sign}₱{item.amount.toFixed(2)}</Text>
              <Text style={styles.date}>{item.date}</Text>
              <Text style={styles.noteLabel}>Description</Text>
              <Text style={styles.note}>{item.note ? item.note : 'No description added.'}</Text>
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                <Text style={{ color: t.accent, fontWeight: '600' }}>Edit this entry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
                <Text style={{ color: t.spend, fontWeight: '600' }}>Delete this entry</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={{ marginTop: 14 }}>
                <Text style={{ color: t.inkDim, textAlign: 'center' }}>Close</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.tag}>Editing {item.type === 'income' ? 'earning' : 'expense'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginVertical: 14 }}>
                {categories.filter((c) => c.type === item.type).map((c) => (
                  <TouchableOpacity key={c.id} onPress={() => setCategoryId(c.id)}
                    style={[styles.chip, categoryId === c.id && { backgroundColor: c.color, borderColor: c.color }]}>
                    <Text style={{ color: categoryId === c.id ? readableOn(c.color) : t.ink }}>{c.icon} {c.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput style={styles.input} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
              <TextInput style={styles.textField} placeholder="Description" placeholderTextColor={t.inkFaint} value={note} onChangeText={setNote} />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={{ color: t.onAccent, fontWeight: '600' }}>Save changes</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditing(false)} style={{ marginTop: 12 }}>
                <Text style={{ color: t.inkDim, textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24 },
  tag: { color: t.ink, fontSize: 18, marginBottom: 6 },
  amount: { fontSize: 36, fontWeight: '600', marginBottom: 4 },
  date: { color: t.inkDim, fontSize: 13, marginBottom: 18 },
  noteLabel: { color: t.inkFaint, fontSize: 12, marginBottom: 4 },
  note: { color: t.ink, fontSize: 14.5, marginBottom: 20 },
  editBtn: { borderColor: t.accent, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
  deleteBtn: { borderColor: t.spend, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, borderColor: t.edge, backgroundColor: t.surface2, marginRight: 8 },
  input: { fontSize: 28, color: t.ink, textAlign: 'center', marginBottom: 14, borderBottomColor: t.edge, borderBottomWidth: 1, paddingBottom: 8 },
  textField: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 12, fontSize: 14.5, marginBottom: 16 },
  saveBtn: { backgroundColor: t.accent, padding: 14, borderRadius: 14, alignItems: 'center' },
});