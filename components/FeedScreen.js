import { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTxActions } from './txActions';
import CategoryManager from './CategoryManager';
import TransactionRow from './TransactionRow';
import TransactionDetailModal from './TransactionDetailModal';
import SettingsModal from './SettingsModal';
import { findCategory } from './categories';
import { computeOverLimitFlags } from './overLimit';
import { formatLong, getWeekRange } from './dateUtils';
import { useToday } from './useToday';
import { useTheme, readableOn } from './theme';
import { usePrefs } from './prefs';
import { peso, pesoShort } from './format';
import { loggingStreak, lastMonthRecap, monthLabel } from './insights';
import InsightsScreen from './InsightsScreen';
import * as haptic from './haptics';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const shiftDay = (ds, n) => { const d = new Date(ds + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function FeedScreen({ categories, setCategories, transactions, setTransactions, goals, onDataRestored }) {
  const { theme: t } = useTheme();
  const { prefs, setPref } = usePrefs();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const today = useToday();
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [activeFilterCat, setActiveFilterCat] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null); // tapped bar in the week chart
  const [insightsMonth, setInsightsMonth] = useState(null);

  const sumOf = (list) => list.reduce((s, tx) => s + tx.amount, 0);
  const balance = sumOf(transactions.filter((tx) => tx.type === 'income')) - sumOf(transactions.filter((tx) => tx.type === 'expense'));
  const todays = transactions.filter((tx) => tx.date === today);
  const spentToday = sumOf(todays.filter((tx) => tx.type === 'expense'));
  const totalSaved = (goals || []).filter((g) => !g.committed).reduce((s, g) => s + g.savedAmount, 0);
  const safeToSpend = balance - totalSaved;

  const flags = useMemo(() => computeOverLimitFlags(transactions, categories), [transactions, categories]);
  const streak = useMemo(() => loggingStreak(transactions, today), [transactions, today]);

  // Sun..Sat spending for this week
  const week = useMemo(() => {
    const { start } = getWeekRange(today);
    const days = Array.from({ length: 7 }, (_, i) => shiftDay(start, i));
    const totals = days.map((d) => transactions.filter((tx) => tx.type === 'expense' && tx.date === d).reduce((s, tx) => s + tx.amount, 0));
    return { days, totals, max: Math.max(1, ...totals), sum: totals.reduce((a, b) => a + b, 0) };
  }, [transactions, today]);

  // Normally only today is shown. Searching or picking a tag looks through every day.
  const query = searchText.trim().toLowerCase();
  const filtering = query !== '' || !!activeFilterCat;
  const shownDay = selectedDay || today;
  const rows = useMemo(() => {
    const list = filtering
      ? transactions.filter((tx) => {
          const cat = findCategory(categories, tx.category);
          const matchesText = !query || (tx.note || '').toLowerCase().includes(query) || cat.label.toLowerCase().includes(query) || String(tx.amount).includes(query);
          return matchesText && (!activeFilterCat || tx.category === activeFilterCat);
        })
      : transactions.filter((tx) => tx.date === shownDay);
    return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }, [transactions, categories, filtering, query, activeFilterCat, shownDay]);
  const filteredTotal = filtering ? sumOf(rows.filter((r) => r.type === 'expense')) : 0;

  const txActions = useTxActions(categories, setTransactions);
  const handleDelete = (id) => txActions.remove(id, transactions);
  const handleEditSave = (id, changes) => txActions.edit(id, changes);

  // Gentle backup nudge once there's something worth losing
  const backupAge = prefs.lastBackupAt ? (Date.now() - new Date(prefs.lastBackupAt).getTime()) / 864e5 : Infinity;
  const nudgeSnoozed = prefs.backupNudgeAt && (Date.now() - new Date(prefs.backupNudgeAt).getTime()) / 864e5 < 14;
  const showBackupNudge = transactions.length >= 30 && backupAge > 30 && !nudgeSnoozed;

  // First days of a new month: a recap of the one that just ended
  const recap = useMemo(() => (Number(today.slice(8, 10)) <= 7 ? lastMonthRecap(transactions, categories, today) : null), [transactions, categories, today]);
  const showRecap = recap && prefs.recapDismissed !== recap.month;

  const header = (
    <View>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greet}>{greeting()}</Text>
          <TouchableOpacity style={styles.labelRow} onPress={() => { haptic.tap(); setPref('hideAmounts', !prefs.hideAmounts); }} accessibilityLabel={prefs.hideAmounts ? 'Show amounts' : 'Hide amounts'}>
            <Text style={styles.label}>Balance</Text>
            <Ionicons name={prefs.hideAmounts ? 'eye-off-outline' : 'eye-outline'} size={15} color={t.inkFaint} />
          </TouchableOpacity>
          <Text style={[styles.balance, balance < 0 && { color: t.spend }]} numberOfLines={1} adjustsFontSizeToFit>{peso(balance, 2)}</Text>
        </View>
        <View style={styles.iconCol}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setCategoryModalVisible(true)} accessibilityLabel="Tags">
            <Ionicons name="pricetags-outline" size={19} color={t.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setSettingsVisible(true)} accessibilityLabel="Settings">
            <Ionicons name="settings-outline" size={19} color={t.ink} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statCards}>
        <View style={[styles.statCard, { borderColor: t.spend + '55' }]}>
          <Text style={styles.statLabel}>Spent today</Text>
          <Text style={[styles.statValue, { color: t.spend }]} numberOfLines={1} adjustsFontSizeToFit>{peso(spentToday, 2)}</Text>
        </View>
        <View style={[styles.statCard, { borderColor: (safeToSpend >= 0 ? t.gain : t.spend) + '55' }]}>
          <Text style={styles.statLabel}>Safe to spend</Text>
          <Text style={[styles.statValue, { color: safeToSpend >= 0 ? t.gain : t.spend }]} numberOfLines={1} adjustsFontSizeToFit>{peso(safeToSpend, 2)}</Text>
        </View>
      </View>

      <View style={styles.weekCard}>
        <View style={styles.weekHead}>
          <Text style={styles.weekTitle}>This week <Text style={{ color: t.spend, fontWeight: '700' }}>{peso(week.sum, 0)}</Text></Text>
          {streak > 1 && <View style={styles.streak}><Text style={styles.streakText}>🔥 {streak}-day streak</Text></View>}
        </View>
        <View style={styles.bars}>
          {week.days.map((d, i) => {
            const isToday = d === today;
            const isSel = d === shownDay && !filtering;
            const future = d > today;
            const h = week.totals[i] > 0 ? Math.max(6, (week.totals[i] / week.max) * 64) : 3;
            return (
              <TouchableOpacity key={d} style={styles.barCol} disabled={future}
                onPress={() => { haptic.tap(); setSelectedDay(d === today || d === selectedDay ? null : d); }}>
                <Text style={styles.barVal} numberOfLines={1}>{week.totals[i] > 0 ? pesoShort(week.totals[i]).replace('₱', '') : ''}</Text>
                <View style={[styles.bar, { height: h, backgroundColor: future ? t.edge : isSel ? t.accent : t.spend + (isToday ? 'CC' : '77') }]} />
                <Text style={[styles.barDay, isToday && { color: t.accent, fontWeight: '700' }, isSel && !isToday && { color: t.ink, fontWeight: '700' }]}>{DOW[i]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {showRecap && (
        <TouchableOpacity activeOpacity={0.85} style={styles.recap} onPress={() => setInsightsMonth(recap.month)}>
          <View style={styles.recapHead}>
            <Text style={styles.recapTitle}>🗓️ {monthLabel(recap.month).split(' ')[0]} recap</Text>
            <TouchableOpacity onPress={() => setPref('recapDismissed', recap.month)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color={t.inkFaint} />
            </TouchableOpacity>
          </View>
          <View style={styles.recapRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.recapLabel}>Spent</Text>
              <Text style={[styles.recapVal, { color: t.spend }]}>{peso(recap.spent, 0)}</Text>
              {recap.changePct !== null && (
                <Text style={[styles.recapSmall, { color: recap.changePct > 0 ? t.spend : t.gain }]}>{recap.changePct > 0 ? '▲' : '▼'} {Math.abs(recap.changePct)}% vs month before</Text>
              )}
            </View>
            {recap.keptPct !== null && (
              <View style={{ flex: 1 }}>
                <Text style={styles.recapLabel}>Kept</Text>
                <Text style={[styles.recapVal, { color: recap.keptPct >= 0 ? t.gain : t.spend }]}>{recap.keptPct}%</Text>
                <Text style={styles.recapSmall}>of {peso(recap.earned, 0)} earned</Text>
              </View>
            )}
          </View>
          {recap.top && <Text style={styles.recapSmall}>Most went to {recap.top.icon} {recap.top.label} ({peso(recap.top.amount, 0)}){recap.noSpendDays > 0 ? ` · ${recap.noSpendDays} no-spend days` : ''}</Text>}
          <Text style={styles.recapLink}>See the full month →</Text>
        </TouchableOpacity>
      )}

      {showBackupNudge && (
        <View style={styles.nudge}>
          <Ionicons name="cloud-upload-outline" size={20} color={t.accent} />
          <Text style={styles.nudgeText}>{prefs.lastBackupAt ? 'Your last backup is over a month old.' : `You have ${transactions.length} entries and no backup yet.`}</Text>
          <TouchableOpacity onPress={() => setSettingsVisible(true)}><Text style={styles.nudgeAction}>Back up</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setPref('backupNudgeAt', new Date().toISOString())} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={18} color={t.inkFaint} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={t.inkFaint} />
        <TextInput style={styles.searchInput} placeholder="Search all entries" placeholderTextColor={t.inkFaint} value={searchText} onChangeText={setSearchText} />
        {!!searchText && <TouchableOpacity onPress={() => setSearchText('')}><Ionicons name="close-circle" size={18} color={t.inkFaint} /></TouchableOpacity>}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent} style={styles.filterScroll} keyboardShouldPersistTaps="handled">
        {categories.map((c) => (
          <TouchableOpacity key={c.id} onPress={() => { haptic.tap(); setActiveFilterCat(activeFilterCat === c.id ? null : c.id); }}
            style={[styles.filterChip, activeFilterCat === c.id && { backgroundColor: c.color, borderColor: c.color }]}>
            <Text style={[styles.filterChipText, activeFilterCat === c.id && { color: readableOn(c.color) }]}>{c.icon} {c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>
          {filtering ? `${rows.length} ${rows.length === 1 ? 'match' : 'matches'} from all days` : shownDay === today ? `Today · ${formatLong(today)}` : formatLong(shownDay)}
        </Text>
        {filtering && filteredTotal > 0 && <Text style={styles.sectionTotal}>{peso(filteredTotal, 0)} spent</Text>}
        {!filtering && selectedDay && (
          <TouchableOpacity onPress={() => setSelectedDay(null)}><Text style={styles.sectionAction}>Back to today</Text></TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TransactionRow item={item} categories={categories} onPress={setDetailItem} showDate={filtering} warnings={flags[item.id]} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 34 }}>{filtering ? '🔍' : '🌱'}</Text>
            <Text style={styles.empty}>
              {filtering ? 'Nothing matches. Try a different word or tag.' : shownDay === today ? 'Nothing logged today yet.\nTap + to add your first entry.' : 'Nothing logged that day.'}
            </Text>
          </View>
        }
      />

      <Modal visible={categoryModalVisible} animationType="slide" transparent onRequestClose={() => setCategoryModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <CategoryManager categories={categories} setCategories={setCategories} transactions={transactions} setTransactions={setTransactions} />
            <TouchableOpacity onPress={() => setCategoryModalVisible(false)} style={{ marginTop: 16 }}>
              <Text style={styles.cancel}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TransactionDetailModal visible={!!detailItem} item={detailItem} categories={categories} onClose={() => setDetailItem(null)} onDelete={handleDelete} onSave={handleEditSave}
        onDuplicate={(it) => txActions.add({ type: it.type, amount: it.amount, category: it.category, note: (it.note || '').replace(/ \(auto\)$/, ''), id: Date.now(), date: today })} />
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} onDataRestored={onDataRestored} transactions={transactions} categories={categories} />
      <InsightsScreen visible={!!insightsMonth} initialMonth={insightsMonth} onClose={() => setInsightsMonth(null)} transactions={transactions} categories={categories} goals={goals} />
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 14 },
  greet: { color: t.inkDim, fontSize: 13.5, marginBottom: 6 },
  iconCol: { flexDirection: 'row', gap: 10, paddingTop: 2 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  label: { color: t.inkFaint, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  balance: { color: t.ink, fontSize: 42, fontWeight: '800', letterSpacing: -0.5 },
  statCards: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14 },
  statLabel: { color: t.inkDim, fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700' },
  weekCard: { marginHorizontal: 20, backgroundColor: t.surface, borderRadius: 18, padding: 14, marginBottom: 12 },
  weekHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  weekTitle: { color: t.inkDim, fontSize: 13 },
  streak: { backgroundColor: t.accent + '22', paddingVertical: 3, paddingHorizontal: 9, borderRadius: 10 },
  streakText: { color: t.accent, fontSize: 12, fontWeight: '700' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 100 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barVal: { color: t.inkFaint, fontSize: 9.5, marginBottom: 3 },
  bar: { width: 18, borderRadius: 6 },
  barDay: { color: t.inkDim, fontSize: 11.5, marginTop: 5 },
  recap: { marginHorizontal: 20, marginBottom: 12, padding: 14, borderRadius: 18, backgroundColor: t.surface, borderWidth: 1, borderColor: t.accent + '66' },
  recapHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  recapTitle: { color: t.ink, fontSize: 15, fontWeight: '700' },
  recapRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  recapLabel: { color: t.inkDim, fontSize: 12 },
  recapVal: { fontSize: 20, fontWeight: '800', marginVertical: 2 },
  recapSmall: { color: t.inkDim, fontSize: 12 },
  recapLink: { color: t.accent, fontSize: 12.5, fontWeight: '700', marginTop: 8 },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 12, padding: 12, borderRadius: 14, backgroundColor: t.accent + '18', borderWidth: 1, borderColor: t.accent + '55' },
  nudgeText: { flex: 1, color: t.ink, fontSize: 12.5 },
  nudgeAction: { color: t.accent, fontWeight: '700', fontSize: 13 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 2, marginBottom: 8, backgroundColor: t.surface2, borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, color: t.ink, paddingVertical: 10, fontSize: 13.5 },
  filterScroll: { height: 46, marginBottom: 4, flexGrow: 0 },
  filterScrollContent: { alignItems: 'center', paddingLeft: 20, paddingRight: 8 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 18, borderWidth: 1, borderColor: t.edge, backgroundColor: t.surface2, marginRight: 8, minHeight: 34, justifyContent: 'center', alignItems: 'center' },
  filterChipText: { color: t.ink, fontSize: 12.5, includeFontPadding: false, textAlignVertical: 'center' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 6, marginTop: 4 },
  sectionLabel: { color: t.inkDim, fontSize: 13, fontWeight: '600' },
  sectionTotal: { color: t.spend, fontSize: 12.5, fontWeight: '600' },
  sectionAction: { color: t.accent, fontSize: 12.5, fontWeight: '600' },
  emptyBox: { alignItems: 'center', marginTop: 26, gap: 8 },
  empty: { color: t.inkFaint, textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '90%' },
  cancel: { color: t.inkDim, textAlign: 'center', marginTop: 12 },
});
