import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export default function PinScreen({ onUnlock }) {
  const [savedPin, setSavedPin] = useState(null);   // the PIN stored on device, or null if none yet
  const [entry, setEntry] = useState('');            // digits currently typed
  const [pendingPin, setPendingPin] = useState('');  // used during first-time setup
  const [mode, setMode] = useState('loading');        // 'loading' | 'setup' | 'confirm' | 'unlock'

  // On first render, check if a PIN already exists on this device
  useEffect(() => {
    SecureStore.getItemAsync('ledger_pin').then((pin) => {
      if (pin) {
        setSavedPin(pin);
        setMode('unlock');
      } else {
        setMode('setup');
      }
    });
  }, []);

  const pressKey = (digit) => {
    if (entry.length >= 4) return;
    const next = entry + digit;
    setEntry(next);
    if (next.length === 4) {
      setTimeout(() => handleComplete(next), 120);
    }
  };

  const handleComplete = async (code) => {
    if (mode === 'setup') {
      setPendingPin(code);
      setEntry('');
      setMode('confirm');
    } else if (mode === 'confirm') {
      if (code === pendingPin) {
        await SecureStore.setItemAsync('ledger_pin', code);
        onUnlock();
      } else {
        Alert.alert("Didn't match", 'Try setting your PIN again.');
        setEntry('');
        setPendingPin('');
        setMode('setup');
      }
    } else if (mode === 'unlock') {
      if (code === savedPin) {
        onUnlock();
      } else {
        Alert.alert('Wrong PIN', 'Try again.');
        setEntry('');
      }
    }
  };

  const titles = {
    loading: '',
    setup: 'Set a 4-digit PIN',
    confirm: 'Confirm your PIN',
    unlock: 'Enter your PIN',
  };

  if (mode === 'loading') return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <Text style={styles.mark}>Ledger</Text>
      <Text style={styles.title}>{titles[mode]}</Text>

      <View style={styles.dotsRow}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.dot, i < entry.length && styles.dotFilled]}
          />
        ))}
      </View>

      <View style={styles.pad}>
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => {
          if (k === '') return <View key={i} style={styles.key} />;
          if (k === '⌫') {
            return (
              <TouchableOpacity key={i} style={styles.key} onPress={() => setEntry(entry.slice(0, -1))}>
                <Text style={styles.keyText}>⌫</Text>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity key={i} style={styles.key} onPress={() => pressKey(k)}>
              <Text style={styles.keyText}>{k}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1A18',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  mark: { color: '#9FB0A8', fontSize: 15 },
  title: { color: '#F4EFE6', fontSize: 22, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', gap: 14 },
  dot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 1.5, borderColor: '#5E6F68',
  },
  dotFilled: { backgroundColor: '#E8B84B', borderColor: '#E8B84B' },
  pad: {
    flexDirection: 'row', flexWrap: 'wrap',
    width: 3 * 64 + 2 * 14, gap: 14, justifyContent: 'center',
  },
  key: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 1, borderColor: '#2A3B34', backgroundColor: '#16241F',
    alignItems: 'center', justifyContent: 'center',
  },
  keyText: { color: '#F4EFE6', fontSize: 20 },
});