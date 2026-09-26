import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export default function ChangePinModal({ visible, onClose }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const reset = () => { setCurrentPin(''); setNewPin(''); setConfirmPin(''); };

  const handleSave = async () => {
    const savedPin = await SecureStore.getItemAsync('ledger_pin');
    if (currentPin !== savedPin) {
      Alert.alert('Incorrect PIN', 'Your current PIN is wrong.');
      return;
    }
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      Alert.alert('Invalid PIN', 'New PIN must be exactly 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert("Didn't match", 'New PIN and confirmation must match.');
      return;
    }
    await SecureStore.setItemAsync('ledger_pin', newPin);
    Alert.alert('PIN updated', 'Your PIN has been changed.');
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Change PIN</Text>
          <TextInput style={styles.input} placeholder="Current PIN" placeholderTextColor="#5E6F68" keyboardType="number-pad" maxLength={4} secureTextEntry value={currentPin} onChangeText={setCurrentPin} />
          <TextInput style={styles.input} placeholder="New PIN" placeholderTextColor="#5E6F68" keyboardType="number-pad" maxLength={4} secureTextEntry value={newPin} onChangeText={setNewPin} />
          <TextInput style={styles.input} placeholder="Confirm new PIN" placeholderTextColor="#5E6F68" keyboardType="number-pad" maxLength={4} secureTextEntry value={confirmPin} onChangeText={setConfirmPin} />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={{ color: '#1B1200', fontWeight: '600' }}>Save</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}><Text style={{ color: '#9FB0A8', textAlign: 'center', marginTop: 12 }}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#16241F', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  title: { color: '#F4EFE6', fontSize: 17, marginBottom: 16 },
  input: { backgroundColor: '#1D2E27', borderRadius: 12, color: '#F4EFE6', padding: 12, fontSize: 16, marginBottom: 12, textAlign: 'center', letterSpacing: 4 },
  saveBtn: { backgroundColor: '#E8B84B', padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 6 },
});