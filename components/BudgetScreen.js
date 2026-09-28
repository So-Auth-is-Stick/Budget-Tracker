import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { updateCategory } from './categories';
import { todayStr, monthOf, prevMonthOf } from './dateUtils';

export default function BudgetScreen({ categories, setCategories, transactions }) {
  const [limitModalCat, setLimitModalCat] = useState(null);
  const [dailyInput, setDailyInput] = useState('');
  const [monthlyInput, setMonthlyInput] = useState('');

  const today = todayStr();
  const currentMonth = monthOf(today);
  const expenseCats = categories.filter((c) => c.type === 'expense');

  const spentOn = (categoryId, dateStr) =>
    transactions.filter((t) => t.type === 'expense' && t.category === categoryId && t.date === dateStr).reduce((sum, t) => sum + t.amount, 0);
  const spentThisMonth = (categoryId) =>
    transactions.filter((t) => t.type === 'expense' && t.category === categoryId && monthOf(t.date) === currentMonth).reduce((sum, t) => sum + t.amount, 0);

  const totalMonthlyBudget = expenseCats.reduce((s, c) => s + (c.budget || 0), 0);
  const totalMonthlySpent = expenseCats.reduce((s, c) => s + spentThisMonth(c.id), 0);
  const lastMonth = prevMonthOf(currentMonth);
  const totalLastMonthSpent = transactions
    .filter((t) => t.type === 'expense' && monthOf(t.date) === lastMonth)
    .reduce((s, t) => s + t.amount, 0);
  const spendDiff = totalMonthlySpent - totalLastMonthSpent;
  const pctChange = totalLastMonthSpent > 0 ? Math.round((spendDiff / totalLastMonthSpent) * 100) : null;
  const heroPct = totalMonthlyBudget > 0 ? Math.min(100, (totalMonthlySpent / totalMonthlyBudget) * 100) : 0;
  const heroOver = totalMonthlyBudget > 0 && totalMonthlySpent > totalMonthlyBudget;

  const openLimitModal = (cat) => {
    setLimitModalCat(cat);
    setDailyInput(cat.dailyBudget ? String(cat.dailyBudget) : '');
    setMonthlyInput(cat.budget ? String(cat.budget) : '');
  };
  const saveLimits = async () => {
    const daily = parseFloat(dailyInput);
    const monthly = parseFloat(monthlyInput);
    setCategories(await updateCategory(limitModalCat.id, { dailyBudget: daily > 0 ? daily : 0, budget: monthly > 0 ? monthly : 0 }));
    setLimitModalCat(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Spent this month</Text>
          <Text style={styles.heroAmt}>
            ₱{totalMonthlySpent.toFixed(0)}
            {totalMonthlyBudget > 0 && <Text style={styles.heroOf}>  of ₱{totalMonthlyBudget.toFixed(0)} budgeted</Text>}
          </Text>
          {totalLastMonthSpent > 0 && (
            <View style={styles.compareRow}>
              <Text style={[styles.compareText, { color: spendDiff > 0 ? '#D97A55' : spendDiff < 0 ? '#7FC29B' : '#9FB0A8' }]}>
                {spendDiff > 0 ? '▲' : spendDiff < 0 ? '▼' : '—'} {Math.abs(pctChange)}% {spendDiff > 0 ? 'more' : spendDiff < 0 ? 'less' : 'the same as'} last month
              </Text>
            </View>
          )}
          {totalMonthlyBudget > 0 && (
            <View style={styles.heroTrack}>
              <View style={[styles.heroFill, { width: `${heroPct}%`, backgroundColor: heroOver ? '#D97A55' : '#E8B84B' }]} />
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Spending limits</Text>
        {expenseCats.length === 0 && <Text style={styles.empty}>No spending tags yet.</Text>}
        {expenseCats.map((cat) => {
          const daySpent = spentOn(cat.id, today);
          const monthSpent = spentThisMonth(cat.id);
          const dailyBudget = cat.dailyBudget || 0;
          const monthlyBudget = cat.budget || 0;
          const dayPct = dailyBudget > 0 ? Math.min(100, (daySpent / dailyBudget) * 100) : 0;
          const monthPct = monthlyBudget > 0 ? Math.min(100, (monthSpent / monthlyBudget) * 100) : 0;
          const dayOver = dailyBudget > 0 && daySpent > dailyBudget;
          const monthOver = monthlyBudget > 0 && monthSpent > monthlyBudget;
          const hasAnyLimit = dailyBudget > 0 || monthlyBudget > 0;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.card, { backgroundColor: cat.color + '14', borderColor: cat.color + '40' }]}
              onPress={() => openLimitModal(cat)}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: cat.color + '30' }]}><Text style={{ fontSize: 16 }}>{cat.icon}</Text></View>
                <Text style={styles.budgetName}>{cat.label}</Text>
              </View>
              {!hasAnyLimit && <Text style={styles.noLimit}>No limits set — tap to add one</Text>}
              {dailyBudget > 0 && (
                <View style={styles.limitBlock}>
                  <View style={styles.limitTop}>
                    <Text style={styles.limitLabel}>Daily</Text>
                    <Text style={[styles.limitAmt, dayOver && { color: '#D97A55' }]}>
                      {dayOver ? '⚠️ ' : ''}₱{daySpent.toFixed(0)} / ₱{dailyBudget.toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.track}><View style={[styles.fill, { width: `${dayPct}%`, backgroundColor: dayOver ? '#D97A55' : cat.color }]} /></View>
                </View>
              )}
              {monthlyBudget > 0 && (
                <View style={styles.limitBlock}>
                  <View style={styles.limitTop}>
                    <Text style={styles.limitLabel}>Monthly</Text>
                    <Text style={[styles.limitAmt, monthOver && { color: '#D97A55' }]}>
                      {monthOver ? '⚠️ ' : ''}₱{monthSpent.toFixed(0)} / ₱{monthlyBudget.toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.track}><View style={[styles.fill, { width: `${monthPct}%`, backgroundColor: monthOver ? '#D97A55' : cat.color }]} /></View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal visible={!!limitModalCat} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{limitModalCat?.icon} {limitModalCat?.label} limits</Text>
            <Text style={styles.fieldLabel}>Daily limit</Text>
            <TextInput style={styles.textField} keyboardType="decimal-pad" placeholder="e.g. 300" placeholderTextColor="#5E6F68" value={dailyInput} onChangeText={setDailyInput} />
            <Text style={styles.fieldLabel}>Monthly limit</Text>
            <TextInput style={styles.textField} keyboardType="decimal-pad" placeholder="e.g. 5000" placeholderTextColor="#5E6F68" value={monthlyInput} onChangeText={setMonthlyInput} />
            <TouchableOpacity style={styles.saveBtn} onPress={saveLimits}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setLimitModalCat(null)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  compareRow: { marginTop: 10 },
  compareText: { fontSize: 12.5, fontWeight: '600' },
  container: { flex: 1, backgroundColor: '#0F1A18', paddingTop: 60 },
  heroCard: { backgroundColor: '#1D2E27', borderRadius: 20, padding: 20, marginHorizontal: 20, marginBottom: 24 },
  heroLabel: { color: '#9FB0A8', fontSize: 13, marginBottom: 6 },
  heroAmt: { color: '#F4EFE6', fontSize: 30, fontWeight: '700', marginBottom: 12 },
  heroOf: { color: '#9FB0A8', fontSize: 14, fontWeight: '400' },
  heroTrack: { height: 9, backgroundColor: '#0F1A18', borderRadius: 5, overflow: 'hidden' },
  heroFill: { height: '100%', borderRadius: 5 },
  sectionTitle: { color: '#9FB0A8', fontSize: 13, paddingHorizontal: 20, marginBottom: 10 },
  addLink: { color: '#E8B84B', fontSize: 13, fontWeight: '600', marginBottom: 10 },
  empty: { color: '#5E6F68', fontSize: 13, paddingHorizontal: 20, marginBottom: 10 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginHorizontal: 20, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  budgetName: { color: '#F4EFE6', fontSize: 15, fontWeight: '600' },
  noLimit: { color: '#5E6F68', fontSize: 12, marginBottom: 2 },
  limitBlock: { marginTop: 6 },
  limitTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  limitLabel: { color: '#9FB0A8', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.5 },
  limitAmt: { color: '#F4EFE6', fontSize: 13 },
  track: { height: 7, backgroundColor: '#0F1A18', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#16241F', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  sheetTitle: { color: '#F4EFE6', fontSize: 16, marginBottom: 16 },
  fieldLabel: { color: '#5E6F68', fontSize: 12, marginBottom: 4 },
  input: { fontSize: 28, color: '#F4EFE6', textAlign: 'center', marginBottom: 18, borderBottomColor: '#2A3B34', borderBottomWidth: 1, paddingBottom: 8 },
  textField: { backgroundColor: '#1D2E27', borderRadius: 12, color: '#F4EFE6', padding: 12, fontSize: 14.5, marginBottom: 14 },
  saveBtn: { backgroundColor: '#E8B84B', padding: 14, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: '#1B1200', fontWeight: '600' },
  cancel: { color: '#9FB0A8', textAlign: 'center', marginTop: 12 },
});