import { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Modal, ScrollView } from 'react-native';
import { addTransaction, deleteTransaction, updateTransaction } from './storage';
import CategoryManager from './CategoryManager';
import TransactionRow from './TransactionRow';
import TransactionDetailModal from './TransactionDetailModal';
import SettingsModal from './SettingsModal';
import { findCategory } from './categories';
import { todayStr } from './dateUtils';
import { useTheme, readableOn } from './theme';

export default function FeedScreen({ categories, setCategories, transactions, setTransactions, goals }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState('expense');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [activeFilterCat, setActiveFilterCat] = useState(null);

  const balance = transactions.reduce((sum, tx) => tx.type === 'income' ? sum + tx.amount : sum - tx.amount, 0);
  const todaySpend = transactions.filter((tx) => tx.type === 'expense' && tx.date === todayStr()).reduce((sum, tx) => sum + tx.amount, 0);
  const totalSaved = (goals || []).reduce((sum, g) => sum + g.savedAmount, 0);
  const safeToSpend = balance - totalSaved;

  const filteredTransactions = transactions.filter((tx) => {
    const cat = findCategory(categories, tx.category);
    const q = searchText.trim().toLowerCase();
    const matchesSearch = !q || (tx.note || '').toLowerCase().includes(q) || cat.label.toLowerCase().includes(q);
    const matchesCat = !activeFilterCat || tx.category === activeFilterCat;
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
        <View>
          <Text style={styles.label}>Balance</Text>
          <Text style={styles.balance}>₱{balance.toFixed(2)}</Text>
        </View>
        <View style={styles.iconCol}>
          <TouchableOpacity onPress={() => setSettingsVisible(true)}><Text style={{ fontSize: 18 }}>⚙️</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setCategoryModalVisible(true)}><Text style={{ fontSize: 18 }}>🏷️</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Spent today</Text>
        <Text style={[styles.statValue, { color: t.spend }]}>₱{todaySpend.toFixed(2)}</Text>
      </View>
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Safe to spend</Text>
        <Text style={[styles.statValue, { color: safeToSpend >= 0 ? t.gain : t.spend }]}>₱{safeToSpend.toFixed(2)}</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput style={styles.searchInput} placeholder="Search description or tag" placeholderTextColor={t.inkFaint} value={searchText} onChangeText={setSearchText} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent} style={styles.filterScroll}>
        {categories.map((c) => (
          <TouchableOpacity key={c.id} onPress={() => setActiveFilterCat(activeFilterCat === c.id ? null : c.id)}
            style={[styles.filterChip, activeFilterCat === c.id && { backgroundColor: c.color, borderColor: c.color }]}>
            <Text style={[styles.filterChipText, activeFilterCat === c.id && { color: readableOn(c.color) }]}>{c.icon} {c.label}</Text>
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

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.typeRow}>
              <TouchableOpacity style={[styles.typeBtn, type === 'expense' && styles.typeBtnActive]} onPress={() => { setType('expense'); setSelectedCategoryId(null); }}>
                <Text style={{ color: t.ink }}>Spent</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, type === 'income' && styles.typeBtnActive]} onPress={() => { setType('income'); setSelectedCategoryId(null); }}>
                <Text style={{ color: t.ink }}>Earned</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginBottom: 16 }}>
              {categories.filter((c) => c.type === type).map((c) => (
                <TouchableOpacity key={c.id} onPress={() => setSelectedCategoryId(c.id)}
                  style={[styles.chip, selectedCategoryId === c.id && { backgroundColor: c.color, borderColor: c.color }]}>
                  <Text style={{ color: selectedCategoryId === c.id ? readableOn(c.color) : t.ink }}>{c.icon} {c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={t.inkFaint} value={amount} onChangeText={setAmount} />
            <TextInput style={styles.noteInput} placeholder="Add a description (optional)" placeholderTextColor={t.inkFaint} value={note} onChangeText={setNote} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={categoryModalVisible} animationType="slide" transparent onRequestClose={() => setCategoryModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <CategoryManager categories={categories} setCategories={setCategories} />
            <TouchableOpacity onPress={() => setCategoryModalVisible(false)} style={{ marginTop: 16 }}>
              <Text style={styles.cancel}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TransactionDetailModal visible={!!detailItem} item={detailItem} categories={categories} onClose={() => setDetailItem(null)} onDelete={handleDelete} onSave={handleEditSave} />
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg, paddingTop: 60 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 16 },
  iconCol: { flexDirection: 'row', gap: 16, paddingTop: 8 },
  label: { color: t.inkDim, fontSize: 13 },
  balance: { color: t.ink, fontSize: 46, fontWeight: '700' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, marginBottom: 6 },
  statLabel: { color: t.inkDim, fontSize: 13.5 },
  statValue: { fontSize: 15, fontWeight: '600' },
  searchRow: { width: '100%', paddingHorizontal: 20, marginTop: 14, marginBottom: 10 },
  searchInput: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 10, fontSize: 13.5 },
  filterScroll: { height: 46, marginBottom: 12 },
  filterScrollContent: { alignItems: 'center', paddingLeft: 20, paddingRight: 8 },
  filterChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: t.edge, backgroundColor: t.surface2, marginRight: 8, minHeight: 36, justifyContent: 'center', alignItems: 'center' },
  filterChipText: { color: t.ink, fontSize: 12.5, includeFontPadding: false, textAlignVertical: 'center' },
  empty: { color: t.inkFaint, textAlign: 'center', marginTop: 30 },
  fab: { position: 'absolute', bottom: 100, left: '50%', transform: [{ translateX: -110 }], backgroundColor: t.accent, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16 },
  fabText: { color: t.onAccent, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: t.surface2, alignItems: 'center' },
  typeBtnActive: { backgroundColor: t.edge },
  chip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, borderColor: t.edge, backgroundColor: t.surface2, marginRight: 8 },
  input: { fontSize: 32, color: t.ink, textAlign: 'center', marginBottom: 14, borderBottomColor: t.edge, borderBottomWidth: 1, paddingBottom: 8 },
  noteInput: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 12, fontSize: 14.5, marginBottom: 18 },
  saveBtn: { backgroundColor: t.accent, padding: 14, borderRadius: 14, alignItems: 'center' },
  saveText: { color: t.onAccent, fontWeight: '600' },
  cancel: { color: t.inkDim, textAlign: 'center', marginTop: 12 },
});