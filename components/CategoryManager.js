import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import {
  loadCategories, addCategory, updateCategory, deleteCategory, COLOR_PALETTE,
} from './categories';

export default function CategoryManager({ onChange }) {
  const [categories, setCategories] = useState([]);
  const [manageType, setManageType] = useState('expense');
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0]);

  useEffect(() => {
    loadCategories().then(setCategories);
  }, []);

  const refresh = (list) => {
    setCategories(list);
    onChange && onChange(list);
  };

  const shown = categories.filter((c) => c.type === manageType);

  const handlePickColor = async (id, color) => {
    const updated = await updateCategory(id, { color });
    refresh(updated);
  };

  const handleDelete = async (id) => {
    const updated = await deleteCategory(id);
    refresh(updated);
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    const id = newLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now();
    const updated = await addCategory({
      id, label: newLabel.trim(), icon: newIcon.trim() || '◦', color: newColor, type: manageType,
    });
    refresh(updated);
    setNewLabel('');
    setNewIcon('');
  };

  return (
    <View style={{ maxHeight: 460 }}>
      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[styles.typeBtn, manageType === 'expense' && styles.typeBtnActive]}
          onPress={() => setManageType('expense')}
        >
          <Text style={{ color: '#F4EFE6' }}>Spent tags</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeBtn, manageType === 'income' && styles.typeBtnActive]}
          onPress={() => setManageType('income')}
        >
          <Text style={{ color: '#F4EFE6' }}>Earned tags</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ maxHeight: 240 }}>
        {shown.map((c) => (
          <View key={c.id} style={styles.catRow}>
            <View style={[styles.swatch, { backgroundColor: c.color + '33' }]}>
              <Text>{c.icon}</Text>
            </View>
            <Text style={styles.catName}>{c.label}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              {COLOR_PALETTE.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => handlePickColor(c.id, color)}
                  style={[
                    styles.dot,
                    { backgroundColor: color },
                    c.color === color && styles.dotSelected,
                  ]}
                />
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => handleDelete(c.id)}>
              <Text style={{ color: '#5E6F68', fontSize: 16, paddingLeft: 8 }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View style={styles.addRow}>
        <TextInput
          style={styles.iconInput}
          placeholder="🙂"
          placeholderTextColor="#5E6F68"
          value={newIcon}
          onChangeText={setNewIcon}
        />
        <TextInput
          style={styles.labelInput}
          placeholder="New tag name"
          placeholderTextColor="#5E6F68"
          value={newLabel}
          onChangeText={setNewLabel}
        />
        <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
          <Text style={{ color: '#1B1200', fontWeight: '600' }}>Add</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        {COLOR_PALETTE.map((color) => (
          <TouchableOpacity
            key={color}
            onPress={() => setNewColor(color)}
            style={[styles.dot, { backgroundColor: color }, newColor === color && styles.dotSelected]}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  typeBtn: { flex: 1, padding: 8, borderRadius: 10, backgroundColor: '#1D2E27', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#2A3B34' },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomColor: '#2A3B34', borderBottomWidth: 1 },
  swatch: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  catName: { color: '#F4EFE6', width: 70, fontSize: 13 },
  dot: { width: 22, height: 22, borderRadius: 11, marginRight: 6, borderWidth: 2, borderColor: 'transparent' },
  dotSelected: { borderColor: '#F4EFE6' },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 14, alignItems: 'center' },
  iconInput: { width: 44, backgroundColor: '#1D2E27', borderRadius: 10, color: '#F4EFE6', textAlign: 'center', padding: 8 },
  labelInput: { flex: 1, backgroundColor: '#1D2E27', borderRadius: 10, color: '#F4EFE6', padding: 8 },
  addBtn: { backgroundColor: '#E8B84B', paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center' },
});