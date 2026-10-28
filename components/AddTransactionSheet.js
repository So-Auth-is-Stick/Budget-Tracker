import { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DatePickerModal from './DatePickerModal';
import { todayStr, formatLong } from './dateUtils';
import { periodSpent, limitFor } from './overLimit';
import { peso } from './format';
import { useTheme, readableOn } from './theme';
import * as haptic from './haptics';
import { frequentEntries } from './insights';

const shiftDay = (ds, n) => {
  const d = new Date(ds + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export default function AddTransactionSheet({ visible, onClose, categories, transactions = [], onSave }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [type, setType] = useState('expense');
  const [categoryId, setCategoryId] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayStr());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [noteFocused, setNoteFocused] = useState(false);

  useEffect(() => {
    if (visible) {
      setType('expense'); setCategoryId(null); setAmount(''); setNote(''); setDate(todayStr());
    }
  }, [visible]);

  const today = todayStr();
  const yesterday = shiftDay(today, -1);

  // Most-used tags first (last 60 days), the rest keep their order
  const tagOrder = useMemo(() => {
    const since = shiftDay(today, -60);
    const use = {};
    transactions.forEach((tx) => { if (tx.date >= since) use[tx.category] = (use[tx.category] || 0) + 1; });
    return categories.filter((c) => c.type === type)
      .map((c, i) => ({ c, i, n: use[c.id] || 0 }))
      .sort((a, b) => b.n - a.n || a.i - b.i)
      .map((x) => x.c);
  }, [categories, transactions, type, today]);

  const shortcuts = useMemo(() => frequentEntries(transactions, type, today), [transactions, type, today]);

  // Previous descriptions for this tag that start like what's being typed
  const noteSuggestions = useMemo(() => {
    if (!categoryId) return [];
    const q = note.trim().toLowerCase();
    const seen = new Set();
    const out = [];
    [...transactions].sort((a, b) => b.date.localeCompare(a.date)).forEach((tx) => {
      if (tx.category !== categoryId || !tx.note) return;
      const n = tx.note.replace(/ \(auto\)$/, '');
      const k = n.toLowerCase();
      if (seen.has(k) || (q && !k.startsWith(q)) || k === q) return;
      seen.add(k); out.push(n);
    });
    return out.slice(0, 5);
  }, [transactions, categoryId, note]);

  const value = parseFloat(amount.replace(/,/g, ''));
  const valid = value > 0 && !!categoryId;
  const switchType = (next) => { haptic.tap(); setType(next); setCategoryId(null); };

  // "₱120 left today" style hint for the chosen tag
  const limitHint = useMemo(() => {
    if (type !== 'expense' || !categoryId) return null;
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return null;
    for (const kind of ['daily', 'weekly', 'monthly']) {
      const limit = limitFor(cat, kind);
      if (!(limit > 0)) continue;
      const spent = periodSpent(transactions, categoryId, kind, date);
      const after = spent + (value > 0 ? value : 0);
      const word = kind === 'daily' ? 'today' : kind === 'weekly' ? 'this week' : 'this month';
      return { over: after > limit, text: after > limit ? `This takes ${cat.label} ${peso(after - limit, 0)} over the ${kind} limit` : `${peso(limit - after, 0)} left for ${cat.label} ${word}` };
    }
    return null;
  }, [type, categoryId, categories, transactions, date, value]);

  const save = async () => {
    if (!valid) { haptic.warning(); return; }
    await onSave({ id: Date.now(), type, amount: Math.round(value * 100) / 100, category: categoryId, note: note.trim(), date });
    onClose();
  };

  const useShortcut = (s) => {
    haptic.tap();
    setCategoryId(s.category); setNote(s.note); setAmount(String(s.amount));
  };

  const accent = type === 'expense' ? t.spend : t.gain;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.typeRow}>
              {[['expense', 'Spent', 'arrow-up-circle', t.spend], ['income', 'Earned', 'arrow-down-circle', t.gain]].map(([k, label, icon, color]) => (
                <TouchableOpacity key={k} onPress={() => switchType(k)}
                  style={[styles.typeBtn, type === k && { backgroundColor: color + '26', borderColor: color }]}>
                  <Ionicons name={icon} size={18} color={type === k ? color : t.inkDim} />
                  <Text style={{ color: type === k ? t.ink : t.inkDim, fontWeight: type === k ? '700' : '400' }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.amountRow}>
              <Text style={[styles.currency, { color: accent }]}>₱</Text>
              <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={t.inkFaint}
                value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.,]/g, ''))} maxLength={10} />
            </View>

            {shortcuts.length > 0 && !amount && (
              <>
                <Text style={styles.label}>Quick add</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginBottom: 14 }}>
                  {shortcuts.map((s) => {
                    const c = categories.find((x) => x.id === s.category) || { icon: '◦', color: t.inkFaint };
                    return (
                      <TouchableOpacity key={s.category + s.note + s.amount} onPress={() => useShortcut(s)} style={[styles.shortcut, { borderColor: c.color + '88' }]}>
                        <Text style={styles.shortcutText} numberOfLines={1}>{c.icon} {s.note}</Text>
                        <Text style={styles.shortcutAmt}>{peso(s.amount, 0)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            <Text style={styles.label}>Tag</Text>
            <View style={styles.chipWrap}>
              {tagOrder.map((c) => (
                <TouchableOpacity key={c.id} onPress={() => { haptic.tap(); setCategoryId(c.id); }}
                  style={[styles.chip, categoryId === c.id && { backgroundColor: c.color, borderColor: c.color }]}>
                  <Text style={{ color: categoryId === c.id ? readableOn(c.color) : t.ink, fontSize: 13.5 }}>{c.icon} {c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {limitHint && (
              <Text style={[styles.limitHint, { color: limitHint.over ? t.spend : t.inkDim }]}>{limitHint.over ? '⚠️ ' : ''}{limitHint.text}</Text>
            )}

            <TextInput style={styles.noteInput} placeholder="Description (optional)" placeholderTextColor={t.inkFaint}
              value={note} onChangeText={setNote} onFocus={() => setNoteFocused(true)} onBlur={() => setNoteFocused(false)} maxLength={80} />
            {(noteFocused || !note) && noteSuggestions.length > 0 && (
              <View style={styles.suggestRow}>
                {noteSuggestions.map((n) => (
                  <TouchableOpacity key={n} onPress={() => setNote(n)} style={styles.suggest}>
                    <Text style={styles.suggestText} numberOfLines={1}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.dateRow}>
              {[[today, 'Today'], [yesterday, 'Yesterday']].map(([d, label]) => (
                <TouchableOpacity key={d} onPress={() => setDate(d)} style={[styles.dateChip, date === d && styles.dateChipOn]}>
                  <Text style={{ color: date === d ? t.onAccent : t.ink, fontSize: 13 }}>{label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setPickerVisible(true)} style={[styles.dateChip, date !== today && date !== yesterday && styles.dateChipOn, { flexDirection: 'row', gap: 6, alignItems: 'center' }]}>
                <Ionicons name="calendar-outline" size={14} color={date !== today && date !== yesterday ? t.onAccent : t.ink} />
                <Text style={{ color: date !== today && date !== yesterday ? t.onAccent : t.ink, fontSize: 13 }}>
                  {date !== today && date !== yesterday ? formatLong(date) : 'Other day'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: valid ? t.accent : t.surface2 }]} onPress={save} activeOpacity={0.8}>
              <Text style={[styles.saveText, { color: valid ? t.onAccent : t.inkFaint }]}>
                {valid ? `Save ${type === 'expense' ? '−' : '+'}${peso(value, value % 1 ? 2 : 0)}` : !amount ? 'Enter an amount' : 'Pick a tag'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          </ScrollView>

          <DatePickerModal visible={pickerVisible} initialDate={date} maxDate={todayStr()}
            onConfirm={(d) => { setDate(d); setPickerVisible(false); }} onClose={() => setPickerVisible(false)} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 20, paddingTop: 8, maxHeight: '92%' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: t.edge, marginBottom: 14 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeBtn: { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', padding: 11, borderRadius: 12, backgroundColor: t.surface2, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderBottomColor: t.edge, borderBottomWidth: 1 },
  currency: { fontSize: 30, fontWeight: '600', marginRight: 4 },
  input: { fontSize: 40, fontWeight: '700', color: t.ink, textAlign: 'center', paddingVertical: 8, minWidth: 120 },
  label: { color: t.inkDim, fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  shortcut: { borderWidth: 1, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, backgroundColor: t.surface2, maxWidth: 170 },
  shortcutText: { color: t.ink, fontSize: 13 },
  shortcutAmt: { color: t.inkDim, fontSize: 12, marginTop: 2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, borderColor: t.edge, backgroundColor: t.surface2 },
  limitHint: { fontSize: 12.5, marginBottom: 8 },
  noteInput: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 12, fontSize: 14.5, marginTop: 6, marginBottom: 8 },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  suggest: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12, backgroundColor: t.accent + '1F', maxWidth: 160 },
  suggestText: { color: t.ink, fontSize: 12.5 },
  dateRow: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 18 },
  dateChip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 16, backgroundColor: t.surface2 },
  dateChipOn: { backgroundColor: t.accent },
  saveBtn: { padding: 15, borderRadius: 16, alignItems: 'center' },
  saveText: { fontWeight: '700', fontSize: 15.5 },
  cancel: { color: t.inkDim, textAlign: 'center', marginTop: 14 },
});
