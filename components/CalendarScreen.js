import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { loadTransactions, deleteTransaction } from './storage';
import TransactionRow from './TransactionRow';
import TransactionDetailModal from './TransactionDetailModal';
import { todayStr, getWeekRange } from './dateUtils';

export default function CalendarScreen({ categories, transactions, setTransactions }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => { loadTransactions().then(setTransactions); }, []);
  const refDate = selectedDate || todayStr();
  const { start, end } = getWeekRange(refDate);
  const weeklySpend = transactions
    .filter((t) => t.type === 'expense' && t.date >= start && t.date <= end)
    .reduce((sum, t) => sum + t.amount, 0);
  const dailySpend = selectedDate
    ? transactions
        .filter((t) => t.type === 'expense' && t.date === selectedDate)
        .reduce((sum, t) => sum + t.amount, 0)
    : 0;
  const summaryByDate = transactions.reduce((acc, t) => {
    if (!acc[t.date]) acc[t.date] = { income: false, expense: false };
    acc[t.date][t.type] = true;
    return acc;
  }, {});

  const markedDates = Object.keys(summaryByDate).reduce((acc, date) => {
    const dots = [];
    if (summaryByDate[date].income) dots.push({ key: 'in', color: '#7FC29B' });
    if (summaryByDate[date].expense) dots.push({ key: 'out', color: '#D97A55' });
    acc[date] = { dots, marked: true };
    return acc;
  }, {});
  if (selectedDate) {
    markedDates[selectedDate] = { ...(markedDates[selectedDate] || {}), selected: true, selectedColor: '#E8B84B' };
  }

  // reversed so the most recently added entry for that day shows at the top
  const dayTransactions = selectedDate
    ? [...transactions.filter((t) => t.date === selectedDate)].reverse()
    : [];

  const handleDelete = async (id) => setTransactions(await deleteTransaction(id));

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
        <Text style={styles.weekStatLabel}>
          This week ({start.slice(5)} – {end.slice(5)})
        </Text>
        <Text style={styles.weekStatValue}>₱{weeklySpend.toFixed(2)}</Text>
      </View>
      {selectedDate && (
        <View style={{ flex: 1 }}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayLabel}>{selectedDate}</Text>
            <Text style={styles.dayTotal}>Spent ₱{dailySpend.toFixed(2)}</Text>
          </View>
          <FlatList
            data={dayTransactions}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item }) => (
              <TransactionRow item={item} categories={categories} onPress={setDetailItem} onDelete={handleDelete} />
            )}
            ListEmptyComponent={<Text style={styles.empty}>Nothing logged this day.</Text>}
          />
        </View>
      )}
      <TransactionDetailModal visible={!!detailItem} item={detailItem} categories={categories} onClose={() => setDetailItem(null)} onDelete={handleDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  weekStat: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 14,
  },
  weekStatLabel: { color: '#9FB0A8', fontSize: 13 },
  weekStatValue: { color: '#D97A55', fontSize: 15, fontWeight: '600' },
  dayHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 10,
  },
  dayTotal: { color: '#D97A55', fontSize: 12.5, fontWeight: '600' },
  container: { flex: 1, backgroundColor: '#0F1A18', paddingTop: 60 },
  dayLabel: { color: '#9FB0A8', fontSize: 13, marginBottom: 10, paddingHorizontal: 20 },
  empty: { color: '#5E6F68', textAlign: 'center', marginTop: 20 },
});