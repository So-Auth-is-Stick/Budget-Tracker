import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useTheme } from './theme';

export const COLOR_CHOICES = [
  '#EF5350', '#FF7043', '#FFA726', '#E8B84B', '#FFD54F', '#C0CA33',
  '#8FCB77', '#66BB6A', '#26A69A', '#26C6DA', '#42A5F5', '#5C6BC0',
  '#9C6ADE', '#AB47BC', '#EC407A', '#B85C7A', '#D97A55', '#8D6E63',
  '#5E9AD9', '#4FB0A5', '#7FC29B', '#C9954A', '#78909C', '#8A8A8A',
];

export default function ColorPicker({ value, onChange, size = 32 }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: value }]}
      />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.card}>
            <Text style={styles.title}>Pick a color</Text>
            <View style={styles.grid}>
              {COLOR_CHOICES.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => { onChange(c); setOpen(false); }}
                  style={[styles.swatch, { backgroundColor: c }, value === c && styles.swatchSelected]}
                />
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const makeStyles = (t) => StyleSheet.create({
  circle: { borderWidth: 2, borderColor: t.edge },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: t.surface, borderRadius: 20, padding: 20, width: 318, maxWidth: '92%' },
  title: { color: t.ink, fontSize: 15, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: 'transparent' },
  swatchSelected: { borderColor: t.ink },
});
