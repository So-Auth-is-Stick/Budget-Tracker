import { useState, useMemo } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { deleteTransaction, updateTransaction } from './storage';
import TransactionRow from './TransactionRow';
import TransactionDetailModal from './TransactionDetailModal';
import GoalDetailModal from './GoalDetailModal';
import { updateGoal, deleteGoal } from './goals';
import { findCategory } from './categories';
import { todayStr, getWeekRange, monthOf, daysUntil } from './dateUtils';
import { useTheme } from './theme';

const GOAL_DOT = '#9C6ADE';

export default function CalendarScreen({ categories, transactions, setTransactions, goals, setGoals }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [detailGoal, setDetailGoal] = useState(null);
  const [searchText, setSearchText] = useState('');

  const refDate = selectedDate || todayStr();
  const { start, end } = getWeekRange(refDate);
  const weeklySpend = transactions.filter((tx) => tx.type === 'expense' && tx.date >= start && tx.date <= end).reduce((s, tx) => s + tx.amount, 0);
  const dailySpend = selectedDate
    ? transactions.filter((tx) => tx.type === 'expense' && tx.date === selectedDate).reduce((s, tx) => s + tx.amount, 0)
    : 0;

  const summaryByDate = transactions.reduce((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = { income: false, expense: false };
    acc[tx.date][tx.type] = true;
    return acc;
  }, {});

  const overLimitDates = {};
  const dailyLimited = categories.filter((c) => c.type === 'expense' && c.dailyBudget > 0);
  if (dailyLimited.length) {
    const byDateCat = {};
    transactions.forEach((tx) => {
      if (tx.type !== 'expense') return;
      const key = tx.date + '|' + tx.category;
      byDateCat[key] = (byDateCat[key] || 0) + tx.amount;
    });
    dailyLimited.forEach((c) => {
      Object.keys(byDateCat).forEach((key) => {
        const [date, catId] = key.split('|');
        if (catId === c.id && byDateCat[key] > c.dailyBudget) overLimitDates[date] = true;
      });
    });
  }

  const goalsDueByDate = {};
  (goals || []).forEach((g) => {
    if (g.dueDate) (goalsDueByDate[g.dueDate] = goalsDueByDate[g.dueDate] || []).push(g);
  });

  const allDates = new Set([...Object.keys(summaryByDate), ...Object.keys(goalsDueByDate)]);
  const marked = {};
  allDates.forEach((date) => {
    const dots = [];
    if (summaryByDate[date]?.income) dots.push({ key: 'in', color: t.gain });
    if (summaryByDate[date]?.expense) dots.push({ key: 'out', color: t.spend });
    if (overLimitDates[date]) dots.push({ key: 'warn', color: t.accent });
    if (goalsDueByDate[date]) dots.push({ key: 'goal', color: GOAL_DOT });
    marked[date] = { dots, marked: true };
  });
  if (selectedDate) {
    marked[selectedDate] = { ...(marked[selectedDate] || {}), selected: true, selectedColor: t.accent };
  }

  const currentMonth = monthOf(todayStr());
  const monthByCat = {};
  transactions.filter((tx) => tx.type === 'expense' && monthOf(tx.date) === currentMonth)
    .forEach((tx) => { monthByCat[tx.category] = (monthByCat[tx.category] || 0) + tx.amount; });
  const monthEntries = Object.entries(monthByCat).sort((a, b) => b[1] - a[1]);
  const monthMax = monthEntries.length ? monthEntries[0][1] : 0;

  const dayTransactions = selectedDate ? [...transactions.filter((tx) => tx.date === selectedDate)].reverse() : [];
  const filteredDayTransactions = dayTransactions.filter((tx) => {
    const cat = findCategory(categories, tx.category);
    const q = searchText.trim().toLowerCase();
    return !q || (tx.note || '').toLowerCase().includes(q) || cat.label.toLowerCase().includes(q);
  });
  const dayGoals = selectedDate ? (goalsDueByDate[selectedDate] || []) : [];

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

  const calTheme = {
    calendarBackground: t.bg, dayTextColor: t.ink, monthTextColor: t.ink, textDisabledColor: t.inkFaint,
    todayTextColor: t.accent, arrowColor: t.accent, textSectionTitleColor: t.inkDim,
    selectedDayBackgroundColor: t.accent, selectedDayTextColor: t.onAccent,
  };

  return (
    <View style={styles.container}>
      <Calendar
        key={t.name}
        markingType="multi-dot"
        markedDates={marked}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        theme={calTheme}
        style={{ marginBottom: 10 }}
      />
      <View style={styles.weekStat}>
        <Text style={styles.weekStatLabel}>This week ({start.slice(5)} – {end.slice(5)})</Text>
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
            <FlatList
              data={filteredDayTransactions}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => <TransactionRow item={item} categories={categories} onPress={setDetailItem} />}
              ListEmptyComponent={<Text style={styles.empty}>Nothing logged this day.</Text>}
              style={{ maxHeight: 320 }}
            />
            <TouchableOpacity onPress={closeDaySheet} style={{ marginTop: 16 }}>
              <Text style={{ color: t.inkDim, textAlign: 'center' }}>Close</Text>
            </TouchableOpacity>

            <TransactionDetailModal visible={!!detailItem} item={detailItem} categories={categories} onClose={() => setDetailItem(null)} onDelete={handleDelete} onSave={handleEditSave} />
            <GoalDetailModal visible={!!detailGoal} goal={detailGoal} onClose={() => setDetailGoal(null)} onAdjustFunds={handleGoalAdjust} onUpdate={handleGoalUpdate} onDelete={handleGoalDelete} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg, paddingTop: 60 },
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
  daySheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '85%' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  dayLabel: { color: t.ink, fontSize: 15, fontWeight: '600' },
  dayTotal: { color: t.spend, fontSize: 12.5, fontWeight: '600' },
  upcomingLabel: { color: GOAL_DOT, fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomColor: t.edge, borderBottomWidth: 1 },
  goalDue: { color: t.inkDim, fontSize: 12 },
  searchInput: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 10, fontSize: 13.5, marginBottom: 10 },
});