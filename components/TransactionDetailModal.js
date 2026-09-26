import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { findCategory } from './categories';

export default function TransactionDetailModal({ visible, item, categories, onClose, onDelete }) {
  if (!item) return null;
  const cat = findCategory(categories, item.category);
  const sign = item.type === 'income' ? '+' : '−';
  const amountColor = item.type === 'income' ? '#7FC29B' : '#D97A55';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.tag}>{cat.icon} {cat.label}</Text>
          <Text style={[styles.amount, { color: amountColor }]}>{sign}₱{item.amount.toFixed(2)}</Text>
          <Text style={styles.date}>{item.date}</Text>
          <Text style={styles.noteLabel}>Description</Text>
          <Text style={styles.note}>{item.note ? item.note : 'No description added.'}</Text>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => { onDelete(item.id); onClose(); }}>
            <Text style={{ color: '#D97A55', fontWeight: '600' }}>Delete this entry</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 14 }}>
            <Text style={{ color: '#9FB0A8', textAlign: 'center' }}>Close</Text>
          </TouchableOpacity>
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
  deleteBtn: { borderColor: '#D97A55', borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
});