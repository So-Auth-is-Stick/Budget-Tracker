import { useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { deleteTransaction, updateTransaction } from './storage';
import TransactionRow from './TransactionRow';
import TransactionDetailModal from './TransactionDetailModal';
import { findCategory } from './categories';
import { todayStr, getWeekRange } from './dateUtils';

export default function CalendarScreen({ categories, transactions, setTransactions }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
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

  const markedDates = Object.keys(summaryByDate).reduce((acc, date) => {
    const dots = [];
    if (summaryByDate[date].income) dots.push({ key: 'in', color: '#7FC29B' });
    if (summaryByDate[date].expense) dots.push({ key: 'out', color: '#D97A55' });
    if (overLimitDates[date]) dots.push({ key: 'warn', color: '#E8B84B' });
    acc[date] = { dots, marked: true };
    return acc;
  }, {});
  if (selectedDate) {
    markedDates[selectedDate] = { ...(markedDates[selectedDate] || {}), selected: true, selectedColor: '#E8B84B' };
  }

  const dayTransactions = selectedDate
    ? [...transactions.filter((t) => t.date === selectedDate)].reverse()
    : [];
  const filteredDayTransactions = dayTransactions.filter((t) => {
    const cat = findCategory(categories, t.category);
    const q = searchText.trim().toLowerCase();
    return !q || (t.note || '').toLowerCase().includes(q) || cat.label.toLowerCase().includes(q);
  });

  const handleDelete = async (id) => setTransactions(await deleteTransaction(id));
  const handleEditSave = async (id, changes) => setTransactions(await updateTransaction(id, changes));

  return (
    <View style={styles.container}>
      <Calendar
        markingType="multi-dot"
        markedDates={markedDates}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        theme={{ calendarBackground: '#0F1A18', dayTextColor: '#F4EFE6', monthTextColor: '#F4EFE6', textDisabledColor: '#5E6F68', todayTextColor: '#E8B84B', arrowColor: '#E8B84B' }}
        style={{ marginBottom: 10 }}
      />
      <View style={styles.weekStat}>
        <Text style={styles.weekStatLabel}>This week ({start.slice(5)} – {end.slice(5)})</Text>
        <Text style={styles.weekStatValue}>₱{weeklySpend.toFixed(2)}</Text>
      </View>
      {selectedDate && (
        <View style={{ flex: 1 }}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayLabel}>{selectedDate}</Text>
            <Text style={styles.dayTotal}>{overLimitDates[selectedDate] ? '⚠️ ' : ''}Spent ₱{dailySpend.toFixed(2)}</Text>
          </View>
          {dayTransactions.length > 4 && (
            <TextInput style={styles.searchInput} placeholder="Search this day's entries" placeholderTextColor="#5E6F68" value={searchText} onChangeText={setSearchText} />
          )}
          <FlatList
            data={filteredDayTransactions}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item }) => <TransactionRow item={item} categories={categories} onPress={setDetailItem} />}
            ListEmptyComponent={<Text style={styles.empty}>Nothing logged this day.</Text>}
          />
        </View>
      )}
      <TransactionDetailModal visible={!!detailItem} item={detailItem} categories={categories} onClose={() => setDetailItem(null)} onDelete={handleDelete} onSave={handleEditSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1A18', paddingTop: 60 },
  weekStat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  weekStatLabel: { color: '#9FB0A8', fontSize: 13 },
  weekStatValue: { color: '#D97A55', fontSize: 15, fontWeight: '600' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  dayLabel: { color: '#9FB0A8', fontSize: 13 },
  dayTotal: { color: '#D97A55', fontSize: 12.5, fontWeight: '600' },
  searchInput: { backgroundColor: '#1D2E27', borderRadius: 12, color: '#F4EFE6', padding: 10, fontSize: 13.5, marginHorizontal: 20, marginBottom: 10 },
  empty: { color: '#5E6F68', textAlign: 'center', marginTop: 20 },
});