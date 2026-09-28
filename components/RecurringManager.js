import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Modal, Alert, Switch } from 'react-native';
import { addRecurring, updateRecurring, deleteRecurring } from './recurring';
import { findCategory } from './categories';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function RecurringManager({ categories, rules, setRules }) {
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
      setRules(await updateRecurring(editingId, payload));
    } else {
      setRules(await addRecurring({ id: 'rec_' + Date.now(), lastGeneratedPeriod: null, ...payload }));
    }
    setModalVisible(false);
  };

  const toggleActive = async (rule) => setRules(await updateRecurring(rule.id, { active: !rule.active }));
  const confirmDelete = (rule) => {
    Alert.alert('Delete this recurring entry?', rule.note || 'This item', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => setRules(await deleteRecurring(rule.id)) },
    ]);
  };

  const describe = (rule) =>
    rule.frequency === 'monthly' ? `Every month on day ${rule.dayOfMonth}` : `Every week on ${WEEKDAYS[rule.dayOfWeek]}`;

  return (
    <View>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Recurring transactions</Text>
        <TouchableOpacity onPress={openAdd}><Text style={styles.addLink}>+ Add</Text></TouchableOpacity>
      </View>
      {rules.length === 0 && <Text style={styles.empty}>No recurring transactions yet.</Text>}
      {rules.map((rule) => {
        const cat = findCategory(categories, rule.category);
        const sign = rule.type === 'income' ? '+' : '−';
        const color = rule.type === 'income' ? '#7FC29B' : '#D97A55';
        return (
          <View key={rule.id} style={[styles.card, { opacity: rule.active ? 1 : 0.5 }]}>
            <TouchableOpacity onPress={() => openEdit(rule)}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: cat.color + '30' }]}><Text style={{ fontSize: 16 }}>{cat.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{cat.label}{rule.note ? ' — ' + rule.note : ''}</Text>
                  <Text style={styles.freq}>{describe(rule)}</Text>
                </View>
                <Text style={{ color, fontWeight: '600' }}>{sign}₱{rule.amount.toFixed(0)}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.cardFooter}>
              <TouchableOpacity onPress={() => confirmDelete(rule)}><Text style={{ color: '#5E6F68', fontSize: 12.5 }}>Delete</Text></TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#9FB0A8', fontSize: 12 }}>{rule.active ? 'Active' : 'Paused'}</Text>
                <Switch value={rule.active} onValueChange={() => toggleActive(rule)} trackColor={{ false: '#2A3B34', true: '#E8B84B' }} thumbColor="#F4EFE6" />
              </View>
            </View>
          </View>
        );
      })}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{editingId ? 'Edit recurring entry' : 'New recurring entry'}</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity style={[styles.typeBtn, type === 'expense' && styles.typeBtnActive]} onPress={() => { setType('expense'); setCategoryId(null); }}>
                <Text style={{ color: '#F4EFE6' }}>Spent</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, type === 'income' && styles.typeBtnActive]} onPress={() => { setType('income'); setCategoryId(null); }}>
                <Text style={{ color: '#F4EFE6' }}>Earned</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginBottom: 14 }}>
              {categories.filter((c) => c.type === type).map((c) => (
                <TouchableOpacity key={c.id} onPress={() => setCategoryId(c.id)}
                  style={[styles.chip, categoryId === c.id && { backgroundColor: c.color, borderColor: c.color }]}>
                  <Text style={{ color: categoryId === c.id ? '#1B1200' : '#F4EFE6' }}>{c.icon} {c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="Amount" placeholderTextColor="#5E6F68" value={amount} onChangeText={setAmount} />
            <TextInput style={styles.textField} placeholder="Note (e.g. Rent, Netflix)" placeholderTextColor="#5E6F68" value={note} onChangeText={setNote} />
            <View style={styles.typeRow}>
              <TouchableOpacity style={[styles.typeBtn, frequency === 'monthly' && styles.typeBtnActive]} onPress={() => setFrequency('monthly')}>
                <Text style={{ color: '#F4EFE6' }}>Monthly</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, frequency === 'weekly' && styles.typeBtnActive]} onPress={() => setFrequency('weekly')}>
                <Text style={{ color: '#F4EFE6' }}>Weekly</Text>
              </TouchableOpacity>
            </View>
            {frequency === 'monthly' ? (
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
                      style={[styles.chip, dayOfWeek === i && { backgroundColor: '#E8B84B', borderColor: '#E8B84B' }]}>
                      <Text style={{ color: dayOfWeek === i ? '#1B1200' : '#F4EFE6' }}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={{ color: '#1B1200', fontWeight: '600' }}>Save</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{ color: '#9FB0A8', textAlign: 'center', marginTop: 12 }}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: '#9FB0A8', fontSize: 13 },
  addLink: { color: '#E8B84B', fontSize: 13, fontWeight: '600' },
  empty: { color: '#5E6F68', fontSize: 13, marginBottom: 10 },
  card: { backgroundColor: '#1D2E27', borderRadius: 16, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  name: { color: '#F4EFE6', fontSize: 14 },
  freq: { color: '#9FB0A8', fontSize: 11.5, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopColor: '#2A3B34', borderTopWidth: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#16241F', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22, maxHeight: '88%' },
  sheetTitle: { color: '#F4EFE6', fontSize: 16, marginBottom: 16 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: '#1D2E27', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#2A3B34' },
  chip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, borderColor: '#2A3B34', backgroundColor: '#1D2E27', marginRight: 8 },
  input: { fontSize: 24, color: '#F4EFE6', textAlign: 'center', marginBottom: 12, borderBottomColor: '#2A3B34', borderBottomWidth: 1, paddingBottom: 8 },
  textField: { backgroundColor: '#1D2E27', borderRadius: 12, color: '#F4EFE6', padding: 12, fontSize: 14.5, marginBottom: 14 },
  fieldLabel: { color: '#5E6F68', fontSize: 12, marginBottom: 6 },
  saveBtn: { backgroundColor: '#E8B84B', padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 6 },
});