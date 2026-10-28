import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTxActions } from './txActions';
import TransactionRow from './TransactionRow';
import TransactionDetailModal from './TransactionDetailModal';
import GoalDetailModal from './GoalDetailModal';
import { updateGoal, deleteGoal } from './goals';
import { findCategory } from './categories';
import { computeOverLimitFlags, periodSpent, limitFor } from './overLimit';
import { getWeekRange, monthOf, daysUntil, formatLong } from './dateUtils';
import { useToday } from './useToday';
import { useTheme, readableOn } from './theme';
import { peso, pesoShort } from './format';
import { goalIcon } from './goalStyle';

const GOAL_DOT = '#9C6ADE';
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// One calendar square: date, how much was spent (shaded by how heavy the day was) and small markers
function DayCell({ date, state, marking = {}, onPress }) {
  const { theme: t } = useTheme();
  if (!date) return <View style={{ width: 46, height: 50 }} />;
  const other = state === 'disabled';
  const isToday = state === 'today';
  const { spent = 0, heat = 0, earned, over, goal, focusColor, selected } = marking;
  const bg = focusColor ? focusColor : spent > 0 ? t.spend + Math.round(0x14 + heat * 0x70).toString(16).padStart(2, '0') : 'transparent';
  const textColor = focusColor ? readableOn(focusColor) : isToday ? t.accent : t.ink;
  return (
    <TouchableOpacity onPress={() => onPress && onPress(date)} activeOpacity={0.6}
      style={{ width: 46, height: 50, borderRadius: 12, alignItems: 'center', paddingTop: 5, backgroundColor: bg, opacity: other ? 0.35 : 1,
        borderWidth: selected || isToday ? 2 : 0, borderColor: selected ? t.accent : t.accent + '99' }}>
      <Text style={{ color: textColor, fontSize: 14, fontWeight: isToday || selected ? '800' : '500' }}>{date.day}</Text>
      <Text style={{ color: focusColor ? readableOn(focusColor) : t.inkDim, fontSize: 9.5, marginTop: 1 }} numberOfLines={1}>
        {spent > 0 ? pesoShort(spent).replace('₱', '') : ''}
      </Text>
      <View style={{ flexDirection: 'row', gap: 2, marginTop: 1, height: 5 }}>
        {earned && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.gain }} />}
        {over && <View style={{ width: 5, height: 5, borderRadius: 1, backgroundColor: t.accent, transform: [{ rotate: '45deg' }] }} />}
        {goal && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: GOAL_DOT }} />}
      </View>
    </TouchableOpacity>
  );
}

