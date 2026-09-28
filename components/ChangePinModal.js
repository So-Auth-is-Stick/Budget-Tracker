import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from './theme';

export default function ChangePinModal({ visible, onClose }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const reset = () => { setCurrentPin(''); setNewPin(''); setConfirmPin(''); };

  const handleSave = async () => {
    const savedPin = await SecureStore.getItemAsync('ledger_pin');
    if (currentPin !== savedPin) { Alert.alert('Incorrect PIN', 'Your current PIN is wrong.'); return; }
    if (newPin.length !== 4 || confirmPin.length !== 4) { Alert.alert('Invalid PIN', 'New PIN must be exactly 4 digits.'); return; }
    if (newPin !== confirmPin) { Alert.alert("Didn't match", 'New PIN and confirmation must match.'); return; }
    await SecureStore.setItemAsync('ledger_pin', newPin);
    Alert.alert('PIN updated', 'Your PIN has been changed.');
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Change PIN</Text>
          <TextInput style={styles.input} placeholder="Current PIN" placeholderTextColor={t.inkFaint} keyboardType="number-pad" maxLength={4} secureTextEntry value={currentPin} onChangeText={setCurrentPin} />
          <TextInput style={styles.input} placeholder="New PIN" placeholderTextColor={t.inkFaint} keyboardType="number-pad" maxLength={4} secureTextEntry value={newPin} onChangeText={setNewPin} />
          <TextInput style={styles.input} placeholder="Confirm new PIN" placeholderTextColor={t.inkFaint} keyboardType="number-pad" maxLength={4} secureTextEntry value={confirmPin} onChangeText={setConfirmPin} />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  title: { color: t.ink, fontSize: 17, marginBottom: 16 },
  input: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 12, fontSize: 16, marginBottom: 12, textAlign: 'center', letterSpacing: 4 },
  saveBtn: { backgroundColor: t.accent, padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 6 },
  saveText: { color: t.onAccent, fontWeight: '600' },
  cancel: { color: t.inkDim, textAlign: 'center', marginTop: 12 },
});