import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteTransaction, updateTransaction } from './storage';
import TransactionRow from './TransactionRow';
import TransactionDetailModal from './TransactionDetailModal';
import GoalDetailModal from './GoalDetailModal';
import { updateGoal, deleteGoal } from './goals';
import { findCategory } from './categories';
import { computeOverLimitFlags, periodSpent, limitFor } from './overLimit';
import { getWeekRange, monthOf, daysUntil } from './dateUtils';
import { useToday } from './useToday';
import { useTheme } from './theme';

const GOAL_DOT = '#9C6ADE';

export default function CalendarScreen({ categories, transactions, setTransactions, goals, setGoals, onCommitGoal }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const today = useToday();
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [detailGoal, setDetailGoal] = useState(null);
  const [searchText, setSearchText] = useState('');

  // Which expenses pushed a tag past its daily / weekly / monthly limit
  const flags = useMemo(() => computeOverLimitFlags(transactions, categories), [transactions, categories]);

  const { start, end } = getWeekRange(selectedDate || today);
  const expenses = transactions.filter((tx) => tx.type === 'expense');
  const weeklySpend = expenses.filter((tx) => tx.date >= start && tx.date <= end).reduce((s, tx) => s + tx.amount, 0);
  const dailySpend = selectedDate ? expenses.filter((tx) => tx.date === selectedDate).reduce((s, tx) => s + tx.amount, 0) : 0;

  const summaryByDate = {};
  transactions.forEach((tx) => {
    const day = (summaryByDate[tx.date] = summaryByDate[tx.date] || { income: false, expense: false });
    day[tx.type] = true;
  });
  const overLimitDates = {};
  transactions.forEach((tx) => { if (flags[tx.id]) overLimitDates[tx.date] = true; });

  const goalsDueByDate = {};
  (goals || []).filter((g) => !g.committed && g.dueDate).forEach((g) => {
    (goalsDueByDate[g.dueDate] = goalsDueByDate[g.dueDate] || []).push(g);
  });

  const marked = {};
  new Set([...Object.keys(summaryByDate), ...Object.keys(goalsDueByDate)]).forEach((date) => {
    const dots = [];
    if (summaryByDate[date] && summaryByDate[date].income) dots.push({ key: 'in', color: t.gain });
    if (summaryByDate[date] && summaryByDate[date].expense) dots.push({ key: 'out', color: t.spend });
    if (overLimitDates[date]) dots.push({ key: 'warn', color: t.accent });
    if (goalsDueByDate[date]) dots.push({ key: 'goal', color: GOAL_DOT });
    marked[date] = { dots, marked: true };
  });
  if (selectedDate) {
    marked[selectedDate] = { ...(marked[selectedDate] || {}), selected: true, selectedColor: t.accent };
  }

  const currentMonth = monthOf(today);
  const monthByCat = {};
  expenses.filter((tx) => monthOf(tx.date) === currentMonth).forEach((tx) => {
    monthByCat[tx.category] = (monthByCat[tx.category] || 0) + tx.amount;
  });
  const monthEntries = Object.entries(monthByCat).sort((a, b) => b[1] - a[1]);
  const monthMax = monthEntries.length ? monthEntries[0][1] : 0;

  const dayTransactions = selectedDate
    ? transactions.filter((tx) => tx.date === selectedDate).sort((a, b) => b.id - a.id)
    : [];
  const q = searchText.trim().toLowerCase();
  const shownTransactions = dayTransactions.filter((tx) => {
    const cat = findCategory(categories, tx.category);
    return !q || (tx.note || '').toLowerCase().includes(q) || cat.label.toLowerCase().includes(q);
  });
  const dayGoals = selectedDate ? goalsDueByDate[selectedDate] || [] : [];

  // One line per tag + limit type that was broken on the selected day
  const dayAlerts = [];
  if (selectedDate) {
    const seen = {};
    dayTransactions.forEach((tx) => {
      (flags[tx.id] || []).forEach((kind) => {
        const key = tx.category + '|' + kind;
        if (seen[key]) return;
        seen[key] = true;
        const cat = findCategory(categories, tx.category);
        dayAlerts.push({ key, cat, kind, limit: limitFor(cat, kind), spent: periodSpent(transactions, tx.category, kind, selectedDate) });
      });
    });
  }

  const handleDelete = async (id) => setTransactions(await deleteTransaction(id));
  const handleEditSave = async (id, changes) => setTransactions(await updateTransaction(id, changes));
  const handleGoalAdjust = async (id, delta) => {
    const g = goals.find((x) => x.id === id);
    const updated = await updateGoal(id, { savedAmount: Math.max(0, g.savedAmount + delta) });
    setGoals(updated);
    setDetailGoal(updated.find((x) => x.id === id));
  };
  const handleGoalUpdate = async (id, changes) => { setGoals(await updateGoal(id, changes)); setDetailGoal(null); };
  const handleGoalDelete = async (id) => setGoals(await deleteGoal(id));
  const closeDaySheet = () => { setSelectedDate(null); setSearchText(''); };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Calendar
        key={t.name}
        markingType="multi-dot"
        markedDates={marked}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        theme={{
          calendarBackground: t.bg, dayTextColor: t.ink, monthTextColor: t.ink, textDisabledColor: t.inkFaint,
          todayTextColor: t.accent, arrowColor: t.accent, textSectionTitleColor: t.inkDim,
          selectedDayBackgroundColor: t.accent, selectedDayTextColor: t.onAccent,
        }}
        style={{ marginBottom: 10 }}
      />
      <View style={styles.weekStat}>
        <Text style={styles.weekStatLabel}>This week ({start.slice(5)} to {end.slice(5)})</Text>
        <Text style={styles.weekStatValue}>₱{weeklySpend.toFixed(2)}</Text>
      </View>

      <View style={styles.monthSection}>
        <Text style={styles.sectionTitle}>This month by tag</Text>
        {monthEntries.length === 0 ? (
          <Text style={styles.empty}>Nothing spent yet this month.</Text>
        ) : (
          monthEntries.map(([catId, amt]) => {
            const cat = findCategory(categories, catId);
            const pct = monthMax > 0 ? (amt / monthMax) * 100 : 0;
            return (
              <View key={catId} style={styles.barRow}>
                <Text style={styles.barName} numberOfLines={1}>{cat.icon} {cat.label}</Text>
                <View style={styles.barTrack}><View style={[styles.barFill, { width: `${pct}%`, backgroundColor: cat.color }]} /></View>
                <Text style={styles.barAmt}>₱{amt.toFixed(0)}</Text>
              </View>
            );
          })
        )}
      </View>

      <Modal visible={!!selectedDate} animationType="slide" transparent onRequestClose={closeDaySheet}>
        <View style={styles.overlay}>
          <View style={styles.daySheet}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{selectedDate}</Text>
              <Text style={styles.dayTotal}>{overLimitDates[selectedDate] ? '⚠️ ' : ''}Spent ₱{dailySpend.toFixed(2)}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {dayAlerts.length > 0 && (
                <View style={styles.alertBox}>
                  <Text style={styles.alertTitle}>⚠️ Over budget</Text>
                  {dayAlerts.map((a) => (
                    <Text key={a.key} style={styles.alertLine}>
                      {a.cat.icon} {a.cat.label}: ₱{a.spent.toFixed(0)} of ₱{a.limit.toFixed(0)} {a.kind} limit
                    </Text>
                  ))}
                  <Text style={styles.alertHint}>Entries marked ⚠️ below are the ones that pushed it over.</Text>
                </View>
              )}

              {dayGoals.length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.upcomingLabel}>Upcoming</Text>
                  {dayGoals.map((g) => {
                    const remaining = daysUntil(g.dueDate);
                    return (
                      <TouchableOpacity key={g.id} style={styles.goalRow} onPress={() => setDetailGoal(g)}>
                        <Text style={{ color: t.ink, fontSize: 14 }}>🎯 {g.label}</Text>
                        <Text style={[styles.goalDue, remaining < 0 && { color: t.spend }]}>
                          {remaining < 0 ? 'Overdue' : remaining === 0 ? 'Due today' : `${remaining}d left`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {dayTransactions.length > 4 && (
                <TextInput style={styles.searchInput} placeholder="Search this day's entries" placeholderTextColor={t.inkFaint} value={searchText} onChangeText={setSearchText} />
              )}
              {shownTransactions.length === 0
                ? <Text style={styles.empty}>Nothing logged this day.</Text>
                : shownTransactions.map((tx) => (
                    <TransactionRow key={tx.id} item={tx} categories={categories} onPress={setDetailItem} warnings={flags[tx.id]} />
                  ))}
            </ScrollView>

            <TouchableOpacity onPress={closeDaySheet} style={{ marginTop: 16 }}>
              <Text style={{ color: t.inkDim, textAlign: 'center' }}>Close</Text>
            </TouchableOpacity>

            <TransactionDetailModal visible={!!detailItem} item={detailItem} categories={categories} onClose={() => setDetailItem(null)} onDelete={handleDelete} onSave={handleEditSave} />
            <GoalDetailModal
              visible={!!detailGoal}
              goal={detailGoal}
              categories={categories}
              onClose={() => setDetailGoal(null)}
              onAdjustFunds={handleGoalAdjust}
              onUpdate={handleGoalUpdate}
              onDelete={handleGoalDelete}
              onCommit={onCommitGoal}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  weekStat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 18 },
  weekStatLabel: { color: t.inkDim, fontSize: 13 },
  weekStatValue: { color: t.spend, fontSize: 15, fontWeight: '600' },
  sectionTitle: { color: t.inkDim, fontSize: 13, marginBottom: 12 },
  monthSection: { paddingHorizontal: 20 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  barName: { width: 92, color: t.inkDim, fontSize: 12.5, flexShrink: 0 },
  barTrack: { flex: 1, height: 7, backgroundColor: t.surface2, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barAmt: { width: 58, textAlign: 'right', color: t.ink, fontSize: 12.5, flexShrink: 0 },
  empty: { color: t.inkFaint, fontSize: 13 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  daySheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '88%' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  dayLabel: { color: t.ink, fontSize: 15, fontWeight: '600' },
  dayTotal: { color: t.spend, fontSize: 12.5, fontWeight: '600' },
  alertBox: { backgroundColor: t.spend + '1F', borderColor: t.spend + '66', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 14 },
  alertTitle: { color: t.spend, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  alertLine: { color: t.ink, fontSize: 13, marginBottom: 3 },
  alertHint: { color: t.inkDim, fontSize: 11.5, marginTop: 4 },
  upcomingLabel: { color: GOAL_DOT, fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomColor: t.edge, borderBottomWidth: 1 },
  goalDue: { color: t.inkDim, fontSize: 12 },
  searchInput: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 10, fontSize: 13.5, marginBottom: 10 },
});