export default function CalendarScreen({ categories, transactions, setTransactions, goals, setGoals, onCommitGoal, onAddForDate }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const today = useToday();
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [detailGoal, setDetailGoal] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [focusCat, setFocusCat] = useState(null); // tag whose spending dates are highlighted
  const [viewMonth, setViewMonth] = useState(monthOf(today)); // month shown in the calendar

  // Which expenses pushed a tag past its daily / weekly / monthly limit
  const flags = useMemo(() => computeOverLimitFlags(transactions, categories), [transactions, categories]);

  const { start, end } = getWeekRange(selectedDate || today);
  const expenses = transactions.filter((tx) => tx.type === 'expense');
  const weeklySpend = expenses.filter((tx) => tx.date >= start && tx.date <= end).reduce((s, tx) => s + tx.amount, 0);
  const dailySpend = selectedDate ? expenses.filter((tx) => tx.date === selectedDate).reduce((s, tx) => s + tx.amount, 0) : 0;

  const goalsDueByDate = {};
  (goals || []).filter((g) => !g.committed && g.dueDate).forEach((g) => {
    (goalsDueByDate[g.dueDate] = goalsDueByDate[g.dueDate] || []).push(g);
  });
  const overLimitDates = {};
  transactions.forEach((tx) => { if (flags[tx.id]) overLimitDates[tx.date] = true; });

  // Highlight every day this tag was spent on, in the tag's own colour
  const focusCategory = focusCat ? findCategory(categories, focusCat) : null;
  const focusDates = focusCat ? [...new Set(expenses.filter((tx) => tx.category === focusCat).map((tx) => tx.date))] : [];

  const marked = useMemo(() => {
    const m = {};
    const get = (d) => (m[d] = m[d] || { spent: 0 });
    transactions.forEach((tx) => {
      const day = get(tx.date);
      if (tx.type === 'expense') day.spent += tx.amount; else day.earned = true;
    });
    Object.keys(overLimitDates).forEach((d) => { get(d).over = true; });
    Object.keys(goalsDueByDate).forEach((d) => { get(d).goal = true; });
    // shade relative to the heaviest day of the month being viewed (ignoring one-off spikes above 2x the median)
    const monthVals = Object.entries(m).filter(([d, v]) => d.slice(0, 7) === viewMonth && v.spent > 0).map(([, v]) => v.spent).sort((a, b) => a - b);
    const median = monthVals.length ? monthVals[Math.floor(monthVals.length / 2)] : 1;
    const cap = Math.max(1, Math.min(monthVals[monthVals.length - 1] || 1, median * 2));
    Object.values(m).forEach((v) => { v.heat = Math.min(1, v.spent / cap); });
    if (focusCategory) focusDates.forEach((d) => { get(d).focusColor = focusCategory.color; });
    if (selectedDate) get(selectedDate).selected = true;
    return m;
  }, [transactions, flags, goals, focusCat, categories, selectedDate, viewMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthTx = transactions.filter((tx) => monthOf(tx.date) === viewMonth);
  const monthSpent = monthTx.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  const monthEarned = monthTx.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
  const monthByCat = {};
  monthTx.filter((tx) => tx.type === 'expense').forEach((tx) => {
    monthByCat[tx.category] = (monthByCat[tx.category] || 0) + tx.amount;
  });
  const monthEntries = Object.entries(monthByCat).sort((a, b) => b[1] - a[1]);
  const monthMax = monthEntries.length ? monthEntries[0][1] : 0;
  const monthName = MONTH_NAMES[Number(viewMonth.slice(5, 7)) - 1];
  const focusInMonth = focusDates.filter((d) => monthOf(d) === viewMonth).length;

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

  const txActions = useTxActions(categories, setTransactions);
  const handleDelete = (id) => txActions.remove(id, transactions);
  const handleEditSave = (id, changes) => txActions.edit(id, changes);
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
    <View style={styles.container}>
    <ScrollView
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    >
      <Calendar
        key={t.name}
        current={viewMonth + '-01'}
        markedDates={marked}
        dayComponent={(p) => <DayCell {...p} onPress={(d) => setSelectedDate(d.dateString)} />}
        onMonthChange={(m) => setViewMonth(m.dateString.slice(0, 7))}
        enableSwipeMonths
        theme={{
          calendarBackground: t.bg, dayTextColor: t.ink, monthTextColor: t.ink, textDisabledColor: t.inkFaint,
          todayTextColor: t.accent, arrowColor: t.accent, textSectionTitleColor: t.inkDim,
          textMonthFontWeight: '700', textMonthFontSize: 17,
        }}
        style={{ marginBottom: 4 }}
      />
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: t.spend + '80' }]} /><Text style={styles.legendText}>spent</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: t.gain }]} /><Text style={styles.legendText}>earned</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: t.accent, borderRadius: 1, transform: [{ rotate: '45deg' }] }]} /><Text style={styles.legendText}>over limit</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: GOAL_DOT }]} /><Text style={styles.legendText}>plan due</Text></View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{monthName} spent</Text>
          <Text style={[styles.summaryVal, { color: t.spend }]} numberOfLines={1} adjustsFontSizeToFit>{peso(monthSpent, 0)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{monthName} earned</Text>
          <Text style={[styles.summaryVal, { color: t.gain }]} numberOfLines={1} adjustsFontSizeToFit>{peso(monthEarned, 0)}</Text>
        </View>
      </View>
      <View style={styles.weekStat}>
        <Text style={styles.weekStatLabel}>{selectedDate ? 'That week' : 'This week'} ({start.slice(5)} to {end.slice(5)})</Text>
        <Text style={styles.weekStatValue}>{peso(weeklySpend, 2)}</Text>
      </View>

      <View style={styles.monthSection}>
        <Text style={styles.sectionTitle}>{monthName} by tag</Text>
        {monthEntries.length > 0 && !focusCat && <Text style={styles.tapHint}>Tap a tag to see its days on the calendar</Text>}
        {focusCategory && (
          <View style={[styles.focusChip, { borderColor: focusCategory.color }]}>
            <Text style={styles.focusText} numberOfLines={1}>
              {focusCategory.icon} {focusCategory.label} · {focusInMonth} {focusInMonth === 1 ? 'day' : 'days'} in {monthName}
            </Text>
            <TouchableOpacity onPress={() => setFocusCat(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: t.accent, fontWeight: '600', fontSize: 12.5 }}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
        {monthEntries.length === 0 ? (
          <Text style={styles.empty}>Nothing spent in {monthName}.</Text>
        ) : (
          monthEntries.map(([catId, amt]) => {
            const cat = findCategory(categories, catId);
            const pct = monthMax > 0 ? (amt / monthMax) * 100 : 0;
            return (
              <TouchableOpacity
                key={catId}
                activeOpacity={0.6}
                style={[styles.barRow, focusCat && focusCat !== catId && { opacity: 0.4 }]}
                onPress={() => setFocusCat(focusCat === catId ? null : catId)}
              >
                <Text style={styles.barName} numberOfLines={1}>{cat.icon} {cat.label}</Text>
                <View style={styles.barTrack}><View style={[styles.barFill, { width: `${pct}%`, backgroundColor: cat.color }]} /></View>
                <Text style={styles.barAmt}>{peso(amt, 0)}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>

      <Modal visible={!!selectedDate} animationType="slide" transparent onRequestClose={closeDaySheet}>
        <View style={styles.overlay}>
          <View style={styles.daySheet}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{selectedDate ? `${formatLong(selectedDate)}, ${selectedDate.slice(0, 4)}` : ''}</Text>
              <Text style={styles.dayTotal}>{overLimitDates[selectedDate] ? '⚠️ ' : ''}Spent {peso(dailySpend, 2)}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {dayAlerts.length > 0 && (
                <View style={styles.alertBox}>
                  <Text style={styles.alertTitle}>⚠️ Over budget</Text>
                  {dayAlerts.map((a) => (
                    <Text key={a.key} style={styles.alertLine}>
                      {a.cat.icon} {a.cat.label}: {peso(a.spent, 0)} of {peso(a.limit, 0)} {a.kind} limit
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
                        <Text style={{ color: t.ink, fontSize: 14 }}>{goalIcon(g)} {g.label}</Text>
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

            {onAddForDate && selectedDate <= today && (
              <TouchableOpacity style={styles.addDayBtn} onPress={() => { const d = selectedDate; closeDaySheet(); setTimeout(() => onAddForDate(d), 350); }}>
                <Text style={styles.addDayText}>+ Add an entry to this day</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={closeDaySheet} style={{ marginTop: 14 }}>
              <Text style={{ color: t.inkDim, textAlign: 'center' }}>Close</Text>
            </TouchableOpacity>

            <TransactionDetailModal visible={!!detailItem} item={detailItem} categories={categories} onClose={() => setDetailItem(null)} onDelete={handleDelete} onSave={handleEditSave}
        onDuplicate={(it) => txActions.add({ type: it.type, amount: it.amount, category: it.category, note: (it.note || '').replace(/ \(auto\)$/, ''), id: Date.now(), date: today })} />
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
  addDayBtn: { marginTop: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: t.accent, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  addDayText: { color: t.accent, fontWeight: '700' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 12, height: 12, borderRadius: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { color: t.inkDim, fontSize: 11 },
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 12 },
  summaryCard: { flex: 1, backgroundColor: t.surface, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 },
  summaryLabel: { color: t.inkDim, fontSize: 12, marginBottom: 2 },
  summaryVal: { fontSize: 18, fontWeight: '800' },
  weekStat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 18 },
  weekStatLabel: { color: t.inkDim, fontSize: 13 },
  weekStatValue: { color: t.spend, fontSize: 15, fontWeight: '600' },
  sectionTitle: { color: t.inkDim, fontSize: 13, marginBottom: 12 },
  monthSection: { paddingHorizontal: 20 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  tapHint: { color: t.inkFaint, fontSize: 11.5, marginBottom: 8, marginTop: -6 },
  focusChip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8 },
  focusText: { color: t.ink, fontSize: 12.5, flex: 1, marginRight: 10 },
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
