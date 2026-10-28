import { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Modal, Alert, Switch } from 'react-native';
import { addRecurring, updateRecurring, deleteRecurring } from './recurring';
import { findCategory } from './categories';
import { sortByRecent } from './sortUtils';
import { useTheme, readableOn } from './theme';
import { useToday } from './useToday';
import { peso } from './format';
import { GrowBar } from './motion';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// How far we are toward the next time this rule fires (0–100)
function cycleProgress(rule, todayStr) {
  const [y, m, d] = todayStr.split('-').map(Number);
  if (rule.frequency === 'weekly') {
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const daysTo = ((rule.dayOfWeek || 0) - dow + 7) % 7;
    return ((7 - daysTo) / 7) * 100;
  }
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (rule.frequency === 'semimonthly') {
    // half-month cycles: 1st..15th, 16th..end
    return d <= 15 ? (d / 15) * 100 : ((d - 15) / (dim - 15)) * 100;
  }
  const due = Math.min(rule.dayOfMonth || 1, dim);
  const daysTo = due >= d ? due - d : dim - d + due;
  return Math.max(0, Math.min(100, ((dim - daysTo) / dim) * 100));
}

export function currentPeriodKey(frequency, todayStr) {
  const month = todayStr.slice(0, 7);
  if (frequency === 'weekly') {
    const d = new Date(todayStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    return d.toISOString().slice(0, 10);
  }
  if (frequency === 'semimonthly') {
    const [y, m, day] = todayStr.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    if (day >= last) return `${month}-B`;
    if (day >= 15) return `${month}-A`;
    const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
    return `${prev}-B`;
  }
  return month;
}

export default function RecurringManager({ categories, rules, setRules, openAddToken }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const today = useToday();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [type, setType] = useState('expense');
  const [categoryId, setCategoryId] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [dayOfWeek, setDayOfWeek] = useState(0);

  const openAdd = () => {
    setEditingId(null); setType('expense'); setCategoryId(null); setAmount(''); setNote('');
    setFrequency('monthly'); setDayOfMonth('1'); setDayOfWeek(0);
    setModalVisible(true);
  };
  const openEdit = (rule) => {
    setEditingId(rule.id); setType(rule.type); setCategoryId(rule.category);
    setAmount(String(rule.amount)); setNote(rule.note || '');
    setFrequency(rule.frequency); setDayOfMonth(String(rule.dayOfMonth || 1)); setDayOfWeek(rule.dayOfWeek || 0);
    setModalVisible(true);
  };

  useEffect(() => { if (openAddToken) openAdd(); }, [openAddToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0 || !categoryId) return;
    const payload = {
      type, category: categoryId, amount: value, note: note.trim(), frequency,
      dayOfMonth: frequency === 'monthly' ? Math.min(28, Math.max(1, parseInt(dayOfMonth) || 1)) : undefined,
      dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
      active: true,
    };
    if (editingId) {
      const before = rules.find((r) => r.id === editingId);
      // switching how often it repeats: treat the current period as done so nothing is recorded twice
      if (before && before.frequency !== frequency) payload.lastGeneratedPeriod = currentPeriodKey(frequency, today);
      setRules(await updateRecurring(editingId, payload));
    }
    else setRules(await addRecurring({ id: 'rec_' + Date.now(), lastGeneratedPeriod: null, ...payload }));
    setModalVisible(false);
  };

  const toggleActive = async (rule) => setRules(await updateRecurring(rule.id, { active: !rule.active }));
  const confirmDelete = (rule) => {
    Alert.alert('Delete this recurring entry?', rule.note || 'This item', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => setRules(await deleteRecurring(rule.id)) },
    ]);
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Recurring transactions</Text>
      {rules.length === 0 && <Text style={styles.empty}>No recurring transactions yet.</Text>}
      {sortByRecent(rules).map((rule) => {
        const cat = findCategory(categories, rule.category);
        const sign = rule.type === 'income' ? '+' : '−';
        const color = rule.type === 'income' ? t.gain : t.spend;
        return (
          <TouchableOpacity key={rule.id} style={[styles.card, { opacity: rule.active ? 1 : 0.5 }]} onPress={() => openEdit(rule)}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: cat.color + '35' }]}><Text style={{ fontSize: 14 }}>{cat.icon}</Text></View>
              <Text style={styles.name} numberOfLines={1}>{rule.note || cat.label}</Text>
            </View>
            <View style={styles.track}><GrowBar pct={cycleProgress(rule, today)} style={[styles.fill, { backgroundColor: color }]} /></View>
            <Text style={styles.amt}>{sign}{peso(rule.amount, 0)}</Text>
          </TouchableOpacity>
        );
      })}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{editingId ? 'Edit recurring entry' : 'New recurring entry'}</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity style={[styles.typeBtn, type === 'expense' && styles.typeBtnActive]} onPress={() => { setType('expense'); setCategoryId(null); }}>
                <Text style={{ color: t.ink }}>Spent</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, type === 'income' && styles.typeBtnActive]} onPress={() => { setType('income'); setCategoryId(null); }}>
                <Text style={{ color: t.ink }}>Earned</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginBottom: 14 }}>
              {categories.filter((c) => c.type === type).map((c) => (
                <TouchableOpacity key={c.id} onPress={() => setCategoryId(c.id)}
                  style={[styles.chip, categoryId === c.id && { backgroundColor: c.color, borderColor: c.color }]}>
                  <Text style={{ color: categoryId === c.id ? readableOn(c.color) : t.ink }}>{c.icon} {c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="Amount" placeholderTextColor={t.inkFaint} value={amount} onChangeText={setAmount} />
            <TextInput style={styles.textField} placeholder="Note (e.g. Rent, Netflix)" placeholderTextColor={t.inkFaint} value={note} onChangeText={setNote} />
            <View style={styles.typeRow}>
              {[['monthly', 'Monthly'], ['semimonthly', 'Twice a month'], ['weekly', 'Weekly']].map(([k, l]) => (
                <TouchableOpacity key={k} style={[styles.typeBtn, frequency === k && styles.typeBtnActive]} onPress={() => setFrequency(k)}>
                  <Text style={{ color: t.ink, fontSize: 13 }}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {frequency === 'semimonthly' ? (
              <Text style={[styles.fieldLabel, { marginBottom: 14 }]}>On the 15th and the last day of each month (like a semi-monthly payroll).</Text>
            ) : frequency === 'monthly' ? (
              <>
                <Text style={styles.fieldLabel}>Day of month (1–28)</Text>
                <TextInput style={styles.textField} keyboardType="number-pad" value={dayOfMonth} onChangeText={setDayOfMonth} />
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Day of week</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                  {WEEKDAYS.map((d, i) => (
                    <TouchableOpacity key={d} onPress={() => setDayOfWeek(i)}
                      style={[styles.chip, dayOfWeek === i && { backgroundColor: t.accent, borderColor: t.accent }]}>
                      <Text style={{ color: dayOfWeek === i ? t.onAccent : t.ink }}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            {editingId && (() => {
              const rule = rules.find((r) => r.id === editingId);
              if (!rule) return null;
              return (
                <View style={styles.editFooter}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Switch value={rule.active} onValueChange={() => toggleActive(rule)} trackColor={{ false: t.edge, true: t.accent }} thumbColor="#FFFFFF" />
                    <Text style={{ color: t.inkDim, fontSize: 12.5 }}>{rule.active ? 'Active' : 'Paused'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setModalVisible(false); confirmDelete(rule); }}><Text style={{ color: t.spend, fontSize: 13 }}>Delete</Text></TouchableOpacity>
                </View>
              );
            })()}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={{ color: t.onAccent, fontWeight: '600' }}>Save</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{ color: t.inkDim, textAlign: 'center', marginTop: 12 }}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  sectionTitle: { color: t.inkDim, fontSize: 13, marginBottom: 10 },
  empty: { color: t.inkFaint, fontSize: 13, marginBottom: 10 },
  card: { backgroundColor: t.surface2, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  name: { color: t.ink, fontSize: 15, fontWeight: '600', flex: 1 },
  track: { height: 7, backgroundColor: t.bg, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  amt: { color: t.inkDim, fontSize: 11.5, marginTop: 6 },
  editFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingVertical: 10, borderTopColor: t.edge, borderTopWidth: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22, maxHeight: '88%' },
  sheetTitle: { color: t.ink, fontSize: 16, marginBottom: 16 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: t.surface2, alignItems: 'center' },
  typeBtnActive: { backgroundColor: t.edge },
  chip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, borderColor: t.edge, backgroundColor: t.surface2, marginRight: 8 },
  input: { fontSize: 24, color: t.ink, textAlign: 'center', marginBottom: 12, borderBottomColor: t.edge, borderBottomWidth: 1, paddingBottom: 8 },
  textField: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 12, fontSize: 14.5, marginBottom: 14 },
  fieldLabel: { color: t.inkFaint, fontSize: 12, marginBottom: 6 },
  saveBtn: { backgroundColor: t.accent, padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 6 },
});
