import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addCategory, updateCategory, deleteCategory } from './categories';
import { reassignCategory } from './storage';
import ColorPicker, { COLOR_CHOICES } from './ColorPicker';
import { useTheme, readableOn } from './theme';
import * as haptic from './haptics';

const EMOJI = {
  expense: ['🍜', '🍔', '☕', '🛒', '🚌', '⛽', '🏠', '💡', '📱', '🎮', '🎬', '👕', '💊', '🎁', '✈️', '📚', '🐶', '💇', '🍺', '🧾'],
  income: ['💼', '💰', '🖌️', '💻', '🎁', '🏦', '📈', '🧧', '🛍️', '🏆', '💵', '🤝'],
};

export default function CategoryManager({ categories, setCategories, transactions = [], setTransactions }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [manageType, setManageType] = useState('expense');
  const [editingId, setEditingId] = useState(null); // null = closed, 'new' = adding
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [moveTarget, setMoveTarget] = useState(null); // { cat, count } while choosing where entries go

  const shown = categories.filter((c) => c.type === manageType);
  const usage = useMemo(() => {
    const u = {};
    transactions.forEach((tx) => { u[tx.category] = (u[tx.category] || 0) + 1; });
    return u;
  }, [transactions]);

  const openNew = () => {
    setEditingId('new'); setLabel(''); setIcon(EMOJI[manageType][0]);
    setColor(COLOR_CHOICES[Math.floor(Math.random() * COLOR_CHOICES.length)]);
  };
  const openEdit = (c) => { setEditingId(c.id); setLabel(c.label); setIcon(c.icon); setColor(c.color); };

  const save = async () => {
    const name = label.trim();
    if (!name) return;
    if (editingId === 'new') {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now();
      setCategories(await addCategory({ id, label: name, icon: icon.trim() || '◦', color, type: manageType }));
    } else {
      setCategories(await updateCategory(editingId, { label: name, icon: icon.trim() || '◦', color }));
    }
    haptic.success();
    setEditingId(null);
  };

  const askDelete = (c) => {
    const count = usage[c.id] || 0;
    const others = categories.filter((x) => x.type === c.type && x.id !== c.id);
    if (count > 0 && others.length === 0) {
      Alert.alert("Can't delete the last tag", 'Add another tag first so its entries have somewhere to go.');
      return;
    }
    if (count > 0) { setMoveTarget({ cat: c, count }); return; }
    Alert.alert(`Delete "${c.label}"?`, 'No entries use this tag.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { setCategories(await deleteCategory(c.id)); setEditingId(null); haptic.bump(); } },
    ]);
  };

  const moveAndDelete = async (to) => {
    const from = moveTarget.cat;
    const list = await reassignCategory(from.id, to.id);
    if (setTransactions) setTransactions(list);
    setCategories(await deleteCategory(from.id));
    setMoveTarget(null);
    setEditingId(null);
    haptic.bump();
  };

  // Choosing where a deleted tag's entries go
  if (moveTarget) {
    const others = categories.filter((x) => x.type === moveTarget.cat.type && x.id !== moveTarget.cat.id);
    return (
      <View>
        <Text style={styles.title}>Delete {moveTarget.cat.icon} {moveTarget.cat.label}</Text>
        <Text style={styles.help}>{moveTarget.count} {moveTarget.count === 1 ? 'entry uses' : 'entries use'} this tag. Pick where {moveTarget.count === 1 ? 'it' : 'they'} should go:</Text>
        <View style={styles.chipWrap}>
          {others.map((o) => (
            <TouchableOpacity key={o.id} style={[styles.chip, { borderColor: o.color }]} onPress={() => moveAndDelete(o)}>
              <Text style={{ color: t.ink }}>{o.icon} {o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => setMoveTarget(null)}><Text style={styles.cancel}>Keep the tag</Text></TouchableOpacity>
      </View>
    );
  }

  // Add / edit form
  if (editingId) {
    const existing = categories.find((c) => c.id === editingId);
    return (
      <View>
        <Text style={styles.title}>{editingId === 'new' ? `New ${manageType === 'expense' ? 'spending' : 'earning'} tag` : 'Edit tag'}</Text>
        <View style={styles.preview}>
          <View style={[styles.previewChip, { backgroundColor: color }]}>
            <Text style={{ color: readableOn(color), fontSize: 15 }}>{icon || '◦'} {label || 'Tag name'}</Text>
          </View>
        </View>
        <TextInput style={styles.input} placeholder="Name (e.g. Groceries)" placeholderTextColor={t.inkFaint} value={label} onChangeText={setLabel} maxLength={20} autoFocus={editingId === 'new'} />
        <Text style={styles.fieldLabel}>Icon</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginBottom: 6 }}>
          <TextInput style={styles.emojiInput} value={icon} onChangeText={(v) => setIcon(v.slice(-2))} placeholder="✏️" placeholderTextColor={t.inkFaint} />
          {EMOJI[existing ? existing.type : manageType].map((e) => (
            <TouchableOpacity key={e} onPress={() => setIcon(e)} style={[styles.emoji, icon === e && { backgroundColor: color + '55', borderColor: color }]}>
              <Text style={{ fontSize: 20 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.colorRow}>
          <Text style={styles.fieldLabel}>Color</Text>
          <ColorPicker value={color} onChange={setColor} size={34} />
        </View>
        <TouchableOpacity style={[styles.saveBtn, !label.trim() && { opacity: 0.5 }]} onPress={save}><Text style={styles.saveText}>{editingId === 'new' ? 'Add tag' : 'Save'}</Text></TouchableOpacity>
        {existing && (
          <TouchableOpacity onPress={() => askDelete(existing)} style={{ marginTop: 14 }}>
            <Text style={{ color: t.spend, textAlign: 'center', fontWeight: '600' }}>Delete this tag</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setEditingId(null)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.title}>Tags</Text>
      <View style={styles.typeRow}>
        {[['expense', 'Spending'], ['income', 'Earning']].map(([k, l]) => (
          <TouchableOpacity key={k} style={[styles.typeBtn, manageType === k && styles.typeBtnActive]} onPress={() => setManageType(k)}>
            <Text style={[styles.typeText, manageType === k && { fontWeight: '700' }]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
        {shown.map((c) => (
          <TouchableOpacity key={c.id} style={styles.catRow} onPress={() => openEdit(c)}>
            <View style={[styles.swatch, { backgroundColor: c.color + '33', borderColor: c.color }]}><Text style={{ fontSize: 17 }}>{c.icon}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.catName} numberOfLines={1}>{c.label}</Text>
              <Text style={styles.catUse}>{usage[c.id] ? `${usage[c.id]} ${usage[c.id] === 1 ? 'entry' : 'entries'}` : 'Not used yet'}</Text>
            </View>
            <View style={[styles.dot, { backgroundColor: c.color }]} />
            <Ionicons name="chevron-forward" size={18} color={t.inkFaint} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity onPress={openNew} style={styles.newBtn}>
        <Ionicons name="add-circle" size={20} color={t.accent} />
        <Text style={styles.newText}>New {manageType === 'expense' ? 'spending' : 'earning'} tag</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  title: { color: t.ink, fontSize: 18, fontWeight: '700', marginBottom: 14 },
  help: { color: t.inkDim, fontSize: 13.5, marginBottom: 14, lineHeight: 19 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeBtn: { flex: 1, padding: 9, borderRadius: 10, backgroundColor: t.surface2, alignItems: 'center' },
  typeBtnActive: { backgroundColor: t.accent + '33' },
  typeText: { color: t.ink },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomColor: t.edge, borderBottomWidth: 1 },
  swatch: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  catName: { color: t.ink, fontSize: 14.5, fontWeight: '600' },
  catUse: { color: t.inkDim, fontSize: 12, marginTop: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, padding: 12, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: t.accent },
  newText: { color: t.accent, fontWeight: '700' },
  preview: { alignItems: 'center', marginBottom: 14 },
  previewChip: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20 },
  input: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 12, fontSize: 15, marginBottom: 14 },
  fieldLabel: { color: t.inkDim, fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  emojiInput: { width: 46, height: 44, borderRadius: 12, backgroundColor: t.surface2, color: t.ink, textAlign: 'center', fontSize: 20, marginRight: 6 },
  emoji: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 6, borderWidth: 1, borderColor: 'transparent', backgroundColor: t.surface2 },
  colorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 18 },
  saveBtn: { backgroundColor: t.accent, padding: 14, borderRadius: 14, alignItems: 'center' },
  saveText: { color: t.onAccent, fontWeight: '700' },
  cancel: { color: t.inkDim, textAlign: 'center', marginTop: 14 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, backgroundColor: t.surface2 },
});
