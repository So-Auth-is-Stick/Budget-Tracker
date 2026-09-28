import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { addCategory, updateCategory, deleteCategory } from './categories';
import ColorPicker, { COLOR_CHOICES } from './ColorPicker';
import { useTheme } from './theme';

export default function CategoryManager({ categories, setCategories }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [manageType, setManageType] = useState('expense');
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [newColor, setNewColor] = useState(COLOR_CHOICES[0]);

  const shown = categories.filter((c) => c.type === manageType);

  const handlePickColor = async (id, color) => setCategories(await updateCategory(id, { color }));
  const handleDelete = async (id) => setCategories(await deleteCategory(id));
  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    const id = newLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now();
    setCategories(await addCategory({ id, label: newLabel.trim(), icon: newIcon.trim() || '◦', color: newColor, type: manageType }));
    setNewLabel('');
    setNewIcon('');
  };

  return (
    <View>
      <View style={styles.typeRow}>
        <TouchableOpacity style={[styles.typeBtn, manageType === 'expense' && styles.typeBtnActive]} onPress={() => setManageType('expense')}>
          <Text style={styles.typeText}>Spent tags</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.typeBtn, manageType === 'income' && styles.typeBtnActive]} onPress={() => setManageType('income')}>
          <Text style={styles.typeText}>Earned tags</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled">
        {shown.map((c) => (
          <View key={c.id} style={styles.catRow}>
            <View style={[styles.swatch, { backgroundColor: c.color + '33' }]}><Text>{c.icon}</Text></View>
            <Text style={styles.catName} numberOfLines={1}>{c.label}</Text>
            <ColorPicker value={c.color} onChange={(color) => handlePickColor(c.id, color)} />
            <TouchableOpacity onPress={() => handleDelete(c.id)} hitSlop={8}>
              <Text style={styles.del}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View style={styles.addRow}>
        <TextInput style={styles.iconInput} placeholder="🙂" placeholderTextColor={t.inkFaint} value={newIcon} onChangeText={setNewIcon} />
        <TextInput style={styles.labelInput} placeholder="New tag name" placeholderTextColor={t.inkFaint} value={newLabel} onChangeText={setNewLabel} />
        <ColorPicker value={newColor} onChange={setNewColor} />
        <TouchableOpacity onPress={handleAdd} style={styles.addBtn}><Text style={styles.addText}>Add</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  typeBtn: { flex: 1, padding: 9, borderRadius: 10, backgroundColor: t.surface2, alignItems: 'center' },
  typeBtnActive: { backgroundColor: t.edge },
  typeText: { color: t.ink },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomColor: t.edge, borderBottomWidth: 1 },
  swatch: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  catName: { color: t.ink, fontSize: 14, flex: 1 },
  del: { color: t.inkFaint, fontSize: 16, paddingLeft: 4 },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'center' },
  iconInput: { width: 44, backgroundColor: t.surface2, borderRadius: 10, color: t.ink, textAlign: 'center', padding: 8 },
  labelInput: { flex: 1, backgroundColor: t.surface2, borderRadius: 10, color: t.ink, padding: 8 },
  addBtn: { backgroundColor: t.accent, paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center', height: 36 },
  addText: { color: t.onAccent, fontWeight: '600' },
});