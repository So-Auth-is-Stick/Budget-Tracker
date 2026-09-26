import { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { findCategory } from './categories';

export default function TransactionDetailModal({ visible, item, categories, onClose, onDelete, onSave }) {
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
  const amountColor = item.type === 'income' ? '#7FC29B' : '#D97A55';

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
    <Modal visible={visible} animationType="slide" transparent>
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
                <Text style={{ color: '#E8B84B', fontWeight: '600' }}>Edit this entry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
                <Text style={{ color: '#D97A55', fontWeight: '600' }}>Delete this entry</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={{ marginTop: 14 }}>
                <Text style={{ color: '#9FB0A8', textAlign: 'center' }}>Close</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.tag}>Editing {item.type === 'income' ? 'earning' : 'expense'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginVertical: 14 }}>
                {categories.filter((c) => c.type === item.type).map((c) => (
                  <TouchableOpacity key={c.id} onPress={() => setCategoryId(c.id)}
                    style={[styles.chip, categoryId === c.id && { backgroundColor: c.color, borderColor: c.color }]}>
                    <Text style={{ color: categoryId === c.id ? '#1B1200' : '#F4EFE6' }}>{c.icon} {c.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput style={styles.input} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
              <TextInput style={styles.textField} placeholder="Description" placeholderTextColor="#5E6F68" value={note} onChangeText={setNote} />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={{ color: '#1B1200', fontWeight: '600' }}>Save changes</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditing(false)} style={{ marginTop: 12 }}>
                <Text style={{ color: '#9FB0A8', textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#16241F', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24 },
  tag: { color: '#F4EFE6', fontSize: 18, marginBottom: 6 },
  amount: { fontSize: 36, fontWeight: '600', marginBottom: 4 },
  date: { color: '#9FB0A8', fontSize: 13, marginBottom: 18 },
  noteLabel: { color: '#5E6F68', fontSize: 12, marginBottom: 4 },
  note: { color: '#F4EFE6', fontSize: 14.5, marginBottom: 20 },
  editBtn: { borderColor: '#E8B84B', borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
  deleteBtn: { borderColor: '#D97A55', borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, borderColor: '#2A3B34', backgroundColor: '#1D2E27', marginRight: 8 },
  input: { fontSize: 28, color: '#F4EFE6', textAlign: 'center', marginBottom: 14, borderBottomColor: '#2A3B34', borderBottomWidth: 1, paddingBottom: 8 },
  textField: { backgroundColor: '#1D2E27', borderRadius: 12, color: '#F4EFE6', padding: 12, fontSize: 14.5, marginBottom: 16 },
  saveBtn: { backgroundColor: '#E8B84B', padding: 14, borderRadius: 14, alignItems: 'center' },
});