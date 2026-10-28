import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DatePickerModal from './DatePickerModal';
import CommitGoalModal from './CommitGoalModal';
import { daysUntil, formatLong } from './dateUtils';
import { canCommit, isFullyFunded } from './goals';
import { GOAL_ICONS, GOAL_COLORS, goalIcon, goalColor, savingPace } from './goalStyle';
import { useTheme, readableOn } from './theme';
import { peso } from './format';
import * as haptic from './haptics';

const QUICK = [100, 500, 1000];

// Icon + colour chooser shared by "new plan" and "edit plan"
export function GoalLookPicker({ icon, color, onIcon, onColor }) {
  const { theme: t } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginBottom: 10 }}>
        {GOAL_ICONS.map((e) => (
          <TouchableOpacity key={e} onPress={() => onIcon(e)}
            style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 6, backgroundColor: icon === e ? color + '55' : t.surface2, borderWidth: 1, borderColor: icon === e ? color : 'transparent' }}>
            <Text style={{ fontSize: 19 }}>{e}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {GOAL_COLORS.map((c) => (
          <TouchableOpacity key={c} onPress={() => onColor(c)} accessibilityLabel={`colour ${c}`}
            style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: t.ink }} />
        ))}
      </View>
    </View>
  );
}

export default function GoalDetailModal({ visible, goal, categories = [], startCommit, onClose, onAdjustFunds, onUpdate, onDelete, onCommit }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [editing, setEditing] = useState(false);
  const [fundsInput, setFundsInput] = useState('');
  const [label, setLabel] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  const [note, setNote] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [color, setColor] = useState(null);
  const [dueDate, setDueDate] = useState(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [committing, setCommitting] = useState(false);
  const pop = useRef(new Animated.Value(1)).current;
  const wasFunded = useRef(false);

  useEffect(() => {
    if (goal) {
      setEditing(false); setFundsInput('');
      setLabel(goal.label); setTarget(String(goal.targetAmount)); setSaved(String(goal.savedAmount));
      setNote(goal.note || ''); setDueDate(goal.dueDate || null);
      setIcon(goalIcon(goal)); setColor(goal.color || null);
      // little celebration the moment a plan becomes fully funded
      const nowFunded = isFullyFunded(goal);
      if (nowFunded && !wasFunded.current && visible) {
        haptic.success();
        pop.setValue(0.6);
        Animated.spring(pop, { toValue: 1, friction: 3, useNativeDriver: true }).start();
      }
      wasFunded.current = nowFunded;
    }
  }, [goal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (visible && goal) wasFunded.current = isFullyFunded(goal); }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Opening straight into the commit step (from a card's Commit button)
  useEffect(() => {
    setCommitting(!!(visible && startCommit && goal && canCommit(goal)));
  }, [visible, startCommit]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!goal) return null;
  const gc = goalColor(goal, t);
  const pct = Math.min(100, (goal.savedAmount / goal.targetAmount) * 100);
  const remaining = goal.dueDate ? daysUntil(goal.dueDate) : null;
  const ready = canCommit(goal);
  const funded = isFullyFunded(goal);
  const pace = savingPace(goal, remaining);

  const adjust = (v) => {
    if (!v || v <= 0) return;
    haptic.tap();
    onAdjustFunds(goal.id, v);
    setFundsInput('');
  };
  const handleWithdraw = () => {
    const v = parseFloat(fundsInput);
    if (!v || v <= 0) return;
    if (v > goal.savedAmount) {
      Alert.alert('Not enough saved', `Only ${peso(goal.savedAmount, 2)} is saved in this plan.`);
      return;
    }
    haptic.tap();
    onAdjustFunds(goal.id, -v);
    setFundsInput('');
  };
  const handleSaveEdit = () => {
    const tg = parseFloat(target);
    const sv = parseFloat(saved);
    if (!label.trim() || !tg || tg <= 0 || isNaN(sv)) return;
    onUpdate(goal.id, { label: label.trim(), targetAmount: tg, savedAmount: Math.max(0, sv), note: note.trim(), dueDate, icon, color: color || undefined });
  };
  const confirmDelete = () => {
    const done = !!goal.committed;
    Alert.alert(done ? 'Remove from list?' : 'Delete this plan?', done ? `${goal.label}. The expense it recorded stays in your history.` : `${goal.label}. The ${peso(goal.savedAmount, 0)} set aside goes back to "safe to spend".`, [
      { text: 'Cancel', style: 'cancel' },
      { text: done ? 'Remove' : 'Delete', style: 'destructive', onPress: () => { onDelete(goal.id); onClose(); } },
    ]);
  };

  const dueText = remaining === null ? null
    : remaining < 0 ? `Overdue by ${Math.abs(remaining)} ${Math.abs(remaining) === 1 ? 'day' : 'days'}`
    : remaining === 0 ? 'Due today'
    : `Due ${formatLong(goal.dueDate)} · ${remaining} ${remaining === 1 ? 'day' : 'days'} left`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {goal.committed ? (
              <>
                <View style={styles.headRow}>
                  <View style={[styles.iconBox, { backgroundColor: t.gain + '33' }]}><Text style={{ fontSize: 22 }}>✅</Text></View>
                  <Text style={styles.title}>{goal.label}</Text>
                </View>
                <Text style={[styles.amt, { color: t.gain }]}>{peso(goal.committedAmount ?? goal.targetAmount, 0)} paid</Text>
                <Text style={styles.due}>Committed as an expense{goal.committedDate ? ` on ${formatLong(goal.committedDate)}` : ''}.</Text>
                {!!goal.note && <Text style={styles.note}>{goal.note}</Text>}
                <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}><Text style={{ color: t.spend, fontWeight: '600' }}>Remove from list</Text></TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={{ marginTop: 14 }}><Text style={{ color: t.inkDim, textAlign: 'center' }}>Close</Text></TouchableOpacity>
              </>
            ) : !editing ? (
              <>
                <View style={styles.headRow}>
                  <View style={[styles.iconBox, { backgroundColor: gc + '33', borderColor: gc }]}><Text style={{ fontSize: 22 }}>{goalIcon(goal)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{goal.label}</Text>
                    {!!dueText && <Text style={[styles.due, { marginBottom: 0 }, remaining < 0 && { color: t.spend }]}>{dueText}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => setEditing(true)} style={styles.editIcon} accessibilityLabel="Edit plan">
                    <Ionicons name="create-outline" size={20} color={t.ink} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.amt, { color: gc }]}>{peso(goal.savedAmount, 0)} <Text style={styles.amtOf}>of {peso(goal.targetAmount, 0)}</Text></Text>
                <View style={styles.track}><View style={[styles.fill, { width: `${pct}%`, backgroundColor: gc }]} /></View>
                <View style={styles.pctRow}>
                  <Text style={styles.pctText}>{Math.floor(pct)}%</Text>
                  {!funded && <Text style={styles.pctText}>{peso(goal.targetAmount - goal.savedAmount, 0)} to go</Text>}
                </View>

                {funded && (
                  <Animated.View style={[styles.fundedBox, { transform: [{ scale: pop }] }]}>
                    <Text style={styles.funded}>🎉 Fully funded</Text>
                  </Animated.View>
                )}
                {pace && (
                  <View style={styles.paceBox}>
                    <Ionicons name="trending-up" size={18} color={gc} />
                    <Text style={styles.paceText}>
                      Set aside about <Text style={{ fontWeight: '700' }}>{peso(Math.ceil(pace.perDay), 0)} a day</Text> ({peso(Math.ceil(pace.perWeek), 0)} a week) to make it on time.
                    </Text>
                  </View>
                )}
                {!!goal.note && <Text style={styles.note}>{goal.note}</Text>}

                {ready && (
                  <TouchableOpacity style={[styles.commitBtn, { backgroundColor: gc }]} onPress={() => setCommitting(true)}>
                    <Text style={{ color: readableOn(gc), fontWeight: '700' }}>Commit as expense</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.fieldLabel}>Add money</Text>
                <View style={styles.quickRow}>
                  {QUICK.map((q) => (
                    <TouchableOpacity key={q} style={[styles.quick, { borderColor: gc }]} onPress={() => adjust(q)}>
                      <Text style={{ color: t.ink, fontWeight: '600' }}>+{peso(q, 0)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.adjustRow}>
                  <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="Other amount" placeholderTextColor={t.inkFaint} value={fundsInput} onChangeText={setFundsInput} />
                  <TouchableOpacity style={[styles.adjustBtn, { backgroundColor: gc }]} onPress={() => adjust(parseFloat(fundsInput))}>
                    <Ionicons name="add" size={20} color={readableOn(gc)} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.adjustBtn, { borderColor: t.spend, borderWidth: 1 }]} onPress={handleWithdraw} accessibilityLabel="Withdraw">
                    <Ionicons name="remove" size={20} color={t.spend} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.deleteLink} onPress={confirmDelete}><Text style={{ color: t.spend, fontWeight: '600' }}>Delete plan</Text></TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={{ marginTop: 10 }}><Text style={{ color: t.inkDim, textAlign: 'center' }}>Close</Text></TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.title, { marginBottom: 14 }]}>Edit plan</Text>
                <GoalLookPicker icon={icon} color={color || t.accent} onIcon={setIcon} onColor={setColor} />
                <TextInput style={styles.textField} placeholder="Name" placeholderTextColor={t.inkFaint} value={label} onChangeText={setLabel} />
                <Text style={styles.fieldLabel}>Target amount</Text>
                <TextInput style={styles.textField} keyboardType="decimal-pad" value={target} onChangeText={setTarget} />
                <Text style={styles.fieldLabel}>Saved so far</Text>
                <TextInput style={styles.textField} keyboardType="decimal-pad" value={saved} onChangeText={setSaved} />
                <TextInput style={styles.textField} placeholder="Note (optional)" placeholderTextColor={t.inkFaint} value={note} onChangeText={setNote} />
                <TouchableOpacity style={styles.dateBtn} onPress={() => setDatePickerVisible(true)}>
                  <Ionicons name="calendar-outline" size={17} color={t.ink} />
                  <Text style={{ color: t.ink, flex: 1 }}>{dueDate ? `Due ${formatLong(dueDate)}, ${dueDate.slice(0, 4)}` : 'Set a due date (optional)'}</Text>
                  {!!dueDate && <TouchableOpacity onPress={() => setDueDate(null)}><Text style={{ color: t.inkFaint, fontSize: 12 }}>Clear</Text></TouchableOpacity>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}><Text style={{ color: t.onAccent, fontWeight: '700' }}>Save changes</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setEditing(false)} style={{ marginTop: 12 }}><Text style={{ color: t.inkDim, textAlign: 'center' }}>Cancel</Text></TouchableOpacity>
              </>
            )}
          </ScrollView>

          <DatePickerModal visible={datePickerVisible} initialDate={dueDate} onConfirm={(d) => { setDueDate(d); setDatePickerVisible(false); }} onClose={() => setDatePickerVisible(false)} />
          <CommitGoalModal
            visible={committing}
            goal={goal}
            categories={categories}
            onClose={() => setCommitting(false)}
            onConfirm={async (data) => { await onCommit(goal, data); setCommitting(false); onClose(); }}
          />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 22, maxHeight: '92%' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: t.edge, marginBottom: 16 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  iconBox: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  editIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' },
  title: { color: t.ink, fontSize: 18, fontWeight: '700' },
  amt: { fontSize: 32, fontWeight: '800', marginBottom: 10 },
  amtOf: { color: t.inkDim, fontSize: 15, fontWeight: '500' },
  track: { height: 10, backgroundColor: t.surface2, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  pctRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 12 },
  pctText: { color: t.inkDim, fontSize: 12 },
  fundedBox: { alignSelf: 'flex-start', backgroundColor: t.gain + '26', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 12 },
  funded: { color: t.gain, fontSize: 14, fontWeight: '700' },
  paceBox: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: t.surface2, borderRadius: 14, padding: 12, marginBottom: 12 },
  paceText: { flex: 1, color: t.ink, fontSize: 13, lineHeight: 18 },
  due: { color: t.inkDim, fontSize: 12.5, marginTop: 2, marginBottom: 10 },
  note: { color: t.ink, fontSize: 13.5, marginBottom: 14, lineHeight: 19 },
  commitBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  fieldLabel: { color: t.inkDim, fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  quick: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: t.surface2 },
  adjustRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  input: { flex: 1, minWidth: 0, backgroundColor: t.surface2, borderRadius: 12, color: t.ink, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  adjustBtn: { width: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  deleteLink: { alignItems: 'center', paddingVertical: 8 },
  deleteBtn: { borderColor: t.spend, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  textField: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 12, fontSize: 14.5, marginBottom: 12 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.surface2, borderRadius: 12, padding: 12, marginBottom: 14 },
  saveBtn: { backgroundColor: t.accent, padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 6 },
});
