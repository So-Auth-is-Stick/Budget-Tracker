import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { findCategory } from './categories';
import { monthOf, prevMonthOf, formatLong } from './dateUtils';
import { monthStats, weekdayPattern, observations, monthLabel, nextMonthOf } from './insights';
import { peso, pesoShort } from './format';
import { useToday } from './useToday';
import { useTheme } from './theme';
import * as haptic from './haptics';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function InsightsScreen({ visible, onClose, transactions, categories }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const today = useToday();
  const [month, setMonth] = useState(monthOf(today));
  const [pickedDay, setPickedDay] = useState(null);

  const firstMonth = useMemo(() => transactions.reduce((m, tx) => (tx.date.slice(0, 7) < m ? tx.date.slice(0, 7) : m), monthOf(today)), [transactions, today]);
  const cur = useMemo(() => monthStats(transactions, month, today), [transactions, month, today]);
  const prev = useMemo(() => monthStats(transactions, prevMonthOf(month), today), [transactions, month, today]);
  const wk = useMemo(() => weekdayPattern(transactions, today), [transactions, today]);
  const notes = useMemo(() => observations(transactions, categories, month, today), [transactions, categories, month, today]);

  const catRows = Object.entries(cur.byCat).sort((a, b) => b[1] - a[1]).map(([id, amt]) => ({ cat: findCategory(categories, id), id, amt, prevAmt: prev.byCat[id] || 0 }));
  const incomeRows = Object.entries(cur.byIncome).sort((a, b) => b[1] - a[1]).map(([id, amt]) => ({ cat: findCategory(categories, id), amt }));
  const dailyMax = Math.max(1, ...cur.daily);

  const go = (dir) => {
    haptic.tap();
    setPickedDay(null);
    setMonth(dir < 0 ? prevMonthOf(month) : nextMonthOf(month));
  };
  const canPrev = month > firstMonth;
  const canNext = month < monthOf(today);

  const pickedTotal = pickedDay ? cur.daily[pickedDay - 1] : null;
  const pickedDate = pickedDay ? `${month}-${String(pickedDay).padStart(2, '0')}` : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} accessibilityLabel="Close"><Ionicons name="chevron-down" size={24} color={t.ink} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Insights</Text>
          <View style={styles.headerBtn} />
        </View>

        <View style={styles.monthNav}>
          <TouchableOpacity disabled={!canPrev} onPress={() => go(-1)} style={[styles.navBtn, !canPrev && { opacity: 0.3 }]}><Ionicons name="chevron-back" size={20} color={t.ink} /></TouchableOpacity>
          <Text style={styles.monthText}>{monthLabel(month)}</Text>
          <TouchableOpacity disabled={!canNext} onPress={() => go(1)} style={[styles.navBtn, !canNext && { opacity: 0.3 }]}><Ionicons name="chevron-forward" size={20} color={t.ink} /></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
          {/* Earned / spent / kept */}
          <View style={styles.summary}>
            <View style={styles.sumCol}>
              <Text style={styles.sumLabel}>Earned</Text>
              <Text style={[styles.sumVal, { color: t.gain }]} numberOfLines={1} adjustsFontSizeToFit>{peso(cur.earned, 0)}</Text>
            </View>
            <View style={styles.sumDivider} />
            <View style={styles.sumCol}>
              <Text style={styles.sumLabel}>Spent</Text>
              <Text style={[styles.sumVal, { color: t.spend }]} numberOfLines={1} adjustsFontSizeToFit>{peso(cur.spent, 0)}</Text>
            </View>
            <View style={styles.sumDivider} />
            <View style={styles.sumCol}>
              <Text style={styles.sumLabel}>Kept</Text>
              <Text style={[styles.sumVal, { color: cur.net >= 0 ? t.ink : t.spend }]} numberOfLines={1} adjustsFontSizeToFit>{peso(cur.net, 0)}</Text>
            </View>
          </View>
          {cur.earned > 0 && (
            <View style={styles.flowTrack}>
              <View style={[styles.flowFill, { flex: Math.min(cur.spent, cur.earned), backgroundColor: t.spend }]} />
              {cur.net > 0 && <View style={[styles.flowFill, { flex: cur.net, backgroundColor: t.gain }]} />}
            </View>
          )}

          {notes.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>What stands out</Text>
              {notes.map((n, i) => (
                <View key={i} style={styles.noteRow}>
                  <Text style={styles.noteIcon}>{n.icon}</Text>
                  <Text style={[styles.noteText, n.tone === 'bad' && { color: t.spend }]}>{n.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Day by day */}
          <View style={styles.card}>
            <View style={styles.cardHeadRow}>
              <Text style={styles.cardTitle}>Day by day</Text>
              <Text style={styles.cardMeta}>{pickedDay ? `${formatLong(pickedDate)} · ${peso(pickedTotal, 0)}` : `avg ${peso(cur.avgPerDay, 0)}/day`}</Text>
            </View>
            <View style={styles.dailyChart}>
              {cur.avgPerDay > 0 && <View style={[styles.avgLine, { bottom: 16 + (cur.avgPerDay / dailyMax) * 90, borderColor: t.inkFaint }]} />}
              {cur.daily.map((v, i) => {
                const future = cur.isCurrent ? i + 1 > cur.daysElapsed : false;
                const sel = pickedDay === i + 1;
                return (
                  <TouchableOpacity key={i} style={styles.dCol} disabled={future} onPress={() => { haptic.tap(); setPickedDay(sel ? null : i + 1); }}>
                    <View style={[styles.dBar, { height: v > 0 ? Math.max(3, (v / dailyMax) * 90) : 2, backgroundColor: future ? t.edge : sel ? t.accent : v > cur.avgPerDay * 1.5 ? t.spend : t.spend + '88' }]} />
                    <Text style={styles.dLabel}>{(i + 1) % 5 === 0 || i === 0 ? i + 1 : ''}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {cur.isCurrent && cur.daysElapsed > 0 && (
              <Text style={styles.cardFoot}>
                At this pace: about <Text style={{ color: t.ink, fontWeight: '700' }}>{peso(cur.projected, 0)}</Text> by month end
                {prev.spent > 0 ? ` (last month ${peso(prev.spent, 0)})` : ''}.
              </Text>
            )}
          </View>

          {/* Where it went */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Where it went</Text>
            {catRows.length === 0 ? <Text style={styles.empty}>No spending this month.</Text> : (
              <>
                <View style={styles.stack}>
                  {catRows.map((r) => <View key={r.id} style={{ flex: r.amt, backgroundColor: r.cat.color }} />)}
                </View>
                {catRows.map((r) => {
                  const pct = Math.round((r.amt / cur.spent) * 100);
                  const change = r.prevAmt > 0 ? Math.round(((r.amt - r.prevAmt) / r.prevAmt) * 100) : null;
                  return (
                    <View key={r.id} style={styles.catRow}>
                      <View style={[styles.catDot, { backgroundColor: r.cat.color }]} />
                      <Text style={styles.catName} numberOfLines={1}>{r.cat.icon} {r.cat.label}</Text>
                      <Text style={styles.catPct}>{pct}%</Text>
                      <Text style={styles.catAmt}>{peso(r.amt, 0)}</Text>
                      <Text style={[styles.catChange, { color: change === null ? t.inkFaint : change > 0 ? t.spend : t.gain }]}>
                        {change === null ? 'new' : `${change > 0 ? '▲' : change < 0 ? '▼' : ''}${Math.abs(change)}%`}
                      </Text>
                    </View>
                  );
                })}
                <Text style={styles.cardFoot}>Arrows compare with all of {monthLabel(prevMonthOf(month)).split(' ')[0]}.</Text>
              </>
            )}
          </View>

          {/* Weekday pattern */}
          <View style={styles.card}>
            <View style={styles.cardHeadRow}>
              <Text style={styles.cardTitle}>Your week</Text>
              <Text style={styles.cardMeta}>avg per day, last 8 weeks</Text>
            </View>
            <View style={styles.wkChart}>
              {wk.avg.map((v, i) => (
                <View key={i} style={styles.wkCol}>
                  <Text style={styles.wkVal}>{v > 0 ? pesoShort(v).replace('₱', '') : ''}</Text>
                  <View style={[styles.wkBar, { height: Math.max(3, (v / wk.max) * 70), backgroundColor: i === wk.top ? t.accent : t.accent + '55' }]} />
                  <Text style={[styles.wkDay, i === wk.top && { color: t.accent, fontWeight: '700' }]}>{WD[i]}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Biggest */}
          {cur.biggest.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Biggest expenses</Text>
              {cur.biggest.map((tx, i) => {
                const c = findCategory(categories, tx.category);
                return (
                  <View key={tx.id} style={[styles.bigRow, i > 0 && { borderTopWidth: 1, borderTopColor: t.edge }]}>
                    <Text style={styles.bigRank}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bigName} numberOfLines={1}>{c.icon} {tx.note || c.label}</Text>
                      <Text style={styles.bigMeta}>{c.label} · {formatLong(tx.date)}</Text>
                    </View>
                    <Text style={styles.bigAmt}>{peso(tx.amount, 0)}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {incomeRows.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Money in</Text>
              {incomeRows.map((r) => (
                <View key={r.cat.label} style={styles.catRow}>
                  <View style={[styles.catDot, { backgroundColor: r.cat.color }]} />
                  <Text style={styles.catName}>{r.cat.icon} {r.cat.label}</Text>
                  <Text style={[styles.catAmt, { color: t.gain }]}>{peso(r.amt, 0)}</Text>
                </View>
              ))}
            </View>
          )}

          {cur.count === 0 && <Text style={[styles.empty, { textAlign: 'center', marginTop: 20 }]}>Nothing recorded in {monthLabel(month)}.</Text>}
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 4 },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: t.ink, fontSize: 18, fontWeight: '700' },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 14 },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' },
  monthText: { color: t.ink, fontSize: 16, fontWeight: '600', minWidth: 150, textAlign: 'center' },
  summary: { flexDirection: 'row', backgroundColor: t.surface, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 8 },
  sumCol: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  sumDivider: { width: 1, backgroundColor: t.edge },
  sumLabel: { color: t.inkDim, fontSize: 12, marginBottom: 4 },
  sumVal: { fontSize: 18, fontWeight: '800' },
  flowTrack: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 10, marginBottom: 6, backgroundColor: t.surface2 },
  flowFill: { height: '100%' },
  card: { backgroundColor: t.surface, borderRadius: 18, padding: 16, marginTop: 14 },
  cardHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardTitle: { color: t.ink, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  cardMeta: { color: t.inkDim, fontSize: 12 },
  cardFoot: { color: t.inkDim, fontSize: 12.5, marginTop: 12, lineHeight: 18 },
  empty: { color: t.inkFaint, fontSize: 13 },
  noteRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  noteIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  noteText: { flex: 1, color: t.ink, fontSize: 13.5, lineHeight: 19 },
  dailyChart: { flexDirection: 'row', alignItems: 'flex-end', height: 112 },
  avgLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed' },
  dCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  dBar: { width: '70%', borderRadius: 2 },
  dLabel: { color: t.inkFaint, fontSize: 9, height: 14, marginTop: 2 },
  stack: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12, gap: 2 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { flex: 1, color: t.ink, fontSize: 13.5 },
  catPct: { color: t.inkDim, fontSize: 12, width: 36, textAlign: 'right' },
  catAmt: { color: t.ink, fontSize: 13.5, fontWeight: '600', width: 78, textAlign: 'right' },
  catChange: { fontSize: 11.5, width: 48, textAlign: 'right' },
  wkChart: { flexDirection: 'row', alignItems: 'flex-end', height: 104 },
  wkCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  wkVal: { color: t.inkFaint, fontSize: 9.5, marginBottom: 3 },
  wkBar: { width: 22, borderRadius: 6 },
  wkDay: { color: t.inkDim, fontSize: 11.5, marginTop: 5 },
  bigRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  bigRank: { color: t.inkFaint, fontSize: 13, width: 14 },
  bigName: { color: t.ink, fontSize: 14 },
  bigMeta: { color: t.inkDim, fontSize: 11.5, marginTop: 2 },
  bigAmt: { color: t.spend, fontSize: 14, fontWeight: '700' },
});
