import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Modal } from 'react-native';
import { loadTransactions, addTransaction, deleteTransaction } from './storage';

export default function FeedScreen() {
  const [transactions, setTransactions] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');

  useEffect(() => {
    loadTransactions().then(setTransactions);
  }, []);

  const balance = transactions.reduce((sum, t) => {
    return t.type === 'income' ? sum + t.amount : sum - t.amount;
  }, 0);

  const handleSave = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) return;
    const newTx = {
      id: Date.now(),
      type,
      amount: value,
      date: new Date().toISOString().slice(0, 10),
    };
    const updated = await addTransaction(newTx);
    setTransactions(updated);
    setAmount('');
    setModalVisible(false);
  };

  const handleDelete = async (id) => {
    const updated = await deleteTransaction(id);
    setTransactions(updated);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Balance</Text>
      <Text style={styles.balance}>₱{balance.toFixed(2)}</Text>

      <FlatList
        data={[...transactions].reverse()}
        keyExtractor={(item) => String(item.id)}
        style={{ width: '100%' }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={{ color: item.type === 'income' ? '#7FC29B' : '#D97A55' }}>
              {item.type === 'income' ? '+' : '−'}₱{item.amount.toFixed(2)}
            </Text>
            <Text style={styles.date}>{item.date}</Text>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text style={{ color: '#5E6F68' }}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No transactions yet.</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+ Add transaction</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'expense' && styles.typeBtnActive]}
                onPress={() => setType('expense')}
              >
                <Text style={{ color: '#F4EFE6' }}>Spent</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'income' && styles.typeBtnActive]}
                onPress={() => setType('income')}
              >
                <Text style={{ color: '#F4EFE6' }}>Earned</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#5E6F68"
              value={amount}
              onChangeText={setAmount}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={{ color: '#1B1200', fontWeight: '600' }}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: '#9FB0A8', textAlign: 'center', marginTop: 12 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1A18', alignItems: 'center', paddingTop: 60 },
  label: { color: '#9FB0A8', fontSize: 13 },
  balance: { color: '#F4EFE6', fontSize: 40, marginBottom: 20 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, borderBottomColor: '#2A3B34', borderBottomWidth: 1,
  },
  date: { color: '#5E6F68', fontSize: 12 },
  empty: { color: '#5E6F68', textAlign: 'center', marginTop: 30 },
  fab: {
    position: 'absolute', bottom: 40, backgroundColor: '#E8B84B',
    paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16,
  },
  fabText: { color: '#1B1200', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#16241F', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: '#1D2E27', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#2A3B34' },
  input: {
    fontSize: 32, color: '#F4EFE6', textAlign: 'center', marginBottom: 20,
    borderBottomColor: '#2A3B34', borderBottomWidth: 1, paddingBottom: 8,
  },
  saveBtn: { backgroundColor: '#E8B84B', padding: 14, borderRadius: 14, alignItems: 'center' },
});