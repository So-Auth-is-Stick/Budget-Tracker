import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './theme';
import { usePrefs } from './prefs';
import { biometricAvailable, biometricUnlock } from './biometric';
import * as haptic from './haptics';

const MAX_TRIES = 5;
const LOCK_SECONDS = 30;

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function PinScreen({ onUnlock }) {
  const { theme: t } = useTheme();
  const { prefs } = usePrefs();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [savedPin, setSavedPin] = useState(null);
  const [entry, setEntry] = useState('');
  const [pendingPin, setPendingPin] = useState('');
  const [mode, setMode] = useState('loading');
  const [message, setMessage] = useState('');
  const [tries, setTries] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [bio, setBio] = useState({ ok: false, label: 'Fingerprint' });
  const shake = useRef(new Animated.Value(0)).current;
  const askedBio = useRef(false);

  useEffect(() => {
    SecureStore.getItemAsync('ledger_pin').then((pin) => {
      if (pin) { setSavedPin(pin); setMode('unlock'); } else { setMode('setup'); }
    });
    biometricAvailable().then(setBio);
  }, []);

  const bioEnabled = mode === 'unlock' && prefs.biometric && bio.ok;

  const tryBiometric = useCallback(async () => {
    if (await biometricUnlock()) { haptic.success(); onUnlock(); }
  }, [onUnlock]);

  // Offer the fingerprint prompt straight away when it's turned on
  useEffect(() => {
    if (bioEnabled && !askedBio.current) { askedBio.current = true; tryBiometric(); }
  }, [bioEnabled, tryBiometric]);

  // Countdown while locked out
  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [lockedUntil]);
  const lockedFor = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  const doShake = () => {
    haptic.error();
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const pressKey = (digit) => {
    if (entry.length >= 4 || lockedFor > 0) return;
    haptic.tap();
    const next = entry + digit;
    setEntry(next);
    setMessage('');
    if (next.length === 4) setTimeout(() => handleComplete(next), 120);
  };

  const handleComplete = async (code) => {
    if (mode === 'setup') {
      setPendingPin(code); setEntry(''); setMode('confirm');
    } else if (mode === 'confirm') {
      if (code === pendingPin) {
        await SecureStore.setItemAsync('ledger_pin', code);
        setSavedPin(code);
        haptic.success();
        onUnlock();
      } else {
        doShake();
        setMessage("Those didn't match. Let's start again.");
        setEntry(''); setPendingPin(''); setMode('setup');
      }
    } else if (mode === 'unlock') {
      if (code === savedPin) { haptic.success(); onUnlock(); return; }
      doShake();
      const n = tries + 1;
      setEntry('');
      if (n >= MAX_TRIES) {
        setTries(0);
        setLockedUntil(Date.now() + LOCK_SECONDS * 1000);
        setNow(Date.now());
        setMessage('');
      } else {
        setTries(n);
        setMessage(`Wrong PIN · ${MAX_TRIES - n} ${MAX_TRIES - n === 1 ? 'try' : 'tries'} left`);
      }
    }
  };

  // Fingerprint proves it's you, then you pick a new PIN. Without it there's no way back in (by design).
  const forgotPin = async () => {
    if (!(bio.ok && prefs.biometric)) {
      Alert.alert('Forgot your PIN?', bio.hardware
        ? 'Add a fingerprint to this phone and turn on "Unlock with fingerprint" in Ledger to be able to reset it. If you cannot get in, reinstalling erases the data. Restore it from your latest backup afterwards.'
        : 'Your PIN protects your data, so it cannot be bypassed. If you reinstall the app the data is erased; restore it from your latest backup afterwards.');
      return;
    }
    if (await biometricUnlock('Confirm it\'s you to set a new PIN')) {
      haptic.success();
      setMessage(''); setEntry(''); setPendingPin(''); setMode('setup');
    }
  };

  const titles = { loading: '', setup: 'Create a 4-digit PIN', confirm: 'Type it once more', unlock: greeting() };
  const subtitles = { setup: 'You will use it every time you open Ledger.', confirm: 'Just to be sure.', unlock: 'Enter your PIN' };
  if (mode === 'loading') return <View style={styles.container} />;

  const shakeX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-12, 12] });

  return (
    <View style={styles.container}>
      <View style={styles.logo}><Text style={styles.logoText}>₱</Text></View>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={styles.title}>{titles[mode]}</Text>
        <Text style={styles.subtitle}>{lockedFor > 0 ? `Too many tries. Wait ${lockedFor}s.` : subtitles[mode]}</Text>
      </View>
      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeX }] }]}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, i < entry.length && styles.dotFilled]} />
        ))}
      </Animated.View>
      <Text style={styles.message}>{message}</Text>
      <View style={[styles.pad, lockedFor > 0 && { opacity: 0.35 }]}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'].map((k) => {
          if (k === 'bio') {
            return bioEnabled ? (
              <TouchableOpacity key={k} style={styles.keyGhost} onPress={tryBiometric} accessibilityLabel={bio.label}>
                <Ionicons name={bio.label === 'Face unlock' ? 'scan-outline' : 'finger-print'} size={30} color={t.accent} />
              </TouchableOpacity>
            ) : <View key={k} style={styles.keyGhost} />;
          }
          if (k === 'del') {
            return (
              <TouchableOpacity key={k} style={styles.keyGhost} onPress={() => { haptic.tap(); setEntry(entry.slice(0, -1)); }} accessibilityLabel="Delete">
                <Ionicons name="backspace-outline" size={26} color={t.inkDim} />
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity key={k} style={styles.key} onPress={() => pressKey(k)} activeOpacity={0.6}>
              <Text style={styles.keyText}>{k}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {mode === 'unlock' && (
        <TouchableOpacity onPress={forgotPin} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.forgot}>Forgot PIN?</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const KEY = 72;
const makeStyles = (t) => StyleSheet.create({
  forgot: { color: t.inkDim, fontSize: 13, textDecorationLine: 'underline' },
  container: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', gap: 22 },
  logo: { width: 64, height: 64, borderRadius: 20, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 6, transform: [{ rotate: '-6deg' }] },
  logoText: { color: t.onAccent, fontSize: 34, fontWeight: '800' },
  title: { color: t.ink, fontSize: 24, fontWeight: '700' },
  subtitle: { color: t.inkDim, fontSize: 14 },
  dotsRow: { flexDirection: 'row', gap: 18, marginTop: 6 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: t.inkFaint },
  dotFilled: { backgroundColor: t.accent, borderColor: t.accent, transform: [{ scale: 1.1 }] },
  message: { color: t.spend, fontSize: 13, height: 18 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', width: 3 * KEY + 2 * 22, columnGap: 22, rowGap: 16, justifyContent: 'center' },
  key: { width: KEY, height: KEY, borderRadius: KEY / 2, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' },
  keyGhost: { width: KEY, height: KEY, borderRadius: KEY / 2, alignItems: 'center', justifyContent: 'center' },
  keyText: { color: t.ink, fontSize: 26, fontWeight: '500' },
});
