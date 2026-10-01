import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Modal } from 'react-native';
import { updateCategory } from './categories';
import { todayStr, monthOf, prevMonthOf } from './dateUtils';
import { useTheme } from './theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BudgetScreen({ categories, setCategories, transactions }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const [limitModalCat, setLimitModalCat] = useState(null);
  const [dailyInput, setDailyInput] = useState('');
  const [monthlyInput, setMonthlyInput] = useState('');

  const today = todayStr();
  const currentMonth = monthOf(today);
  const lastMonth = prevMonthOf(currentMonth);
  const expenseCats = categories.filter((c) => c.type === 'expense');

  const spentOn = (catId, dateStr) =>
    transactions.filter((tx) => tx.type === 'expense' && tx.category === catId && tx.date === dateStr).reduce((s, tx) => s + tx.amount, 0);
  const spentInMonth = (catId, month) =>
    transactions.filter((tx) => tx.type === 'expense' && tx.category === catId && monthOf(tx.date) === month).reduce((s, tx) => s + tx.amount, 0);

  const totalMonthlyBudget = expenseCats.reduce((s, c) => s + (c.budget || 0), 0);
  const totalMonthlySpent = expenseCats.reduce((s, c) => s + spentInMonth(c.id, currentMonth), 0);
  const heroPct = totalMonthlyBudget > 0 ? Math.min(100, (totalMonthlySpent / totalMonthlyBudget) * 100) : 0;
  const heroOver = totalMonthlyBudget > 0 && totalMonthlySpent > totalMonthlyBudget;

  const totalLastMonth = transactions.filter((tx) => tx.type === 'expense' && monthOf(tx.date) === lastMonth).reduce((s, tx) => s + tx.amount, 0);
  const spendDiff = totalMonthlySpent - totalLastMonth;
  const pctChange = totalLastMonth > 0 ? Math.round((spendDiff / totalLastMonth) * 100) : null;
  const compareText = spendDiff === 0
    ? 'Same as last month'
    : `${spendDiff > 0 ? '▲' : '▼'} ${Math.abs(pctChange)}% ${spendDiff > 0 ? 'more' : 'less'} than last month`;

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
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Spent this month</Text>
          <Text style={styles.heroAmt}>
            ₱{totalMonthlySpent.toFixed(0)}
            {totalMonthlyBudget > 0 && <Text style={styles.heroOf}>  of ₱{totalMonthlyBudget.toFixed(0)} budgeted</Text>}
          </Text>
          {totalMonthlyBudget > 0 && (
            <View style={styles.heroTrack}>
              <View style={[styles.heroFill, { width: `${heroPct}%`, backgroundColor: heroOver ? t.spend : t.accent }]} />
            </View>
          )}
          {totalLastMonth > 0 && (
            <Text style={[styles.compareText, { color: spendDiff > 0 ? t.spend : spendDiff < 0 ? t.gain : t.inkDim }]}>{compareText}</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Spending limits</Text>
        {expenseCats.length === 0 && <Text style={styles.empty}>No spending tags yet.</Text>}
        {expenseCats.map((cat) => {
          const daySpent = spentOn(cat.id, today);
          const monthSpent = spentInMonth(cat.id, currentMonth);
          const dailyBudget = cat.dailyBudget || 0;
          const monthlyBudget = cat.budget || 0;
          const dayPct = dailyBudget > 0 ? Math.min(100, (daySpent / dailyBudget) * 100) : 0;
          const monthPct = monthlyBudget > 0 ? Math.min(100, (monthSpent / monthlyBudget) * 100) : 0;
          const dayOver = dailyBudget > 0 && daySpent > dailyBudget;
          const monthOver = monthlyBudget > 0 && monthSpent > monthlyBudget;
          const hasAnyLimit = dailyBudget > 0 || monthlyBudget > 0;
          return (
            <TouchableOpacity key={cat.id} style={[styles.card, { backgroundColor: cat.color + '18', borderColor: cat.color + '55' }]} onPress={() => openLimitModal(cat)}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: cat.color + '35' }]}><Text style={{ fontSize: 16 }}>{cat.icon}</Text></View>
                <Text style={styles.budgetName}>{cat.label}</Text>
              </View>
              {!hasAnyLimit && <Text style={styles.noLimit}>No limits set — tap to add one</Text>}
              {dailyBudget > 0 && (
                <View style={styles.limitBlock}>
                  <View style={styles.limitTop}>
                    <Text style={styles.limitLabel}>Daily</Text>
                    <Text style={[styles.limitAmt, dayOver && { color: t.spend }]}>{dayOver ? '⚠️ ' : ''}₱{daySpent.toFixed(0)} / ₱{dailyBudget.toFixed(0)}</Text>
                  </View>
                  <View style={styles.track}><View style={[styles.fill, { width: `${dayPct}%`, backgroundColor: dayOver ? t.spend : cat.color }]} /></View>
                </View>
              )}
              {monthlyBudget > 0 && (
                <View style={styles.limitBlock}>
                  <View style={styles.limitTop}>
                    <Text style={styles.limitLabel}>Monthly</Text>
                    <Text style={[styles.limitAmt, monthOver && { color: t.spend }]}>{monthOver ? '⚠️ ' : ''}₱{monthSpent.toFixed(0)} / ₱{monthlyBudget.toFixed(0)}</Text>
                  </View>
                  <View style={styles.track}><View style={[styles.fill, { width: `${monthPct}%`, backgroundColor: monthOver ? t.spend : cat.color }]} /></View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal visible={!!limitModalCat} animationType="slide" transparent onRequestClose={() => setLimitModalCat(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{limitModalCat?.icon} {limitModalCat?.label} limits</Text>
            <Text style={styles.fieldLabel}>Daily limit</Text>
            <TextInput style={styles.textField} keyboardType="decimal-pad" placeholder="e.g. 300" placeholderTextColor={t.inkFaint} value={dailyInput} onChangeText={setDailyInput} />
            <Text style={styles.fieldLabel}>Monthly limit</Text>
            <TextInput style={styles.textField} keyboardType="decimal-pad" placeholder="e.g. 5000" placeholderTextColor={t.inkFaint} value={monthlyInput} onChangeText={setMonthlyInput} />
            <TouchableOpacity style={styles.saveBtn} onPress={saveLimits}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setLimitModalCat(null)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  heroCard: { backgroundColor: t.surface2, borderRadius: 20, padding: 20, marginHorizontal: 20, marginBottom: 24 },
  heroLabel: { color: t.inkDim, fontSize: 13, marginBottom: 6 },
  heroAmt: { color: t.ink, fontSize: 30, fontWeight: '700', marginBottom: 12 },
  heroOf: { color: t.inkDim, fontSize: 14, fontWeight: '400' },
  heroTrack: { height: 9, backgroundColor: t.bg, borderRadius: 5, overflow: 'hidden' },
  heroFill: { height: '100%', borderRadius: 5 },
  compareText: { marginTop: 10, fontSize: 12.5, fontWeight: '600' },
  sectionTitle: { color: t.inkDim, fontSize: 13, paddingHorizontal: 20, marginBottom: 10 },
  empty: { color: t.inkFaint, fontSize: 13, paddingHorizontal: 20 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginHorizontal: 20, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  budgetName: { color: t.ink, fontSize: 15, fontWeight: '600' },
  noLimit: { color: t.inkFaint, fontSize: 12, marginBottom: 2 },
  limitBlock: { marginTop: 6 },
  limitTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  limitLabel: { color: t.inkDim, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.5 },
  limitAmt: { color: t.ink, fontSize: 13 },
  track: { height: 7, backgroundColor: t.bg, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  sheetTitle: { color: t.ink, fontSize: 16, marginBottom: 16 },
  fieldLabel: { color: t.inkFaint, fontSize: 12, marginBottom: 4 },
  textField: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 12, fontSize: 14.5, marginBottom: 14 },
  saveBtn: { backgroundColor: t.accent, padding: 14, borderRadius: 14, alignItems: 'center' },
  saveText: { color: t.onAccent, fontWeight: '600' },
  cancel: { color: t.inkDim, textAlign: 'center', marginTop: 12 },
});