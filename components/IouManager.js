import { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DatePickerModal from './DatePickerModal';
import { loadIous, addIou, updateIou, deleteIou, recordPayment, remainingOf, iouTotals } from './iou';
import { daysUntil, formatLong, todayStr } from './dateUtils';
import { sortByRecent } from './sortUtils';
import { peso } from './format';
import { useTheme, readableOn } from './theme';
import * as haptic from './haptics';

// "Lent & borrowed" section in the Planner
export default function IouManager({ openAddToken }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [list, setList] = useState([]);
  const [showSettled, setShowSettled] = useState(false);
  const [form, setForm] = useState(null);      // new IOU being written
  const [detail, setDetail] = useState(null);  // IOU opened
  const [payInput, setPayInput] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => { loadIous().then(setList); }, []);
  useEffect(() => { if (openAddToken) openNew(); }, [openAddToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const openNew = () => setForm({ direction: 'lent', person: '', amount: '', note: '', dueDate: null });
  const totals = iouTotals(list);
  const open = sortByRecent(list.filter((x) => !x.settled));
  const settled = sortByRecent(list.filter((x) => x.settled), 'settledAtTs');
  const current = detail ? list.find((x) => x.id === detail) : null;

  const saveNew = async () => {
    const amount = parseFloat(String(form.amount).replace(/,/g, ''));
    if (!form.person.trim() || !(amount > 0)) return;
    setList(await addIou({ id: 'iou_' + Date.now(), direction: form.direction, person: form.person.trim(), amount, note: form.note.trim(), dueDate: form.dueDate, date: todayStr() }));
    haptic.success();
    setForm(null);
  };

  const pay = async (amount) => {
    if (!current || !(amount > 0)) return;
    const updated = await recordPayment(current.id, Math.min(amount, remainingOf(current)), todayStr());
    const after = updated.find((x) => x.id === current.id);
    setList(after.settled ? await updateIou(current.id, { settledAtTs: Date.now() }) : updated);
    setPayInput('');
    haptic.success();
    if (after.settled) setDetail(null);
  };

  const remove = () => {
    Alert.alert('Delete this record?', `${current.person} · ${peso(current.amount, 0)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { setList(await deleteIou(current.id)); setDetail(null); } },
    ]);
  };

  const Card = ({ x }) => {
    const lent = x.direction === 'lent';
    const color = lent ? t.gain : t.spend;
    const pct = x.amount > 0 ? Math.min(100, ((x.paid || 0) / x.amount) * 100) : 0;
    const due = x.dueDate && !x.settled ? daysUntil(x.dueDate) : null;
    return (
      <TouchableOpacity style={[styles.card, x.settled && { opacity: 0.55 }]} onPress={() => { setPayInput(''); setDetail(x.id); }}>
        <View style={styles.cardHead}>
          <View style={[styles.avatar, { backgroundColor: color + '33' }]}><Text style={[styles.avatarText, { color }]}>{x.person.slice(0, 1).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{x.person}</Text>
            <Text style={[styles.dir, { color }]}>{lent ? 'owes you' : 'you owe'}{due !== null && due < 0 ? ' · overdue' : ''}</Text>
          </View>
          <Text style={[styles.amt, { color }]}>{peso(x.settled ? x.amount : remainingOf(x), 0)}</Text>
        </View>
        {(x.paid || 0) > 0 && !x.settled && <View style={styles.track}><View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} /></View>}
      </TouchableOpacity>
    );
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Lent & borrowed</Text>
      {(totals.owedToMe > 0 || totals.iOwe > 0) && (
        <View style={styles.totals}>
          <View style={styles.totalBox}><Text style={styles.totalLabel}>Owed to you</Text><Text style={[styles.totalVal, { color: t.gain }]}>{peso(totals.owedToMe, 0)}</Text></View>
          <View style={styles.totalBox}><Text style={styles.totalLabel}>You owe</Text><Text style={[styles.totalVal, { color: t.spend }]}>{peso(totals.iOwe, 0)}</Text></View>
        </View>
      )}
      {open.length === 0 && <Text style={styles.empty}>Lent someone money, or borrowed some? Keep track here with the + button.</Text>}
      {open.map((x) => <Card key={x.id} x={x} />)}
      {settled.length > 0 && (
        <TouchableOpacity onPress={() => setShowSettled(!showSettled)} style={styles.settledToggle}>
          <Text style={styles.settledText}>{showSettled ? 'Hide' : 'Show'} settled ({settled.length})</Text>
        </TouchableOpacity>
      )}
      {showSettled && settled.map((x) => <Card key={x.id} x={x} />)}

      {/* New IOU */}
      <Modal visible={!!form} animationType="slide" transparent onRequestClose={() => setForm(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {form && (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.sheetTitle}>New IOU</Text>
                <View style={styles.dirRow}>
                  {[['lent', 'I lent money', t.gain], ['borrowed', 'I borrowed', t.spend]].map(([k, l, c]) => (
                    <TouchableOpacity key={k} onPress={() => setForm({ ...form, direction: k })}
                      style={[styles.dirBtn, form.direction === k && { backgroundColor: c + '26', borderColor: c }]}>
                      <Text style={{ color: t.ink, fontWeight: form.direction === k ? '700' : '400' }}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={styles.field} placeholder={form.direction === 'lent' ? 'Who borrowed it?' : 'Who lent it to you?'} placeholderTextColor={t.inkFaint}
                  value={form.person} onChangeText={(v) => setForm({ ...form, person: v })} maxLength={30} />
                <TextInput style={styles.field} placeholder="Amount" keyboardType="decimal-pad" placeholderTextColor={t.inkFaint}
                  value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v.replace(/[^0-9.,]/g, '') })} />
                <TextInput style={styles.field} placeholder="What for? (optional)" placeholderTextColor={t.inkFaint}
                  value={form.note} onChangeText={(v) => setForm({ ...form, note: v })} maxLength={60} />
                <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerOpen(true)}>
                  <Ionicons name="calendar-outline" size={17} color={t.ink} />
                  <Text style={{ color: t.ink, flex: 1 }}>{form.dueDate ? `Pay back by ${formatLong(form.dueDate)}` : 'Pay-back date (optional)'}</Text>
                </TouchableOpacity>
                <Text style={styles.help}>This is a record only. It doesn't change your balance or spending.</Text>
                <TouchableOpacity style={styles.saveBtn} onPress={saveNew}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setForm(null)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
              </ScrollView>
            )}
            <DatePickerModal visible={pickerOpen} initialDate={form?.dueDate} onConfirm={(d) => { setForm({ ...form, dueDate: d }); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />
          </View>
        </View>
      </Modal>

      {/* Detail / repayments */}
      <Modal visible={!!current} animationType="slide" transparent onRequestClose={() => setDetail(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {current && (() => {
              const lent = current.direction === 'lent';
              const color = lent ? t.gain : t.spend;
              const left = remainingOf(current);
              return (
                <ScrollView keyboardShouldPersistTaps="handled">
                  <Text style={styles.sheetTitle}>{current.person}</Text>
                  <Text style={[styles.big, { color }]}>{peso(current.settled ? current.amount : left, 0)}</Text>
                  <Text style={styles.sub}>
                    {current.settled ? `Settled${current.settledAt ? ' on ' + formatLong(current.settledAt) : ''}` : lent ? `still owes you (of ${peso(current.amount, 0)})` : `you still owe (of ${peso(current.amount, 0)})`}
                  </Text>
                  {!!current.note && <Text style={styles.note}>{current.note}</Text>}
                  <Text style={styles.meta}>Since {formatLong(current.date)}{current.dueDate ? ` · pay back by ${formatLong(current.dueDate)}` : ''}</Text>
                  {(current.payments || []).length > 0 && (
                    <View style={styles.payments}>
                      {current.payments.map((p, i) => (
                        <View key={i} style={styles.payRow}><Text style={styles.payDate}>{formatLong(p.date)}</Text><Text style={styles.payAmt}>{peso(p.amount, 0)}</Text></View>
                      ))}
                    </View>
                  )}
                  {!current.settled && (
                    <>
                      <Text style={styles.fieldLabel}>{lent ? 'They paid back' : 'I paid back'}</Text>
                      <View style={styles.payInputRow}>
                        <TextInput style={[styles.field, { flex: 1, minWidth: 0, marginBottom: 0 }]} placeholder="Amount" keyboardType="decimal-pad" placeholderTextColor={t.inkFaint} value={payInput} onChangeText={setPayInput} />
                        <TouchableOpacity style={[styles.payBtn, { backgroundColor: color }]} onPress={() => pay(parseFloat(payInput))}><Text style={[styles.payBtnText, { color: readableOn(color) }]}>Record</Text></TouchableOpacity>
                      </View>
                      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: color, marginTop: 10 }]} onPress={() => pay(left)}>
                        <Text style={[styles.saveText, { color: readableOn(color) }]}>All {peso(left, 0)} paid back</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity onPress={remove} style={{ marginTop: 16 }}><Text style={{ color: t.spend, textAlign: 'center', fontWeight: '600' }}>Delete record</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setDetail(null)}><Text style={styles.cancel}>Close</Text></TouchableOpacity>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  sectionTitle: { color: t.inkDim, fontSize: 13, marginBottom: 10 },
  totals: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  totalBox: { flex: 1, backgroundColor: t.surface, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 },
  totalLabel: { color: t.inkDim, fontSize: 12 },
  totalVal: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  empty: { color: t.inkFaint, fontSize: 13, marginBottom: 10, lineHeight: 18 },
  card: { backgroundColor: t.surface2, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', fontSize: 15 },
  name: { color: t.ink, fontSize: 15, fontWeight: '600' },
  dir: { fontSize: 11.5, marginTop: 1 },
  amt: { fontSize: 15, fontWeight: '700' },
  track: { height: 6, backgroundColor: t.bg, borderRadius: 3, overflow: 'hidden', marginTop: 10 },
  fill: { height: '100%', borderRadius: 3 },
  settledToggle: { paddingVertical: 8, alignItems: 'center' },
  settledText: { color: t.accent, fontSize: 12.5, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, maxHeight: '90%' },
  sheetTitle: { color: t.ink, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  dirRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dirBtn: { flex: 1, padding: 11, borderRadius: 12, backgroundColor: t.surface2, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center' },
  field: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 12, fontSize: 15, marginBottom: 10 },
  fieldLabel: { color: t.inkDim, fontSize: 12, marginBottom: 8, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.surface2, borderRadius: 12, padding: 12, marginBottom: 10 },
  help: { color: t.inkFaint, fontSize: 12, marginBottom: 14 },
  saveBtn: { backgroundColor: t.accent, padding: 14, borderRadius: 14, alignItems: 'center' },
  saveText: { color: t.onAccent, fontWeight: '700' },
  cancel: { color: t.inkDim, textAlign: 'center', marginTop: 14 },
  big: { fontSize: 34, fontWeight: '800' },
  sub: { color: t.inkDim, fontSize: 13, marginBottom: 10 },
  note: { color: t.ink, fontSize: 14, marginBottom: 6 },
  meta: { color: t.inkFaint, fontSize: 12, marginBottom: 12 },
  payments: { backgroundColor: t.surface2, borderRadius: 12, padding: 12, marginBottom: 10 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  payDate: { color: t.inkDim, fontSize: 13 },
  payAmt: { color: t.ink, fontSize: 13, fontWeight: '600' },
  payInputRow: { flexDirection: 'row', gap: 8 },
  payBtn: { borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  payBtnText: { color: '#FFFFFF', fontWeight: '700' },
});
