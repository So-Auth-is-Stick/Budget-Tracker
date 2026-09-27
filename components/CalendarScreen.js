import { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { deleteTransaction, updateTransaction } from './storage';
import TransactionRow from './TransactionRow';
import TransactionDetailModal from './TransactionDetailModal';
import GoalDetailModal from './GoalDetailModal';
import { updateGoal, deleteGoal } from './goals';
import { findCategory } from './categories';
import { todayStr, getWeekRange, monthOf, daysUntil } from './dateUtils';

export default function CalendarScreen({ categories, transactions, setTransactions, goals, setGoals }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [detailGoal, setDetailGoal] = useState(null);
  const [searchText, setSearchText] = useState('');

  const refDate = selectedDate || todayStr();
  const { start, end } = getWeekRange(refDate);
  const weeklySpend = transactions.filter((t) => t.type === 'expense' && t.date >= start && t.date <= end).reduce((sum, t) => sum + t.amount, 0);
  const dailySpend = selectedDate
    ? transactions.filter((t) => t.type === 'expense' && t.date === selectedDate).reduce((sum, t) => sum + t.amount, 0)
    : 0;

  const summaryByDate = transactions.reduce((acc, t) => {
    if (!acc[t.date]) acc[t.date] = { income: false, expense: false };
    acc[t.date][t.type] = true;
    return acc;
  }, {});

  const overLimitDates = {};
  const dailyLimited = categories.filter((c) => c.type === 'expense' && c.dailyBudget > 0);
  if (dailyLimited.length) {
    const byDateCat = {};
    transactions.forEach((t) => {
      if (t.type !== 'expense') return;
      const key = t.date + '|' + t.category;
      byDateCat[key] = (byDateCat[key] || 0) + t.amount;
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

  const markedDates = { ...summaryByDate, ...goalsDueByDate };
  const allDates = new Set([...Object.keys(summaryByDate), ...Object.keys(goalsDueByDate)]);
  const finalMarked = {};
  allDates.forEach((date) => {
    const dots = [];
    if (summaryByDate[date]?.income) dots.push({ key: 'in', color: '#7FC29B' });
    if (summaryByDate[date]?.expense) dots.push({ key: 'out', color: '#D97A55' });
    if (overLimitDates[date]) dots.push({ key: 'warn', color: '#E8B84B' });
    if (goalsDueByDate[date]) dots.push({ key: 'goal', color: '#9C6ADE' });
    finalMarked[date] = { dots, marked: true };
  });
  if (selectedDate) {
    finalMarked[selectedDate] = { ...(finalMarked[selectedDate] || {}), selected: true, selectedColor: '#E8B84B' };
  }

  const currentMonth = monthOf(todayStr());
  const monthByCat = {};
  transactions.filter((t) => t.type === 'expense' && monthOf(t.date) === currentMonth)
    .forEach((t) => { monthByCat[t.category] = (monthByCat[t.category] || 0) + t.amount; });
  const monthEntries = Object.entries(monthByCat).sort((a, b) => b[1] - a[1]);
  const monthMax = monthEntries.length ? monthEntries[0][1] : 0;

  const dayTransactions = selectedDate ? [...transactions.filter((t) => t.date === selectedDate)].reverse() : [];
  const filteredDayTransactions = dayTransactions.filter((t) => {
    const cat = findCategory(categories, t.category);
    const q = searchText.trim().toLowerCase();
    return !q || (t.note || '').toLowerCase().includes(q) || cat.label.toLowerCase().includes(q);
  });
  const dayGoals = selectedDate ? (goalsDueByDate[selectedDate] || []) : [];

  const handleDelete = async (id) => setTransactions(await deleteTransaction(id));
  const handleEditSave = async (id, changes) => setTransactions(await updateTransaction(id, changes));
  const handleGoalAddFunds = async (id, value) => {
    const g = goals.find((x) => x.id === id);
    setGoals(await updateGoal(id, { savedAmount: g.savedAmount + value }));
  };
  const handleGoalUpdate = async (id, changes) => { setGoals(await updateGoal(id, changes)); setDetailGoal(null); };
  const handleGoalDelete = async (id) => setGoals(await deleteGoal(id));
  const closeDaySheet = () => { setSelectedDate(null); setSearchText(''); };

  return (
    <View style={styles.container}>
      <Calendar
        markingType="multi-dot"
        markedDates={finalMarked}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        theme={{ calendarBackground: '#0F1A18', dayTextColor: '#F4EFE6', monthTextColor: '#F4EFE6', textDisabledColor: '#5E6F68', todayTextColor: '#E8B84B', arrowColor: '#E8B84B' }}
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

      <Modal visible={!!selectedDate} animationType="slide" transparent>
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
                      <Text style={{ color: '#F4EFE6', fontSize: 14 }}>🎯 {g.label}</Text>
                      <Text style={[styles.goalDue, remaining < 0 && { color: '#D97A55' }]}>
                        {remaining < 0 ? 'Overdue' : remaining === 0 ? 'Due today' : `${remaining}d left`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {dayTransactions.length > 4 && (
              <TextInput style={styles.searchInput} placeholder="Search this day's entries" placeholderTextColor="#5E6F68" value={searchText} onChangeText={setSearchText} />
            )}
            <FlatList
              data={filteredDayTransactions}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingBottom: 10 }}
              renderItem={({ item }) => <TransactionRow item={item} categories={categories} onPress={setDetailItem} />}
              ListEmptyComponent={<Text style={styles.empty}>Nothing logged this day.</Text>}
              style={{ maxHeight: 320 }}
            />
            <TouchableOpacity onPress={closeDaySheet} style={{ marginTop: 16 }}>
              <Text style={{ color: '#9FB0A8', textAlign: 'center' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TransactionDetailModal visible={!!detailItem} item={detailItem} categories={categories} onClose={() => setDetailItem(null)} onDelete={handleDelete} onSave={handleEditSave} />
      <GoalDetailModal visible={!!detailGoal} goal={detailGoal} onClose={() => setDetailGoal(null)} onAddFunds={handleGoalAddFunds} onUpdate={handleGoalUpdate} onDelete={handleGoalDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1A18', paddingTop: 60 },
  weekStat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 18 },
  weekStatLabel: { color: '#9FB0A8', fontSize: 13 },
  weekStatValue: { color: '#D97A55', fontSize: 15, fontWeight: '600' },
  sectionTitle: { color: '#9FB0A8', fontSize: 13, marginBottom: 12 },
  monthSection: { paddingHorizontal: 20 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  barName: { width: 92, color: '#9FB0A8', fontSize: 12.5, flexShrink: 0 },
  barTrack: { flex: 1, height: 7, backgroundColor: '#1D2E27', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barAmt: { width: 58, textAlign: 'right', color: '#F4EFE6', fontSize: 12.5, flexShrink: 0 },
  empty: { color: '#5E6F68', fontSize: 13 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  daySheet: { backgroundColor: '#16241F', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '85%' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  dayLabel: { color: '#F4EFE6', fontSize: 15, fontWeight: '600' },
  dayTotal: { color: '#D97A55', fontSize: 12.5, fontWeight: '600' },
  upcomingLabel: { color: '#9C6ADE', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomColor: '#2A3B34', borderBottomWidth: 1 },
  goalDue: { color: '#9FB0A8', fontSize: 12 },
  searchInput: { backgroundColor: '#1D2E27', borderRadius: 12, color: '#F4EFE6', padding: 10, fontSize: 13.5, marginBottom: 10 },
});