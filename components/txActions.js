// Shared add / edit / delete for transactions, with feedback (toast, haptics, Undo).
import { useCallback } from 'react';
import { addTransaction, deleteTransaction, updateTransaction } from './storage';
import { findCategory } from './categories';
import { limitCrossings } from './overLimit';
import { peso } from './format';
import { useToast } from './toast';
import * as haptic from './haptics';

const KIND_WORD = { daily: 'daily', weekly: 'weekly', monthly: 'monthly' };

export function useTxActions(categories, setTransactions, onLimitCrossed) {
  const toast = useToast();

  const add = useCallback(async (tx) => {
    const list = await addTransaction(tx);
    setTransactions(list);
    const cat = findCategory(categories, tx.category);
    const crossings = limitCrossings(list, categories, tx);
    const over = crossings.find((c) => c.level === 'over');
    const near = crossings.find((c) => c.level === 'near');
    const undo = { actionLabel: 'Undo', onAction: async () => setTransactions(await deleteTransaction(tx.id)) };
    if (over) {
      haptic.warning();
      toast.show(`⚠️ ${cat.icon} ${cat.label} is over its ${KIND_WORD[over.kind]} limit (${peso(over.spent, 0)} of ${peso(over.limit, 0)})`, { ...undo, duration: 6000 });
    } else if (near) {
      haptic.success();
      toast.show(`${cat.icon} ${cat.label}: ${Math.round((near.spent / near.limit) * 100)}% of the ${KIND_WORD[near.kind]} limit used`, undo);
    } else {
      haptic.success();
      toast.show(`Saved ${tx.type === 'income' ? '+' : '−'}${peso(tx.amount, 2)} · ${cat.icon} ${cat.label}`, undo);
    }
    if (crossings.length && onLimitCrossed) onLimitCrossed(cat, crossings);
    return list;
  }, [categories, setTransactions, toast, onLimitCrossed]);

  const remove = useCallback(async (id, allTransactions) => {
    const tx = (allTransactions || []).find((x) => x.id === id);
    setTransactions(await deleteTransaction(id));
    haptic.bump();
    if (tx) toast.show('Entry deleted', { actionLabel: 'Undo', onAction: async () => setTransactions(await addTransaction(tx)) });
  }, [setTransactions, toast]);

  const edit = useCallback(async (id, changes) => {
    setTransactions(await updateTransaction(id, changes));
    haptic.success();
    toast.show('Changes saved');
  }, [setTransactions, toast]);

  return { add, remove, edit };
}
