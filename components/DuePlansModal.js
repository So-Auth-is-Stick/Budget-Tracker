import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import CommitGoalModal from './CommitGoalModal';
import { daysUntil } from './dateUtils';
import { useTheme } from './theme';
import { peso } from './format';
import { goalIcon } from './goalStyle';

// Shown after unlocking (and when the app comes back to the front) if any plan has reached its date.
export default function DuePlansModal({ visible, goals, categories, onClose, onLater, onCommit }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [committing, setCommitting] = useState(null);

  return (
    <Modal visible={visible && goals.length > 0} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Due now</Text>
          <Text style={styles.sub}>These plans have reached their date. Commit to record each one as an expense.</Text>

          <ScrollView style={{ maxHeight: 340 }}>
            {goals.map((g) => {
              const d = daysUntil(g.dueDate);
              return (
                <View key={g.id} style={styles.card}>
                  <Text style={styles.name}>{goalIcon(g)} {g.label}</Text>
                  <Text style={[styles.due, d < 0 && { color: t.spend }]}>
                    {d < 0 ? `Overdue by ${Math.abs(d)} day(s)` : 'Due today'}. {peso(g.savedAmount, 0)} of {peso(g.targetAmount, 0)} saved.
                  </Text>
                  <View style={styles.btnRow}>
                    <TouchableOpacity style={styles.laterBtn} onPress={() => onLater(g)}>
                      <Text style={{ color: t.inkDim }}>Remind me tomorrow</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.commitBtn} onPress={() => setCommitting(g)}>
                      <Text style={{ color: t.onAccent, fontWeight: '600' }}>Commit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity onPress={onClose}><Text style={styles.close}>Close</Text></TouchableOpacity>

          <CommitGoalModal
            visible={!!committing}
            goal={committing}
            categories={categories}
            onClose={() => setCommitting(null)}
            onConfirm={async (data) => { await onCommit(committing, data); setCommitting(null); }}
          />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  title: { color: t.ink, fontSize: 19, fontWeight: '600', marginBottom: 4 },
  sub: { color: t.inkDim, fontSize: 13, marginBottom: 16, lineHeight: 18 },
  card: { backgroundColor: t.accent + '18', borderColor: t.accent + '55', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  name: { color: t.ink, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  due: { color: t.inkDim, fontSize: 12.5, marginBottom: 12 },
  btnRow: { flexDirection: 'row', gap: 10 },
  laterBtn: { flex: 1, borderColor: t.edge, borderWidth: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  commitBtn: { flex: 1, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  close: { color: t.inkDim, textAlign: 'center', marginTop: 10 },
});
