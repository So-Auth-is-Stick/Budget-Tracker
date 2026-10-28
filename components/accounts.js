// Optional accounts (Cash, GCash, Bank...). Off until the first account is created.
// Entries without an account belong to the default (first) account, so older data just works.
// Moving money between accounts is stored separately as "transfers", so it never counts as spending.
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ACCOUNTS_KEY = 'budget_accounts';
export const TRANSFERS_KEY = 'budget_transfers';
export const ACCOUNT_PRESETS = [
  { icon: '💵', label: 'Cash', color: '#7FC29B' },
  { icon: '📱', label: 'GCash', color: '#42A5F5' },
  { icon: '📲', label: 'Maya', color: '#26A69A' },
  { icon: '🏦', label: 'Bank', color: '#5C6BC0' },
  { icon: '💳', label: 'Card', color: '#AB47BC' },
  { icon: '🐷', label: 'Savings', color: '#EC407A' },
];

const read = async (k) => { const raw = await AsyncStorage.getItem(k); return raw ? JSON.parse(raw) : []; };
const write = async (k, v) => { await AsyncStorage.setItem(k, JSON.stringify(v)); return v; };

export const defaultAccountId = (accounts) => (accounts.find((a) => a.isDefault) || accounts[0] || {}).id;
export const accountOf = (tx, accounts) => {
  if (!accounts.length) return null;
  return tx.account && accounts.some((a) => a.id === tx.account) ? tx.account : defaultAccountId(accounts);
};

// { [accountId]: balance }
export function accountBalances(accounts, transactions, transfers) {
  const out = {};
  accounts.forEach((a) => { out[a.id] = 0; });
  if (!accounts.length) return out;
  transactions.forEach((tx) => {
    const id = accountOf(tx, accounts);
    out[id] += tx.type === 'income' ? tx.amount : -tx.amount;
  });
  transfers.forEach((tr) => {
    if (out[tr.from] !== undefined) out[tr.from] -= tr.amount;
    if (out[tr.to] !== undefined) out[tr.to] += tr.amount;
  });
  Object.keys(out).forEach((k) => { out[k] = Math.round(out[k] * 100) / 100; });
  return out;
}

const AccountsContext = createContext({ accounts: [], transfers: [] });

export function AccountsProvider({ children }) {
  const [accounts, setAccountsState] = useState([]);
  const [transfers, setTransfersState] = useState([]);

  const reload = useCallback(async () => {
    const [a, t] = await Promise.all([read(ACCOUNTS_KEY), read(TRANSFERS_KEY)]);
    setAccountsState(a); setTransfersState(t);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const saveAccounts = useCallback(async (list) => setAccountsState(await write(ACCOUNTS_KEY, list)), []);
  const addAccount = useCallback(async (acc) => {
    const list = await read(ACCOUNTS_KEY);
    return saveAccounts([...list, { id: 'acc_' + Date.now(), isDefault: list.length === 0, ...acc }]);
  }, [saveAccounts]);
  const updateAccount = useCallback(async (id, changes) => {
    const list = await read(ACCOUNTS_KEY);
    return saveAccounts(list.map((a) => (a.id === id ? { ...a, ...changes } : a)));
  }, [saveAccounts]);
  const makeDefault = useCallback(async (id) => {
    const list = await read(ACCOUNTS_KEY);
    return saveAccounts(list.map((a) => ({ ...a, isDefault: a.id === id })));
  }, [saveAccounts]);
  // Deleting moves its entries to the default account (by clearing their account) and drops its transfers
  const removeAccount = useCallback(async (id, transactionsApi) => {
    const list = await read(ACCOUNTS_KEY);
    const rest = list.filter((a) => a.id !== id);
    if (rest.length && !rest.some((a) => a.isDefault)) rest[0] = { ...rest[0], isDefault: true };
    await saveAccounts(rest);
    setTransfersState(await write(TRANSFERS_KEY, (await read(TRANSFERS_KEY)).filter((t) => t.from !== id && t.to !== id)));
    if (transactionsApi) await transactionsApi.clearAccount(id);
  }, [saveAccounts]);

  const addTransfer = useCallback(async (tr) => {
    const list = await read(TRANSFERS_KEY);
    setTransfersState(await write(TRANSFERS_KEY, [...list, { id: 'tr_' + Date.now(), ...tr }]));
  }, []);
  const deleteTransfer = useCallback(async (id) => {
    const list = await read(TRANSFERS_KEY);
    setTransfersState(await write(TRANSFERS_KEY, list.filter((t) => t.id !== id)));
  }, []);

  const value = useMemo(() => ({ accounts, transfers, reload, addAccount, updateAccount, makeDefault, removeAccount, addTransfer, deleteTransfer }),
    [accounts, transfers, reload, addAccount, updateAccount, makeDefault, removeAccount, addTransfer, deleteTransfer]);
  return <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>;
}

export const useAccounts = () => useContext(AccountsContext);
