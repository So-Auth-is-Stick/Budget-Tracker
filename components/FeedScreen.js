import { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteTransaction, updateTransaction } from './storage';
import CategoryManager from './CategoryManager';
import TransactionRow from './TransactionRow';
import TransactionDetailModal from './TransactionDetailModal';
import SettingsModal from './SettingsModal';
import { findCategory } from './categories';
import { computeOverLimitFlags } from './overLimit';
import { formatLong } from './dateUtils';
import { useToday } from './useToday';
import { useTheme, readableOn } from './theme';

export default function FeedScreen({ categories, setCategories, transactions, setTransactions, goals }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const today = useToday();
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [activeFilterCat, setActiveFilterCat] = useState(null);

  const sumOf = (list) => list.reduce((s, tx) => s + tx.amount, 0);
  const balance = sumOf(transactions.filter((tx) => tx.type === 'income')) - sumOf(transactions.filter((tx) => tx.type === 'expense'));
  const todays = transactions.filter((tx) => tx.date === today);
  const spentToday = sumOf(todays.filter((tx) => tx.type === 'expense'));
  const totalSaved = (goals || []).filter((g) => !g.committed).reduce((s, g) => s + g.savedAmount, 0);
  const safeToSpend = balance - totalSaved;

  const flags = useMemo(() => computeOverLimitFlags(transactions, categories), [transactions, categories]);

  // Normally only today is shown. Searching or picking a tag looks through every day.
  const query = searchText.trim().toLowerCase();
  const filtering = query !== '' || !!activeFilterCat;
  const rows = useMemo(() => {
    const list = filtering
      ? transactions.filter((tx) => {
          const cat = findCategory(categories, tx.category);
          const matchesText = !query || (tx.note || '').toLowerCase().includes(query) || cat.label.toLowerCase().includes(query);
          return matchesText && (!activeFilterCat || tx.category === activeFilterCat);
        })
      : transactions.filter((tx) => tx.date === today);
    return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }, [transactions, categories, filtering, query, activeFilterCat, today]);

  const handleDelete = async (id) => setTransactions(await deleteTransaction(id));
  const handleEditSave = async (id, changes) => setTransactions(await updateTransaction(id, changes));

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
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
        <Text style={[styles.statValue, { color: t.spend }]}>₱{spentToday.toFixed(2)}</Text>
      </View>
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Safe to spend</Text>
        <Text style={[styles.statValue, { color: safeToSpend >= 0 ? t.gain : t.spend }]}>₱{safeToSpend.toFixed(2)}</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput style={styles.searchInput} placeholder="Search all days by description or tag" placeholderTextColor={t.inkFaint} value={searchText} onChangeText={setSearchText} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent} style={styles.filterScroll}>
        {categories.map((c) => (
          <TouchableOpacity key={c.id} onPress={() => setActiveFilterCat(activeFilterCat === c.id ? null : c.id)}
            style={[styles.filterChip, activeFilterCat === c.id && { backgroundColor: c.color, borderColor: c.color }]}>
            <Text style={[styles.filterChipText, activeFilterCat === c.id && { color: readableOn(c.color) }]}>{c.icon} {c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionLabel}>
        {filtering ? `Search results from all days (${rows.length})` : `Today, ${formatLong(today)}`}
      </Text>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        style={{ width: '100%' }}
        contentContainerStyle={{ paddingBottom: 130 }}
        renderItem={({ item }) => (
          <TransactionRow item={item} categories={categories} onPress={setDetailItem} showDate={filtering} warnings={flags[item.id]} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>{filtering ? 'Nothing matches. Try a different word or tag.' : 'Nothing logged today yet. Tap + to add your first entry.'}</Text>
        }
      />

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
  container: { flex: 1, backgroundColor: t.bg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 14 },
  iconCol: { flexDirection: 'row', gap: 16, paddingTop: 8 },
  label: { color: t.inkDim, fontSize: 13 },
  balance: { color: t.ink, fontSize: 46, fontWeight: '700' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, marginBottom: 6 },
  statLabel: { color: t.inkDim, fontSize: 13.5 },
  statValue: { fontSize: 15, fontWeight: '600' },
  searchRow: { width: '100%', paddingHorizontal: 20, marginTop: 12, marginBottom: 10 },
  searchInput: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 10, fontSize: 13.5 },
  filterScroll: { height: 46, marginBottom: 6, flexGrow: 0 },
  filterScrollContent: { alignItems: 'center', paddingLeft: 20, paddingRight: 8 },
  filterChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: t.edge, backgroundColor: t.surface2, marginRight: 8, minHeight: 36, justifyContent: 'center', alignItems: 'center' },
  filterChipText: { color: t.ink, fontSize: 12.5, includeFontPadding: false, textAlignVertical: 'center' },
  sectionLabel: { color: t.inkDim, fontSize: 13, paddingHorizontal: 20, marginBottom: 6 },
  empty: { color: t.inkFaint, textAlign: 'center', marginTop: 30, paddingHorizontal: 30, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  cancel: { color: t.inkDim, textAlign: 'center', marginTop: 12 },
});
