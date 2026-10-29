import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, readableOn } from './theme';
import { PALETTE, PALETTE_ROWS } from './palette';

export const COLOR_CHOICES = PALETTE;

// A colour button that opens the full palette (20 hues × 4 shades).
// trigger="circle" shows the current colour; trigger="more" shows a palette icon (for "more colours…")
export default function ColorPicker({ value, onChange, size = 32, trigger = 'circle', title = 'Pick a colour', active = false }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [open, setOpen] = useState(false);
  const blocks = [PALETTE_ROWS.slice(0, 10), PALETTE_ROWS.slice(10, 20)];

  return (
    <>
      {trigger === 'more' ? (
        <TouchableOpacity onPress={() => setOpen(true)} accessibilityLabel="More colours"
          style={[styles.more, { width: size, height: size, borderRadius: size / 2 }, active && value && { backgroundColor: value, borderStyle: 'solid', borderColor: t.ink, borderWidth: 3 }]}>
          <Ionicons name="color-palette" size={size * 0.55} color={active && value ? readableOn(value) : t.ink} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => setOpen(true)} accessibilityLabel="Pick a colour"
          style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: value }]} />
      )}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.title}>{title}</Text>
              {value ? <View style={[styles.current, { backgroundColor: value }]} /> : null}
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              {blocks.map((block, bi) => (
                <View key={bi} style={[styles.block, bi > 0 && { marginTop: 14 }]}>
                  {[0, 1, 2, 3].map((shade) => (
                    <View key={shade} style={styles.row}>
                      {block.map(([name, row]) => {
                        const c = row[shade];
                        const on = value && value.toUpperCase() === c.toUpperCase();
                        return (
                          <TouchableOpacity key={name + shade} accessibilityLabel={`${name} ${shade + 1}`}
                            onPress={() => { onChange(c); setOpen(false); }}
                            style={[styles.swatch, { backgroundColor: c }, c === '#FFFFFF' && { borderColor: t.edge, borderWidth: 1 }, on && styles.swatchOn]}>
                            {on && <Ionicons name="checkmark" size={14} color={readableOn(c)} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const makeStyles = (t) => StyleSheet.create({
  circle: { borderWidth: 2, borderColor: t.edge },
  more: { borderWidth: 1.5, borderColor: t.edge, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: t.surface, borderRadius: 22, padding: 18, width: 336, maxWidth: '94%' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { color: t.ink, fontSize: 16, fontWeight: '700' },
  current: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: t.edge },
  block: { gap: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  swatch: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  swatchOn: { borderWidth: 2, borderColor: t.ink, transform: [{ scale: 1.12 }] },
});
