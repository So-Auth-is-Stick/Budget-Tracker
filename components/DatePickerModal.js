import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';

export default function DatePickerModal({ visible, initialDate, onConfirm, onClose }) {
  const [picked, setPicked] = useState(initialDate || null);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Pick a date</Text>
          <Calendar
            current={initialDate || undefined}
            onDayPress={(day) => setPicked(day.dateString)}
            markedDates={picked ? { [picked]: { selected: true, selectedColor: '#E8B84B' } } : {}}
            theme={{ calendarBackground: '#0F1A18', dayTextColor: '#F4EFE6', monthTextColor: '#F4EFE6', textDisabledColor: '#5E6F68', todayTextColor: '#E8B84B', arrowColor: '#E8B84B' }}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={() => picked && onConfirm(picked)}>
            <Text style={{ color: '#1B1200', fontWeight: '600' }}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}><Text style={{ color: '#9FB0A8', textAlign: 'center', marginTop: 12 }}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#16241F', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  title: { color: '#F4EFE6', fontSize: 16, marginBottom: 10 },
  saveBtn: { backgroundColor: '#E8B84B', padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 12 },
});