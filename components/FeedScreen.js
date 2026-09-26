import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Modal, ScrollView } from 'react-native';
import { loadTransactions, addTransaction, deleteTransaction } from './storage';
import CategoryManager from './CategoryManager';
import TransactionRow from './TransactionRow';
import TransactionDetailModal from './TransactionDetailModal';

export default function FeedScreen({ categories, setCategories }) {
  const [transactions, setTransactions] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState('expense');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  useEffect(() => { loadTransactions().then(setTransactions); }, []);

  const balance = transactions.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0);

  const handleSave = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0 || !selectedCategoryId) return;
    const newTx = { id: Date.now(), type, amount: value, category: selectedCategoryId, note: note.trim(), date: new Date().toISOString().slice(0, 10) };
    setTransactions(await addTransaction(newTx));
    setAmount(''); setNote(''); setSelectedCategoryId(null); setModalVisible(false);
  };
  const handleDelete = async (id) => setTransactions(await deleteTransaction(id));
  const openAddSheet = () => { setType('expense'); setSelectedCategoryId(null); setModalVisible(true); };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerHello}>Today</Text>
        <TouchableOpacity onPress={() => setCategoryModalVisible(true)}><Text style={{ fontSize: 18 }}>🏷️</Text></TouchableOpacity>
      </View>
      <Text style={styles.label}>Balance</Text>
      <Text style={styles.balance}>₱{balance.toFixed(2)}</Text>

      <FlatList
        data={[...transactions].reverse()}
        keyExtractor={(item) => String(item.id)}
        style={{ width: '100%' }}
        contentContainerStyle={{ paddingBottom: 160 }}
        renderItem={({ item }) => (
          <TransactionRow item={item} categories={categories} onPress={setDetailItem} onDelete={handleDelete} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No transactions yet.</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={openAddSheet}>
        <Text style={styles.fabText}>+ Add transaction</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.typeRow}>
              <TouchableOpacity style={[styles.typeBtn, type === 'expense' && styles.typeBtnActive]} onPress={() => { setType('expense'); setSelectedCategoryId(null); }}>
                <Text style={{ color: '#F4EFE6' }}>Spent</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, type === 'income' && styles.typeBtnActive]} onPress={() => { setType('income'); setSelectedCategoryId(null); }}>
                <Text style={{ color: '#F4EFE6' }}>Earned</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {categories.filter((c) => c.type === type).map((c) => (
                <TouchableOpacity key={c.id} onPress={() => setSelectedCategoryId(c.id)}
                  style={[styles.chip, selectedCategoryId === c.id && { backgroundColor: c.color, borderColor: c.color }]}>
                  <Text style={{ color: selectedCategoryId === c.id ? '#1B1200' : '#F4EFE6' }}>{c.icon} {c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#5E6F68" value={amount} onChangeText={setAmount} />
            <TextInput style={styles.noteInput} placeholder="Add a description (optional)" placeholderTextColor="#5E6F68" value={note} onChangeText={setNote} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={{ color: '#1B1200', fontWeight: '600' }}>Save</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{ color: '#9FB0A8', textAlign: 'center', marginTop: 12 }}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={categoryModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <CategoryManager categories={categories} setCategories={setCategories} />
            <TouchableOpacity onPress={() => setCategoryModalVisible(false)} style={{ marginTop: 14 }}>
              <Text style={{ color: '#9FB0A8', textAlign: 'center' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TransactionDetailModal visible={!!detailItem} item={detailItem} categories={categories} onClose={() => setDetailItem(null)} onDelete={handleDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1A18', alignItems: 'center', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 20, marginBottom: 8 },
  headerHello: { color: '#9FB0A8', fontSize: 14 },
  label: { color: '#9FB0A8', fontSize: 13 },
  balance: { color: '#F4EFE6', fontSize: 40, marginBottom: 20 },
  empty: { color: '#5E6F68', textAlign: 'center', marginTop: 30 },
  fab: { position: 'absolute', bottom: 100, backgroundColor: '#E8B84B', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16 },
  fabText: { color: '#1B1200', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#16241F', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: '#1D2E27', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#2A3B34' },
  chip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, borderColor: '#2A3B34', backgroundColor: '#1D2E27', marginRight: 8 },
  input: { fontSize: 32, color: '#F4EFE6', textAlign: 'center', marginBottom: 14, borderBottomColor: '#2A3B34', borderBottomWidth: 1, paddingBottom: 8 },
  noteInput: { backgroundColor: '#1D2E27', borderRadius: 12, color: '#F4EFE6', padding: 12, fontSize: 14.5, marginBottom: 18 },
  saveBtn: { backgroundColor: '#E8B84B', padding: 14, borderRadius: 14, alignItems: 'center' },
});