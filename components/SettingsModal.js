import { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, Switch, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ChangePinModal from './ChangePinModal';
import ColorPicker from './ColorPicker';
import { AccountsManager } from './AccountsUI';
import { useAccounts } from './accounts';
import { useTheme, THEMES, THEME_ORDER } from './theme';
import { usePrefs } from './prefs';
import { biometricAvailable, biometricUnlock } from './biometric';
import { ensurePermission, sendTestNotification } from './notifications';
import { exportBackup, pickBackup, restoreBackup, hasUndoRestore, undoRestore, exportCsv } from './backup';
import { useToast } from './toast';
import * as haptic from './haptics';

const HOURS = [18, 19, 20, 21, 22];
const hourLabel = (h) => `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`;

function daysAgo(iso) {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
}

export default function SettingsModal({ visible, onClose, onDataRestored, transactions = [], categories = [], setTransactions }) {
  const { theme: t, themeKey, setThemeKey, accent, setAccent } = useTheme();
  const { prefs, setPref } = usePrefs();
  const toast = useToast();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [pinVisible, setPinVisible] = useState(false);
  const [bio, setBio] = useState({ ok: false, label: 'Fingerprint' });
  const [busy, setBusy] = useState(null);
  const [canUndo, setCanUndo] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const { accounts } = useAccounts();

  useEffect(() => {
    if (!visible) return;
    biometricAvailable().then(setBio);
    hasUndoRestore().then(setCanUndo);
  }, [visible]);

  const opt = (k) => ({ key: k, name: THEMES[k].name, preview: THEMES[k] });
  const themeGroups = [
    ['Dark', [{ key: 'system', name: 'Auto', preview: null }, ...THEME_ORDER.filter((k) => THEMES[k].isDark).map(opt)]],
    ['Light', THEME_ORDER.filter((k) => !THEMES[k].isDark).map(opt)],
  ];
  const ACCENTS = ['#E8B84B', '#FF7043', '#EC407A', '#B794F6', '#4FC3F7', '#26A69A', '#9BE15D', '#F2F3F5'];

  const toggleBiometric = async (value) => {
    if (!value) { setPref('biometric', false); return; }
    if (!bio.ok) {
      Alert.alert(`${bio.label} not set up`, bio.hardware ? 'Add a fingerprint in your phone settings first.' : 'This phone does not support it.');
      return;
    }
    if (await biometricUnlock('Confirm to turn on')) { setPref('biometric', true); haptic.success(); }
  };

  const toggleNotify = async (key, value) => {
    if (value && !(await ensurePermission(true))) {
      Alert.alert('Notifications are blocked', 'Allow notifications for Ledger in your phone settings, then try again.');
      return;
    }
    setPref(key, value);
  };

  const doExport = async () => {
    setBusy('export');
    try {
      const s = await exportBackup();
      setPref('lastBackupAt', new Date().toISOString());
      toast.show(`Backup created: ${s.transactions} entries, ${s.plans} plans`);
    } catch (e) {
      Alert.alert('Backup failed', String(e.message || e));
    } finally { setBusy(null); }
  };

  const doImport = async () => {
    setBusy('import');
    try {
      const picked = await pickBackup();
      if (!picked) return;
      const { summary: s, payload } = picked;
      const when = payload.exportedAt ? new Date(payload.exportedAt).toDateString() : 'an unknown date';
      Alert.alert(
        'Replace your current data?',
        `This backup is from ${when}:\n• ${s.transactions} entries\n• ${s.tags} tags\n• ${s.plans} plans\n• ${s.recurring} recurring\n\nYour current data will be replaced. You can undo this right after from Settings.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Restore', style: 'destructive', onPress: async () => {
            await restoreBackup(payload);
            await onDataRestored?.();
            setCanUndo(true);
            haptic.success();
            toast.show('Backup restored');
          } },
        ]
      );
    } catch (e) {
      Alert.alert("Couldn't restore", String(e.message || e));
    } finally { setBusy(null); }
  };

  const doUndoRestore = () => {
    Alert.alert('Undo the last restore?', 'Your data goes back to how it was just before you restored.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Undo restore', onPress: async () => {
        if (await undoRestore()) { await onDataRestored?.(); setCanUndo(false); toast.show('Restore undone'); }
      } },
    ]);
  };

  const Row = ({ icon, label, hint, value, onValueChange, disabled }) => (
    <View style={[styles.row, disabled && { opacity: 0.5 }]}>
      <Ionicons name={icon} size={20} color={t.accent} style={{ width: 26 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {!!hint && <Text style={styles.rowHint}>{hint}</Text>}
      </View>
      <Switch value={!!value} disabled={disabled} onValueChange={onValueChange} trackColor={{ false: t.edge, true: t.accent }} thumbColor="#FFFFFF" />
    </View>
  );

  const Button = ({ icon, label, hint, onPress, loading, danger }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!!busy}>
      <Ionicons name={icon} size={20} color={danger ? t.spend : t.accent} style={{ width: 26 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, danger && { color: t.spend }]}>{label}</Text>
        {!!hint && <Text style={styles.rowHint}>{hint}</Text>}
      </View>
      {loading ? <ActivityIndicator color={t.accent} /> : <Ionicons name="chevron-forward" size={18} color={t.inkFaint} />}
    </TouchableOpacity>
  );

  const backupAge = daysAgo(prefs.lastBackupAt);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={styles.done}>Done</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.sectionLabel}>Appearance</Text>
            {themeGroups.map(([groupName, opts]) => (
              <View key={groupName}>
                <Text style={styles.groupLabel}>{groupName}</Text>
                <View style={styles.grid}>
                  {opts.map((o) => (
                    <TouchableOpacity key={o.key} onPress={() => { haptic.tap(); setThemeKey(o.key); }}
                      style={[styles.themeCard, themeKey === o.key && styles.themeCardActive]}>
                      {o.preview ? (
                        <View style={[styles.swatch, { backgroundColor: o.preview.bg, borderColor: o.preview.edge }]}>
                          <View style={[styles.swatchBar, { backgroundColor: o.preview.surface2 }]} />
                          <View style={[styles.swatchDot, { backgroundColor: o.preview.accent }]} />
                        </View>
                      ) : (
                        <View style={[styles.swatch, { alignItems: 'center', justifyContent: 'center', borderColor: t.edge }]}>
                          <Ionicons name="contrast-outline" size={22} color={t.ink} />
                        </View>
                      )}
                      <Text style={styles.themeName}>{o.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
            <Text style={styles.hint}>Auto follows your phone's light/dark setting.</Text>

            <Text style={styles.groupLabel}>Accent colour</Text>
            <View style={styles.accentRow}>
              <TouchableOpacity onPress={() => { haptic.tap(); setAccent(null); }} style={[styles.accentChip, !accent && styles.accentChipOn]}>
                <Text style={{ color: t.ink, fontSize: 12 }}>Theme's own</Text>
              </TouchableOpacity>
              {ACCENTS.map((c) => (
                <TouchableOpacity key={c} onPress={() => { haptic.tap(); setAccent(c); }} accessibilityLabel={`accent ${c}`}
                  style={[styles.accentDot, { backgroundColor: c }, accent === c && { borderWidth: 3, borderColor: t.ink }]} />
              ))}
              <ColorPicker trigger="more" size={30} value={accent} active={!!accent && !ACCENTS.includes(accent)} onChange={(c) => setAccent(c)} title="Accent colour" />
            </View>
            <Text style={styles.hint}>Recolours buttons, highlights and the + button in any theme.</Text>

            <Text style={styles.sectionLabel}>Money</Text>
            <View style={styles.group}>
              <Button icon="wallet-outline" label="Accounts" hint={accounts.length ? accounts.map((a) => a.icon + ' ' + a.label).join('  ') : 'Off · track cash, GCash, bank separately'} onPress={() => setAccountsOpen(true)} />
            </View>

            <Text style={styles.sectionLabel}>Security</Text>
            <View style={styles.group}>
              <Row icon="finger-print" label={`Unlock with ${bio.label.toLowerCase()}`} hint={bio.ok ? 'Your PIN still works too.' : 'Not set up on this phone.'}
                value={prefs.biometric} onValueChange={toggleBiometric} />
              <View style={styles.sep} />
              <Button icon="keypad-outline" label="Change PIN" onPress={() => setPinVisible(true)} />
            </View>
            <Text style={styles.hint}>Ledger locks itself again after 2 minutes in the background.</Text>

            <Text style={styles.sectionLabel}>Reminders</Text>
            <View style={styles.group}>
              <Row icon="flag-outline" label="Plans coming due" hint="9 AM the day before and on the day." value={prefs.notifyPlans} onValueChange={(v) => toggleNotify('notifyPlans', v)} />
              <View style={styles.sep} />
              <Row icon="repeat" label="Recurring entries" hint="9 AM on the day one is added." value={prefs.notifyRecurring} onValueChange={(v) => toggleNotify('notifyRecurring', v)} />
              <View style={styles.sep} />
              <Row icon="create-outline" label="Daily log nudge" hint="Skipped on days you've already logged." value={prefs.notifyDaily} onValueChange={(v) => toggleNotify('notifyDaily', v)} />
              {prefs.notifyDaily && (
                <View style={styles.hourRow}>
                  {HOURS.map((h) => (
                    <TouchableOpacity key={h} onPress={() => { setPref('dailyHour', h); setPref('dailyMinute', 0); }}
                      style={[styles.hourChip, prefs.dailyHour === h && { backgroundColor: t.accent, borderColor: t.accent }]}>
                      <Text style={{ color: prefs.dailyHour === h ? t.onAccent : t.ink, fontSize: 12.5 }}>{hourLabel(h)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.sep} />
              <Button icon="notifications-outline" label="Send a test reminder" onPress={async () => {
                if (await sendTestNotification()) toast.show('A test reminder will pop up in a moment');
                else Alert.alert('Notifications are blocked', 'Allow notifications for Ledger in your phone settings.');
              }} />
            </View>

            <Text style={styles.sectionLabel}>Backup</Text>
            <View style={styles.group}>
              <Button icon="cloud-upload-outline" label="Back up now"
                hint={backupAge ? `Last backup ${backupAge}` : 'Never backed up. Your data only lives on this phone.'}
                onPress={doExport} loading={busy === 'export'} />
              <View style={styles.sep} />
              <Button icon="cloud-download-outline" label="Restore from a backup" hint="Pick a ledger-backup .json file" onPress={doImport} loading={busy === 'import'} />
              <View style={styles.sep} />
              <Button icon="grid-outline" label="Export as spreadsheet (.csv)" hint="Opens in Excel or Google Sheets" loading={busy === 'csv'} onPress={async () => {
                setBusy('csv');
                try { const n = await exportCsv(transactions, categories, accounts); toast.show(`Exported ${n} entries`); }
                catch (e) { Alert.alert('Export failed', String(e.message || e)); }
                finally { setBusy(null); }
              }} />
              {canUndo && (<>
                <View style={styles.sep} />
                <Button icon="arrow-undo-outline" label="Undo last restore" onPress={doUndoRestore} danger />
              </>)}
            </View>
            <Text style={styles.hint}>Save the file to Google Drive or email it to yourself. Your PIN is never included.</Text>

            <Text style={styles.sectionLabel}>Feel & privacy</Text>
            <View style={styles.group}>
              <Row icon="pulse-outline" label="Vibration feedback" hint="Small taps when saving, deleting and unlocking." value={prefs.haptics} onValueChange={(v) => setPref('haptics', v)} />
              <View style={styles.sep} />
              <Row icon="eye-off-outline" label="Hide amounts" hint="Shows ₱•••• everywhere. Also: tap the eye next to Balance." value={prefs.hideAmounts} onValueChange={(v) => setPref('hideAmounts', v)} />
            </View>

            <Text style={styles.footer}>Ledger · data stays on this phone</Text>
          </ScrollView>
          <ChangePinModal visible={pinVisible} onClose={() => setPinVisible(false)} />
          <AccountsManager visible={accountsOpen} onClose={() => setAccountsOpen(false)} transactions={transactions} setTransactions={setTransactions} />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 20, maxHeight: '92%' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: t.ink, fontSize: 20, fontWeight: '700' },
  done: { color: t.accent, fontSize: 15, fontWeight: '600' },
  sectionLabel: { color: t.inkDim, fontSize: 12, marginTop: 22, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  groupLabel: { color: t.inkFaint, fontSize: 12, marginTop: 12, marginBottom: 8 },
  accentRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  accentChip: { paddingVertical: 7, paddingHorizontal: 11, borderRadius: 14, borderWidth: 1.5, borderColor: t.edge },
  accentChipOn: { borderColor: t.accent, backgroundColor: t.surface2 },
  accentDot: { width: 30, height: 30, borderRadius: 15 },
  themeCard: { width: '22.5%', alignItems: 'center', paddingVertical: 8, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  themeCardActive: { borderColor: t.accent, backgroundColor: t.surface2 },
  swatch: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 6 },
  swatchBar: { position: 'absolute', left: 6, right: 6, bottom: 8, height: 10, borderRadius: 4 },
  swatchDot: { position: 'absolute', top: 7, right: 7, width: 14, height: 14, borderRadius: 7 },
  themeName: { color: t.ink, fontSize: 12 },
  hint: { color: t.inkFaint, fontSize: 12, marginTop: 8, lineHeight: 17 },
  group: { backgroundColor: t.surface2, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 14 },
  rowLabel: { color: t.ink, fontSize: 14.5 },
  rowHint: { color: t.inkDim, fontSize: 12, marginTop: 2 },
  sep: { height: 1, backgroundColor: t.edge, marginLeft: 50 },
  hourRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 12, paddingLeft: 50 },
  hourChip: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: 14, borderWidth: 1, borderColor: t.edge },
  footer: { color: t.inkFaint, fontSize: 12, textAlign: 'center', marginTop: 26 },
});
