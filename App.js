import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PinScreen from './components/PinScreen';

export default function App() {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return <PinScreen onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <View style={styles.container}>
      <Text style={{ color: '#F4EFE6' }}>You're in! (Feed screen comes next)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1A18',
    alignItems: 'center',
    justifyContent: 'center',
  },
});