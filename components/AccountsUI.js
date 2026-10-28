import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccounts, ACCOUNT_PRESETS, accountBalances, accountOf } from './accounts';
import { clearAccount } from './storage';
import { findCategory } from './categories';
import { formatLong, todayStr } from './dateUtils';
import { peso } from './format';
import { useTheme, readableOn } from './theme';
import * as haptic from './haptics';

const ICONS = ['💵', '📱', '📲', '🏦', '💳', '🐷', '👛', '🪙', '💼', '🏧'];
const COLORS = ['#7FC29B', '#42A5F5', '#26A69A', '#5C6BC0', '#AB47BC', '#EC407A', '#E8B84B', '#FF7043', '#8D6E63', '#78909C'];

// Settings → Accounts
export function AccountsManager({ visible, onClose, transactions, setTransactions }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { accounts, transfers, addAccount, updateAccount, makeDefault, removeAccount } = useAccounts();
  const [form, setForm] = useState(null); // { id?, label, icon, color }
  const balances = accountBalances(accounts, transactions, transfers);

  const save = async () => {
    if (!form.label.trim()) return;
    if (form.id) await updateAccount(form.id, { label: form.label.trim(), icon: form.icon, color: form.color });
    else await addAccount({ label: form.label.trim(), icon: form.icon, color: form.color });
    haptic.success();
    setForm(null);
  };
  const remove = (a) => {
    if (accounts.length > 1 && a.isDefault) { Alert.alert('Pick another main account first', 'Entries without an account belong to the main one.'); return; }
    Alert.alert(`Delete ${a.label}?`, accounts.length > 1 ? 'Its entries move to your main account. Money moves to or from it are removed.' : 'This turns accounts off. Your entries stay.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await removeAccount(a.id, { clearAccount: async (id) => setTransactions(await clearAccount(id)) });
        setForm(null);
      } },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {!form ? (
              <>
                <View style={styles.head}>
                  <Text style={styles.title}>Accounts</Text>
                  <TouchableOpacity onPress={onClose}><Text style={styles.done}>Done</Text></TouchableOpacity>
                </View>
                <Text style={styles.help}>
                  {accounts.length === 0
                    ? 'Track where your money is: cash, GCash, bank… Optional. Your first account becomes the main one and holds everything you already logged. Use "Move money" on the Balance screen to split it.'
                    : 'Entries without an account count toward the main one.'}
                </Text>
                {accounts.map((a) => (
                  <TouchableOpacity key={a.id} style={styles.row} onPress={() => setForm({ ...a })}>
                    <View style={[styles.icon, { backgroundColor: a.color + '33' }]}><Text style={{ fontSize: 18 }}>{a.icon}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{a.label}{a.isDefault ? '  ·  main' : ''}</Text>
                      <Text style={styles.bal}>{peso(balances[a.id] || 0, 2)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={t.inkFaint} />
                  </TouchableOpacity>
                ))}
                <Text style={styles.label}>Add an account</Text>
                <View style={styles.presetWrap}>
                  {ACCOUNT_PRESETS.filter((p) => !accounts.some((a) => a.label === p.label)).map((p) => (
                    <TouchableOpacity key={p.label} style={[styles.preset, { borderColor: p.color }]} onPress={() => setForm({ ...p })}>
                      <Text style={{ color: t.ink }}>{p.icon} {p.label}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[styles.preset, { borderStyle: 'dashed', borderColor: t.accent }]} onPress={() => setForm({ label: '', icon: '👛', color: COLORS[6] })}>
                    <Text style={{ color: t.accent, fontWeight: '600' }}>+ Other</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title}>{form.id ? 'Edit account' : 'New account'}</Text>
                <View style={{ alignItems: 'center', marginVertical: 14 }}>
                  <View style={[styles.previewChip, { backgroundColor: form.color }]}><Text style={{ color: readableOn(form.color), fontSize: 15 }}>{form.icon} {form.label || 'Name'}</Text></View>
                </View>
                <TextInput style={styles.input} placeholder="Name (e.g. BPI, Wallet)" placeholderTextColor={t.inkFaint} value={form.label} onChangeText={(v) => setForm({ ...form, label: v })} maxLength={18} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  {ICONS.map((i) => (
                    <TouchableOpacity key={i} onPress={() => setForm({ ...form, icon: i })} style={[styles.pick, form.icon === i && { borderColor: form.color, backgroundColor: form.color + '44' }]}>
                      <Text style={{ fontSize: 19 }}>{i}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.colorRow}>
                  {COLORS.map((c) => (
                    <TouchableOpacity key={c} onPress={() => setForm({ ...form, color: c })} style={[styles.colorDot, { backgroundColor: c }, form.color === c && { borderWidth: 3, borderColor: t.ink }]} />
                  ))}
                </View>
                <TouchableOpacity style={styles.saveBtn} onPress={save}><Text style={styles.saveText}>{form.id ? 'Save' : 'Add account'}</Text></TouchableOpacity>
                {form.id && !accounts.find((a) => a.id === form.id)?.isDefault && (
                  <TouchableOpacity onPress={async () => { await makeDefault(form.id); setForm(null); }} style={{ marginTop: 14 }}>
                    <Text style={{ color: t.accent, textAlign: 'center', fontWeight: '600' }}>Make this the main account</Text>
                  </TouchableOpacity>
                )}
                {form.id && (
                  <TouchableOpacity onPress={() => remove(accounts.find((a) => a.id === form.id))} style={{ marginTop: 14 }}>
                    <Text style={{ color: t.spend, textAlign: 'center', fontWeight: '600' }}>Delete account</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setForm(null)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// "Move money" between two accounts, e.g. ATM withdrawal from Bank to Cash
export function TransferSheet({ visible, onClose, presetFrom }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { accounts, addTransfer } = useAccounts();
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const onShow = () => {
    const f = presetFrom || (accounts[0] && accounts[0].id);
    setFrom(f); setTo((accounts.find((a) => a.id !== f) || {}).id || null); setAmount(''); setNote('');
  };
  const value = parseFloat(String(amount).replace(/,/g, ''));
  const valid = from && to && from !== to && value > 0;
  const save = async () => {
    if (!valid) return;
    await addTransfer({ from, to, amount: Math.round(value * 100) / 100, note: note.trim(), date: todayStr() });
    haptic.success();
    onClose(true);
  };

  const Chips = ({ value: v, onPick, exclude }) => (
    <View style={styles.presetWrap}>
      {accounts.map((a) => (
        <TouchableOpacity key={a.id} disabled={a.id === exclude} onPress={() => onPick(a.id)}
          style={[styles.preset, { borderColor: a.color }, v === a.id && { backgroundColor: a.color }, a.id === exclude && { opacity: 0.3 }]}>
          <Text style={{ color: v === a.id ? readableOn(a.color) : t.ink }}>{a.icon} {a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onShow={onShow} onRequestClose={() => onClose(false)}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Move money</Text>
            <Text style={styles.help}>Moving money between your accounts isn't spending, so it won't touch your budgets.</Text>
            <Text style={styles.label}>From</Text>
            <Chips value={from} onPick={(id) => { setFrom(id); if (id === to) setTo(null); }} />
            <Text style={styles.label}>To</Text>
            <Chips value={to} onPick={setTo} exclude={from} />
            <TextInput style={[styles.input, { fontSize: 22, fontWeight: '700' }]} placeholder="₱ Amount" keyboardType="decimal-pad" placeholderTextColor={t.inkFaint}
              value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.,]/g, ''))} />
            <TextInput style={styles.input} placeholder="Note (e.g. ATM, cash in)" placeholderTextColor={t.inkFaint} value={note} onChangeText={setNote} maxLength={40} />
            <TouchableOpacity style={[styles.saveBtn, !valid && { opacity: 0.45 }]} onPress={save}><Text style={styles.saveText}>Move {valid ? peso(value, 0) : ''}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => onClose(false)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Tapping an account on Balance: its recent activity
export function AccountActivity({ account, onClose, transactions, categories, onMove }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { accounts, transfers, deleteTransfer } = useAccounts();
  if (!account) return null;
  const bal = accountBalances(accounts, transactions, transfers)[account.id] || 0;
  const name = (id) => (accounts.find((a) => a.id === id) || { label: '?' }).label;
  const items = [
    ...transactions.filter((tx) => accountOf(tx, accounts) === account.id).map((tx) => ({ kind: 'tx', date: tx.date, sort: tx.id, tx })),
    ...transfers.filter((tr) => tr.from === account.id || tr.to === account.id).map((tr) => ({ kind: 'tr', date: tr.date, sort: Number(String(tr.id).replace(/\D/g, '')) || 0, tr })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.sort - a.sort).slice(0, 30);

  return (
    <Modal visible={!!account} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>{account.icon} {account.label}</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.done}>Close</Text></TouchableOpacity>
          </View>
          <Text style={[styles.big, { color: bal < 0 ? t.spend : t.ink }]}>{peso(bal, 2)}</Text>
          <TouchableOpacity style={[styles.saveBtn, { marginVertical: 12 }]} onPress={() => onMove(account.id)}><Text style={styles.saveText}>⇄  Move money from here</Text></TouchableOpacity>
          <ScrollView style={{ maxHeight: 380 }}>
            {items.length === 0 && <Text style={styles.help}>Nothing here yet.</Text>}
            {items.map((it) => {
              if (it.kind === 'tx') {
                const c = findCategory(categories, it.tx.category);
                const inc = it.tx.type === 'income';
                return (
                  <View key={'x' + it.tx.id} style={styles.actRow}>
                    <Text style={styles.actName} numberOfLines={1}>{c.icon} {it.tx.note || c.label}</Text>
                    <Text style={styles.actDate}>{formatLong(it.date)}</Text>
                    <Text style={[styles.actAmt, { color: inc ? t.gain : t.spend }]}>{inc ? '+' : '−'}{peso(it.tx.amount, 0)}</Text>
                  </View>
                );
              }
              const out = it.tr.from === account.id;
              return (
                <TouchableOpacity key={'t' + it.tr.id} style={styles.actRow} onLongPress={() => Alert.alert('Delete this move?', `${peso(it.tr.amount, 0)} ${name(it.tr.from)} → ${name(it.tr.to)}`, [
                  { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteTransfer(it.tr.id) }])}>
                  <Text style={styles.actName} numberOfLines={1}>⇄ {out ? `To ${name(it.tr.to)}` : `From ${name(it.tr.from)}`}{it.tr.note ? ` · ${it.tr.note}` : ''}</Text>
                  <Text style={styles.actDate}>{formatLong(it.date)}</Text>
                  <Text style={[styles.actAmt, { color: t.inkDim }]}>{out ? '−' : '+'}{peso(it.tr.amount, 0)}</Text>
                </TouchableOpacity>
              );
            })}
            {items.some((i) => i.kind === 'tr') && <Text style={[styles.help, { marginTop: 8 }]}>Long-press a move to delete it.</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, maxHeight: '90%' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: t.ink, fontSize: 19, fontWeight: '700' },
  done: { color: t.accent, fontSize: 15, fontWeight: '600' },
  help: { color: t.inkDim, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  label: { color: t.inkDim, fontSize: 12, marginTop: 14, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomColor: t.edge, borderBottomWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  name: { color: t.ink, fontSize: 15, fontWeight: '600' },
  bal: { color: t.inkDim, fontSize: 12.5, marginTop: 2 },
  presetWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: 18, borderWidth: 1.5, backgroundColor: t.surface2 },
  previewChip: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20 },
  input: { backgroundColor: t.surface2, borderRadius: 12, color: t.ink, padding: 12, fontSize: 15, marginTop: 12 },
  pick: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginTop: 10, borderWidth: 1, borderColor: 'transparent', backgroundColor: t.surface2 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  saveBtn: { backgroundColor: t.accent, padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  saveText: { color: t.onAccent, fontWeight: '700' },
  cancel: { color: t.inkDim, textAlign: 'center', marginTop: 14 },
  big: { fontSize: 32, fontWeight: '800' },
  actRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomColor: t.edge, borderBottomWidth: 1 },
  actName: { flex: 1, color: t.ink, fontSize: 13.5 },
  actDate: { color: t.inkFaint, fontSize: 11.5 },
  actAmt: { fontSize: 13.5, fontWeight: '700', minWidth: 70, textAlign: 'right' },
});
