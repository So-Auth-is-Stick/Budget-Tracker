import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateCategory } from './categories';
import { monthOf, prevMonthOf, getWeekRange } from './dateUtils';
import { sortByRecent } from './sortUtils';
import { useToday } from './useToday';
import { useTheme } from './theme';

export default function BudgetScreen({ categories, setCategories, transactions }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const today = useToday();
  const [limitModalCat, setLimitModalCat] = useState(null);
  const [dailyInput, setDailyInput] = useState('');
  const [weeklyInput, setWeeklyInput] = useState('');
  const [monthlyInput, setMonthlyInput] = useState('');

  const currentMonth = monthOf(today);
  const lastMonth = prevMonthOf(currentMonth);
  const { start: weekStart, end: weekEnd } = getWeekRange(today);
  // The tag whose limits were edited most recently comes first
  const expenseCats = sortByRecent(categories.filter((c) => c.type === 'expense'), 'budgetUpdatedAt');

  const expenses = transactions.filter((tx) => tx.type === 'expense');
  const spentWhere = (catId, test) => expenses.filter((tx) => tx.category === catId && test(tx)).reduce((s, tx) => s + tx.amount, 0);
  const spentToday = (catId) => spentWhere(catId, (tx) => tx.date === today);
  const spentWeek = (catId) => spentWhere(catId, (tx) => tx.date >= weekStart && tx.date <= weekEnd);
  const spentMonth = (catId) => spentWhere(catId, (tx) => monthOf(tx.date) === currentMonth);

  const totalMonthlyBudget = expenseCats.reduce((s, c) => s + (c.budget || 0), 0);
  const totalMonthlySpent = expenses.filter((tx) => monthOf(tx.date) === currentMonth).reduce((s, tx) => s + tx.amount, 0);
  const heroPct = totalMonthlyBudget > 0 ? Math.min(100, (totalMonthlySpent / totalMonthlyBudget) * 100) : 0;
  const heroOver = totalMonthlyBudget > 0 && totalMonthlySpent > totalMonthlyBudget;

  const totalWeeklyBudget = expenseCats.reduce((s, c) => s + (c.weeklyBudget || 0), 0);
  const totalWeekSpent = expenses.filter((tx) => tx.date >= weekStart && tx.date <= weekEnd).reduce((s, tx) => s + tx.amount, 0);

  const totalLastMonth = expenses.filter((tx) => monthOf(tx.date) === lastMonth).reduce((s, tx) => s + tx.amount, 0);
  const spendDiff = totalMonthlySpent - totalLastMonth;
  const pctChange = totalLastMonth > 0 ? Math.round((spendDiff / totalLastMonth) * 100) : null;
  const compareText = spendDiff === 0
    ? 'Same as last month'
    : `${spendDiff > 0 ? '▲' : '▼'} ${Math.abs(pctChange)}% ${spendDiff > 0 ? 'more' : 'less'} than last month`;

  const openLimitModal = (cat) => {
    setLimitModalCat(cat);
    setDailyInput(cat.dailyBudget ? String(cat.dailyBudget) : '');
    setWeeklyInput(cat.weeklyBudget ? String(cat.weeklyBudget) : '');
    setMonthlyInput(cat.budget ? String(cat.budget) : '');
  };
  const saveLimits = async () => {
    const cat = limitModalCat;
    const next = {
      dailyBudget: Math.max(0, parseFloat(dailyInput) || 0),
      weeklyBudget: Math.max(0, parseFloat(weeklyInput) || 0),
      budget: Math.max(0, parseFloat(monthlyInput) || 0),
    };
    const changed =
      next.dailyBudget !== (cat.dailyBudget || 0) ||
      next.weeklyBudget !== (cat.weeklyBudget || 0) ||
      next.budget !== (cat.budget || 0);
    setCategories(await updateCategory(cat.id, changed ? { ...next, budgetUpdatedAt: Date.now() } : next));
    setLimitModalCat(null);
  };

  const renderLimit = (label, spent, limit, color) => {
    if (!(limit > 0)) return null;
    const pct = Math.min(100, (spent / limit) * 100);
    const over = spent > limit;
    return (
      <View style={styles.limitBlock} key={label}>
        <View style={styles.limitTop}>
          <Text style={styles.limitLabel}>{label}</Text>
          <Text style={[styles.limitAmt, over && { color: t.spend }]}>{over ? '⚠️ ' : ''}₱{spent.toFixed(0)} / ₱{limit.toFixed(0)}</Text>
        </View>
        <View style={styles.track}><View style={[styles.fill, { width: `${pct}%`, backgroundColor: over ? t.spend : color }]} /></View>
      </View>
    );
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
          <Text style={styles.heroWeek}>
            This week ₱{totalWeekSpent.toFixed(0)}{totalWeeklyBudget > 0 ? ` of ₱${totalWeeklyBudget.toFixed(0)} budgeted` : ''}
          </Text>
          {totalLastMonth > 0 && (
            <Text style={[styles.compareText, { color: spendDiff > 0 ? t.spend : spendDiff < 0 ? t.gain : t.inkDim }]}>{compareText}</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Spending limits</Text>
        {expenseCats.length === 0 && <Text style={styles.empty}>No spending tags yet.</Text>}
        {expenseCats.map((cat) => {
          const hasAnyLimit = cat.dailyBudget > 0 || cat.weeklyBudget > 0 || cat.budget > 0;
          return (
            <TouchableOpacity key={cat.id} style={[styles.card, { backgroundColor: cat.color + '18', borderColor: cat.color + '55' }]} onPress={() => openLimitModal(cat)}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: cat.color + '35' }]}><Text style={{ fontSize: 16 }}>{cat.icon}</Text></View>
                <Text style={styles.budgetName}>{cat.label}</Text>
              </View>
              {!hasAnyLimit && <Text style={styles.noLimit}>No limits set. Tap to add one.</Text>}
              {renderLimit('Daily', spentToday(cat.id), cat.dailyBudget, cat.color)}
              {renderLimit('Weekly', spentWeek(cat.id), cat.weeklyBudget, cat.color)}
              {renderLimit('Monthly', spentMonth(cat.id), cat.budget, cat.color)}
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
            <Text style={styles.fieldLabel}>Weekly limit (Sunday to Saturday)</Text>
            <TextInput style={styles.textField} keyboardType="decimal-pad" placeholder="e.g. 1500" placeholderTextColor={t.inkFaint} value={weeklyInput} onChangeText={setWeeklyInput} />
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
  heroWeek: { color: t.inkDim, fontSize: 13, marginTop: 12 },
  compareText: { marginTop: 8, fontSize: 12.5, fontWeight: '600' },
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
