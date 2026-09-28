import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { findCategory } from './categories';
import { useTheme } from './theme';

export default function TransactionRow({ item, categories, onPress }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const cat = findCategory(categories, item.category);
  const sign = item.type === 'income' ? '+' : '−';
  const amountColor = item.type === 'income' ? t.gain : t.spend;

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={[styles.colorBar, { backgroundColor: cat.color }]} />
      <View style={styles.left}>
        <Text style={styles.tag} numberOfLines={1}>{cat.icon} {cat.label}</Text>
        {!!item.note && <Text style={styles.note} numberOfLines={1} ellipsizeMode="tail">{item.note}</Text>}
      </View>
      <Text style={[styles.amount, { color: amountColor }]} numberOfLines={1}>{sign}₱{item.amount.toFixed(2)}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (t) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingRight: 20, paddingLeft: 12, borderBottomColor: t.edge, borderBottomWidth: 1 },
  colorBar: { width: 3, alignSelf: 'stretch', borderRadius: 2, marginRight: 12 },
  left: { flex: 1, marginRight: 12 },
  tag: { color: t.ink, fontSize: 14.5 },
  note: { color: t.inkFaint, fontSize: 12.5, marginTop: 3 },
  amount: { fontSize: 16, fontWeight: '600', flexShrink: 0 },
});