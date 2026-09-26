import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Modal, ScrollView } from 'react-native';
import { addTransaction, deleteTransaction, updateTransaction } from './storage';
import CategoryManager from './CategoryManager';
import TransactionRow from './TransactionRow';
import TransactionDetailModal from './TransactionDetailModal';
import ChangePinModal from './ChangePinModal';
import { findCategory } from './categories';
import { todayStr } from './dateUtils';

export default function FeedScreen({ categories, setCategories, transactions, setTransactions, goals }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState('expense');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [activeFilterCat, setActiveFilterCat] = useState(null);

  const balance = transactions.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0);
  const todaySpend = transactions.filter((t) => t.type === 'expense' && t.date === todayStr()).reduce((sum, t) => sum + t.amount, 0);
  const totalSaved = (goals || []).reduce((sum, g) => sum + g.savedAmount, 0);
  const safeToSpend = balance - totalSaved;

  const filteredTransactions = transactions.filter((t) => {
    const cat = findCategory(categories, t.category);
    const q = searchText.trim().toLowerCase();
    const matchesSearch = !q || (t.note || '').toLowerCase().includes(q) || cat.label.toLowerCase().includes(q);
    const matchesCat = !activeFilterCat || t.category === activeFilterCat;
    return matchesSearch && matchesCat;
  });

  const handleSave = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0 || !selectedCategoryId) return;
    const newTx = { id: Date.now(), type, amount: value, category: selectedCategoryId, note: note.trim(), date: todayStr() };
    setTransactions(await addTransaction(newTx));
    setAmount(''); setNote(''); setSelectedCategoryId(null); setModalVisible(false);
  };
  const handleDelete = async (id) => setTransactions(await deleteTransaction(id));
  const handleEditSave = async (id, changes) => setTransactions(await updateTransaction(id, changes));
  const openAddSheet = () => { setType('expense'); setSelectedCategoryId(null); setModalVisible(true); };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.iconCol}>
          <TouchableOpacity onPress={() => setPinModalVisible(true)}><Text style={{ fontSize: 18 }}>⚙️</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setCategoryModalVisible(true)}><Text style={{ fontSize: 18 }}>🏷️</Text></TouchableOpacity>
        </View>
        <View style={styles.balanceCol}>
          <Text style={styles.label}>Balance</Text>
          <Text style={styles.balance}>₱{balance.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Spent today</Text>
        <Text style={styles.statValue}>₱{todaySpend.toFixed(2)}</Text>
      </View>
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Safe to spend</Text>
        <Text style={[styles.statValue, { color: safeToSpend >= 0 ? '#7FC29B' : '#D97A55' }]}>₱{safeToSpend.toFixed(2)}</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput style={styles.searchInput} placeholder="Search description or tag" placeholderTextColor="#5E6F68" value={searchText} onChangeText={setSearchText} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
        style={styles.filterScroll}
      >
        {categories.map((c) => (
          <TouchableOpacity key={c.id} onPress={() => setActiveFilterCat(activeFilterCat === c.id ? null : c.id)}
            style={[styles.filterChip, activeFilterCat === c.id && { backgroundColor: c.color, borderColor: c.color }]}>
            <Text style={[styles.filterChipText, activeFilterCat === c.id && { color: '#1B1200' }]}>{c.icon} {c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={[...filteredTransactions].reverse()}
        keyExtractor={(item) => String(item.id)}
        style={{ width: '100%' }}
        contentContainerStyle={{ paddingBottom: 160 }}
        renderItem={({ item }) => <TransactionRow item={item} categories={categories} onPress={setDetailItem} />}
        ListEmptyComponent={<Text style={styles.empty}>No transactions match.</Text>}
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginBottom: 16 }}>
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

      <TransactionDetailModal visible={!!detailItem} item={detailItem} categories={categories} onClose={() => setDetailItem(null)} onDelete={handleDelete} onSave={handleEditSave} />
      <ChangePinModal visible={pinModalVisible} onClose={() => setPinModalVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1A18', paddingTop: 60 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 16 },
  iconCol: { flexDirection: 'row', gap: 16, paddingTop: 8 },
  balanceCol: { alignItems: 'flex-end' },
  label: { color: '#9FB0A8', fontSize: 13 },
  balance: { color: '#F4EFE6', fontSize: 46, fontWeight: '700' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, marginBottom: 6 },
  statLabel: { color: '#9FB0A8', fontSize: 13.5 },
  statValue: { color: '#D97A55', fontSize: 15, fontWeight: '600' },
  searchRow: { width: '100%', paddingHorizontal: 20, marginTop: 14, marginBottom: 10 },
  searchInput: { backgroundColor: '#1D2E27', borderRadius: 12, color: '#F4EFE6', padding: 10, fontSize: 13.5 },
  filterScroll: { height: 46, marginBottom: 12 },
  filterScrollContent: { alignItems: 'center', paddingLeft: 20, paddingRight: 8 },
  filterChip: {
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18,
    borderWidth: 1, borderColor: '#2A3B34', backgroundColor: '#1D2E27',
    marginRight: 8, minHeight: 36, justifyContent: 'center', alignItems: 'center',
  },
  filterChipText: { color: '#F4EFE6', fontSize: 12.5, includeFontPadding: false, textAlignVertical: 'center' },
  empty: { color: '#5E6F68', textAlign: 'center', marginTop: 30 },
  fab: { position: 'absolute', bottom: 100, left: '50%', transform: [{ translateX: -110 }], backgroundColor: '#E8B84B', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16 },
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