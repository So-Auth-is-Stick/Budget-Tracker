import { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import PinScreen from './components/PinScreen';
import FeedScreen from './components/FeedScreen';
import CalendarScreen from './components/CalendarScreen';

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState('feed');

  if (!unlocked) {
    return <PinScreen onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0F1A18' }}>
      {tab === 'feed' ? <FeedScreen /> : <CalendarScreen />}

      <View style={styles.tabBar}>
        <TouchableOpacity onPress={() => setTab('feed')} style={styles.tabBtn}>
          <Text style={{ color: tab === 'feed' ? '#E8B84B' : '#9FB0A8' }}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('cal')} style={styles.tabBtn}>
          <Text style={{ color: tab === 'cal' ? '#E8B84B' : '#9FB0A8' }}>Calendar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', backgroundColor: '#16241F',
    paddingBottom: 24, paddingTop: 12, borderTopColor: '#2A3B34', borderTopWidth: 1,
  },
  tabBtn: { flex: 1, alignItems: 'center' },
});