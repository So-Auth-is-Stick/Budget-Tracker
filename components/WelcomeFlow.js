import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, THEMES, THEME_ORDER } from './theme';
import * as haptic from './haptics';

const POINTS = [
  ['add-circle', 'Log in seconds', 'Tap + to add what you spent or earned. Quick-add buttons learn your habits.'],
  ['calendar', 'See your days', 'The calendar shows every day\'s spending at a glance.'],
  ['flag', 'Plan ahead', 'Save for things, track bills and money you lent.'],
  ['lock-closed', 'Private', 'Everything stays on this phone behind your PIN.'],
];

// First-run welcome: what the app does, starting balance, and a theme
export default function WelcomeFlow({ visible, onDone }) {
  const { theme: t, themeKey, setThemeKey } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState('');

  const finish = () => {
    haptic.success();
    const v = parseFloat(String(amount).replace(/,/g, ''));
    onDone({ startingBalance: v > 0 ? v : 0 });
  };
  const next = () => { haptic.tap(); setStep(step + 1); };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={() => {}}>
      <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => <View key={i} style={[styles.dot, i === step && styles.dotOn]} />)}
        </View>

        {step === 0 && (
          <View style={styles.body}>
            <View style={styles.logo}><Text style={styles.logoText}>₱</Text></View>
            <Text style={styles.title}>Welcome to Ledger</Text>
            <Text style={styles.sub}>A calm way to keep track of your money.</Text>
            <View style={{ marginTop: 26, gap: 18 }}>
              {POINTS.map(([icon, head, text]) => (
                <View key={head} style={styles.point}>
                  <View style={styles.pointIcon}><Ionicons name={icon} size={20} color={t.accent} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pointHead}>{head}</Text>
                    <Text style={styles.pointText}>{text}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.body}>
            <Text style={styles.emoji}>👛</Text>
            <Text style={styles.title}>How much do you have right now?</Text>
            <Text style={styles.sub}>Cash, e-wallet and bank together. It becomes your starting balance. You can skip this.</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency}>₱</Text>
              <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={t.inkFaint}
                value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.,]/g, ''))} autoFocus maxLength={10} />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.body}>
            <Text style={styles.emoji}>🎨</Text>
            <Text style={styles.title}>Pick a look</Text>
            <Text style={styles.sub}>Change it any time in Settings.</Text>
            <View style={styles.grid}>
              {['system', ...THEME_ORDER].map((k) => {
                const th = THEMES[k];
                const on = themeKey === k;
                return (
                  <TouchableOpacity key={k} onPress={() => { haptic.tap(); setThemeKey(k); }} style={[styles.themeCard, on && { borderColor: t.accent }]}>
                    <View style={[styles.swatch, { backgroundColor: th ? th.bg : t.surface2 }]}>
                      {th ? <View style={[styles.swatchDot, { backgroundColor: th.accent }]} /> : <Ionicons name="contrast-outline" size={22} color={t.ink} />}
                    </View>
                    <Text style={styles.themeName}>{th ? th.name : 'Auto'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          {step > 0 ? (
            <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.back}><Text style={styles.backText}>Back</Text></TouchableOpacity>
          ) : <View style={styles.back} />}
          <TouchableOpacity style={styles.nextBtn} onPress={step < 2 ? next : finish}>
            <Text style={styles.nextText}>{step === 0 ? "Let's go" : step === 1 ? (amount ? 'Next' : 'Skip') : 'Start using Ledger'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg, paddingHorizontal: 26 },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.edge },
  dotOn: { width: 22, backgroundColor: t.accent },
  body: { flex: 1, justifyContent: 'center' },
  logo: { width: 68, height: 68, borderRadius: 22, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 20, transform: [{ rotate: '-6deg' }] },
  logoText: { color: t.onAccent, fontSize: 36, fontWeight: '800' },
  emoji: { fontSize: 46, marginBottom: 14 },
  title: { color: t.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.3 },
  sub: { color: t.inkDim, fontSize: 15, marginTop: 8, lineHeight: 21 },
  point: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  pointIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: t.accent + '22', alignItems: 'center', justifyContent: 'center' },
  pointHead: { color: t.ink, fontSize: 15.5, fontWeight: '700' },
  pointText: { color: t.inkDim, fontSize: 13.5, marginTop: 2, lineHeight: 19 },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 30, borderBottomWidth: 2, borderBottomColor: t.accent, paddingBottom: 6 },
  currency: { color: t.accent, fontSize: 34, fontWeight: '700', marginRight: 6 },
  input: { flex: 1, color: t.ink, fontSize: 42, fontWeight: '800', paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 24 },
  themeCard: { width: '22%', alignItems: 'center', paddingVertical: 8, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  swatch: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.edge, marginBottom: 6 },
  swatchDot: { width: 18, height: 18, borderRadius: 9 },
  themeName: { color: t.ink, fontSize: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { paddingVertical: 14, paddingHorizontal: 6, minWidth: 60 },
  backText: { color: t.inkDim, fontSize: 15 },
  nextBtn: { backgroundColor: t.accent, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 26 },
  nextText: { color: t.onAccent, fontWeight: '800', fontSize: 15.5 },
});
