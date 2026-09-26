import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { loadTransactions } from './storage';

export default function CalendarScreen() {
  const [transactions, setTransactions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    loadTransactions().then(setTransactions);
  }, []);

  // Build a lookup like { "2026-09-26": { income: true, expense: false } }
  const summaryByDate = transactions.reduce((acc, t) => {
    if (!acc[t.date]) acc[t.date] = { income: false, expense: false };
    acc[t.date][t.type] = true;
    return acc;
  }, {});

  // Turn that into the format react-native-calendars wants for dots
  const markedDates = Object.keys(summaryByDate).reduce((acc, date) => {
    const dots = [];
    if (summaryByDate[date].income) dots.push({ key: 'in', color: '#7FC29B' });
    if (summaryByDate[date].expense) dots.push({ key: 'out', color: '#D97A55' });
    acc[date] = { dots, marked: true };
    return acc;
  }, {});

  if (selectedDate) {
    markedDates[selectedDate] = {
      ...(markedDates[selectedDate] || {}),
      selected: true,
      selectedColor: '#E8B84B',
    };
  }

  const dayTransactions = selectedDate
    ? transactions.filter((t) => t.date === selectedDate)
    : [];

  return (
    <View style={styles.container}>
      <Calendar
        markingType="multi-dot"
        markedDates={markedDates}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        theme={{
          calendarBackground: '#0F1A18',
          dayTextColor: '#F4EFE6',
          monthTextColor: '#F4EFE6',
          textDisabledColor: '#5E6F68',
          todayTextColor: '#E8B84B',
          arrowColor: '#E8B84B',
        }}
        style={{ marginBottom: 10 }}
      />

      {selectedDate && (
        <View style={{ paddingHorizontal: 20, flex: 1 }}>
          <Text style={styles.dayLabel}>{selectedDate}</Text>
          <FlatList
            data={dayTransactions}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={{ color: item.type === 'income' ? '#7FC29B' : '#D97A55' }}>
                  {item.type === 'income' ? '+' : '−'}₱{item.amount.toFixed(2)}
                </Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>Nothing logged this day.</Text>}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1A18', paddingTop: 60 },
  dayLabel: { color: '#9FB0A8', fontSize: 13, marginBottom: 10 },
  row: { paddingVertical: 8, borderBottomColor: '#2A3B34', borderBottomWidth: 1 },
  empty: { color: '#5E6F68', textAlign: 'center', marginTop: 20 },
});