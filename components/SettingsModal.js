import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import ChangePinModal from './ChangePinModal';
import { useTheme, THEMES, THEME_ORDER } from './theme';

export default function SettingsModal({ visible, onClose }) {
  const { theme: t, themeKey, setThemeKey } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [pinVisible, setPinVisible] = useState(false);

  const options = [
    { key: 'system', name: 'Auto', preview: null },
    ...THEME_ORDER.map((k) => ({ key: k, name: THEMES[k].name, preview: THEMES[k] })),
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.done}>Done</Text></TouchableOpacity>
          </View>
          <ScrollView>
            <Text style={styles.sectionLabel}>Appearance</Text>
            <View style={styles.grid}>
              {options.map((o) => (
                <TouchableOpacity key={o.key} onPress={() => setThemeKey(o.key)}
                  style={[styles.themeCard, themeKey === o.key && styles.themeCardActive]}>
                  {o.preview ? (
                    <View style={styles.dotsRow}>
                      <View style={[styles.previewDot, { backgroundColor: o.preview.bg }]} />
                      <View style={[styles.previewDot, { backgroundColor: o.preview.surface2 }]} />
                      <View style={[styles.previewDot, { backgroundColor: o.preview.accent }]} />
                    </View>
                  ) : (
                    <Text style={{ fontSize: 18, marginBottom: 6 }}>🌗</Text>
                  )}
                  <Text style={styles.themeName}>{o.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>Auto follows your phone's light/dark setting.</Text>

            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Security</Text>
            <TouchableOpacity style={styles.rowBtn} onPress={() => setPinVisible(true)}>
              <Text style={styles.rowBtnText}>Change PIN</Text>
            </TouchableOpacity>
          </ScrollView>
          <ChangePinModal visible={pinVisible} onClose={() => setPinVisible(false)} />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22, maxHeight: '85%' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { color: t.ink, fontSize: 18 },
  done: { color: t.accent, fontSize: 15, fontWeight: '600' },
  sectionLabel: { color: t.inkDim, fontSize: 12.5, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeCard: { width: '31%', backgroundColor: t.surface2, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  themeCardActive: { borderColor: t.accent },
  dotsRow: { flexDirection: 'row', marginBottom: 8 },
  previewDot: { width: 16, height: 16, borderRadius: 8, marginHorizontal: 2, borderWidth: 1, borderColor: t.inkFaint },
  themeName: { color: t.ink, fontSize: 12.5 },
  hint: { color: t.inkFaint, fontSize: 12, marginTop: 10 },
  rowBtn: { backgroundColor: t.surface2, borderRadius: 12, padding: 14 },
  rowBtnText: { color: t.ink, fontSize: 14.5 },
});