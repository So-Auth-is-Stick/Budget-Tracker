import { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DatePickerModal from './DatePickerModal';
import { findCategory } from './categories';
import { formatLong, todayStr } from './dateUtils';
import { useTheme, readableOn } from './theme';
import { peso } from './format';
import { useAccounts, accountOf } from './accounts';

export default function TransactionDetailModal({ visible, item, categories, onClose, onDelete, onSave, onDuplicate }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [date, setDate] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { accounts } = useAccounts();
  const [accountId, setAccountId] = useState(null);

  useEffect(() => {
    if (item) {
      setAmount(String(item.amount));
      setNote(item.note || '');
      setCategoryId(item.category);
      setDate(item.date);
      setAccountId(accountOf(item, accounts));
      setEditing(false);
    }
  }, [item]);

  if (!item) return null;
  const cat = findCategory(categories, item.category);
  const sign = item.type === 'income' ? '+' : '−';
  const amountColor = item.type === 'income' ? t.gain : t.spend;
  const year = item.date.slice(0, 4);
  const auto = / \(auto\)$/.test(item.note || '');

  const confirmDelete = () => {
    Alert.alert('Delete this entry?', `${cat.icon} ${cat.label} — ${sign}${peso(item.amount, 2)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { onDelete(item.id); onClose(); } },
    ]);
  };

  const value = parseFloat(String(amount).replace(/,/g, ''));
  const handleSaveEdit = () => {
    if (!value || value <= 0 || !categoryId) return;
    onSave(item.id, { amount: Math.round(value * 100) / 100, note: note.trim(), category: categoryId, date, ...(accounts.length > 1 && accountId ? { account: accountId } : {}) });
    setEditing(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          {!editing ? (
            <>
              <View style={styles.headRow}>
                <View style={[styles.iconCircle, { backgroundColor: cat.color + '33', borderColor: cat.color }]}><Text style={{ fontSize: 22 }}>{cat.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tag}>{cat.label}</Text>
                  <Text style={styles.date}>{formatLong(item.date)}, {year}{accounts.length > 1 ? ` · ${(accounts.find((a) => a.id === accountOf(item, accounts)) || {}).label || ''}` : ''}{auto ? ' · recurring' : ''}{item.goalId ? ' · from a plan' : ''}</Text>
                </View>
              </View>
              <Text style={[styles.amount, { color: amountColor }]}>{sign}{peso(item.amount, 2)}</Text>
              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>Description</Text>
                <Text style={[styles.note, !item.note && { color: t.inkFaint }]}>{item.note ? item.note : 'No description added.'}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.action} onPress={() => setEditing(true)}>
                  <Ionicons name="create-outline" size={20} color={t.accent} />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                {onDuplicate && (
                  <TouchableOpacity style={styles.action} onPress={() => { onDuplicate(item); onClose(); }}>
                    <Ionicons name="copy-outline" size={20} color={t.accent} />
                    <Text style={styles.actionText}>Log again today</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.action} onPress={confirmDelete}>
                  <Ionicons name="trash-outline" size={20} color={t.spend} />
                  <Text style={[styles.actionText, { color: t.spend }]}>Delete</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={onClose} style={{ marginTop: 16 }}>
                <Text style={{ color: t.inkDim, textAlign: 'center' }}>Close</Text>
              </TouchableOpacity>
            </>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.editTitle}>Edit {item.type === 'income' ? 'earning' : 'expense'}</Text>
              <View style={styles.amountRow}>
                <Text style={[styles.currency, { color: amountColor }]}>₱</Text>
                <TextInput style={styles.input} keyboardType="decimal-pad" value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.,]/g, ''))} />
              </View>
              <View style={styles.chipWrap}>
                {categories.filter((c) => c.type === item.type).map((c) => (
                  <TouchableOpacity key={c.id} onPress={() => setCategoryId(c.id)}
                    style={[styles.chip, categoryId === c.id && { backgroundColor: c.color, borderColor: c.color }]}>
                    <Text style={{ color: categoryId === c.id ? readableOn(c.color) : t.ink }}>{c.icon} {c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {accounts.length > 1 && (
                <View style={styles.chipWrap}>
                  {accounts.map((a) => (
                    <TouchableOpacity key={a.id} onPress={() => setAccountId(a.id)} style={[styles.chip, accountId === a.id && { backgroundColor: a.color + '33', borderColor: a.color }]}>
                      <Text style={{ color: t.ink, fontSize: 12.5 }}>{a.icon} {a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TextInput style={styles.textField} placeholder="Description" placeholderTextColor={t.inkFaint} value={note} onChangeText={setNote} maxLength={80} />
              <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerOpen(true)}>
                <Ionicons name="calendar-outline" size={17} color={t.ink} />
                <Text style={{ color: t.ink, flex: 1 }}>{date ? `${formatLong(date)}, ${date.slice(0, 4)}` : ''}</Text>
                <Text style={{ color: t.accent, fontSize: 12.5 }}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, !(value > 0) && { opacity: 0.5 }]} onPress={handleSaveEdit}>
                <Text style={{ color: t.onAccent, fontWeight: '700' }}>Save changes</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditing(false)} style={{ marginTop: 12 }}>
                <Text style={{ color: t.inkDim, textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>
              <DatePickerModal visible={pickerOpen} initialDate={date} maxDate={todayStr()}
                onConfirm={(d) => { setDate(d); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 26, maxHeight: '90%' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: t.edge, marginBottom: 16 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  iconCircle: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  tag: { color: t.ink, fontSize: 17, fontWeight: '700' },
  date: { color: t.inkDim, fontSize: 12.5, marginTop: 2 },
  amount: { fontSize: 38, fontWeight: '800', marginBottom: 14 },
  noteBox: { backgroundColor: t.surface2, borderRadius: 14, padding: 14, marginBottom: 16 },
  noteLabel: { color: t.inkFaint, fontSize: 11.5, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  note: { color: t.ink, fontSize: 14.5, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: t.surface2 },
  actionText: { color: t.ink, fontSize: 12.5, fontWeight: '600', textAlign: 'center' },
  editTitle: { color: t.ink, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomColor: t.edge, borderBottomWidth: 1, marginBottom: 14 },
  currency: { fontSize: 26, fontWeight: '600', marginRight: 4 },
  input: { fontSize: 34, fontWeight: '700', color: t.ink, textAlign: 'center', paddingVertical: 8, minWidth: 110 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, borderColor: t.edge, backgroundColor: t.surface2 },
  textField: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 12, fontSize: 14.5, marginBottom: 10 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.surface2, borderRadius: 12, padding: 12, marginBottom: 16 },
  saveBtn: { backgroundColor: t.accent, padding: 14, borderRadius: 14, alignItems: 'center' },
});
