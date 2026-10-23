import { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useTheme } from './theme';

export default function DatePickerModal({ visible, initialDate, maxDate, onConfirm, onClose }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [picked, setPicked] = useState(initialDate || null);

  useEffect(() => { if (visible) setPicked(initialDate || null); }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Pick a date</Text>
          <Calendar
            key={t.name}
            current={initialDate || undefined}
            maxDate={maxDate}
            onDayPress={(day) => setPicked(day.dateString)}
            markedDates={picked ? { [picked]: { selected: true, selectedColor: t.accent } } : {}}
            theme={{
              calendarBackground: t.surface, dayTextColor: t.ink, monthTextColor: t.ink, textDisabledColor: t.inkFaint,
              todayTextColor: t.accent, arrowColor: t.accent, textSectionTitleColor: t.inkDim,
              selectedDayBackgroundColor: t.accent, selectedDayTextColor: t.onAccent,
            }}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={() => picked && onConfirm(picked)}>
            <Text style={{ color: t.onAccent, fontWeight: '600' }}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}><Text style={{ color: t.inkDim, textAlign: 'center', marginTop: 12 }}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  title: { color: t.ink, fontSize: 16, marginBottom: 10 },
  saveBtn: { backgroundColor: t.accent, padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 12 },
});
