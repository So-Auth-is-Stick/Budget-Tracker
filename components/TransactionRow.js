import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { findCategory } from './categories';
import { formatLong } from './dateUtils';
import { useTheme } from './theme';
import { peso } from './format';

export default function TransactionRow({ item, categories, onPress, showDate, warnings }) {
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
        {showDate && <Text style={styles.date}>{formatLong(item.date)}</Text>}
        {!!warnings && warnings.length > 0 && (
          <Text style={styles.warn}>⚠️ Over {warnings.join(' + ')} limit</Text>
        )}
      </View>
      <Text style={[styles.amount, { color: amountColor }]} numberOfLines={1}>{sign}{peso(item.amount, 2)}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (t) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingRight: 20, paddingLeft: 12, borderBottomColor: t.edge, borderBottomWidth: 1 },
  colorBar: { width: 3, alignSelf: 'stretch', borderRadius: 2, marginRight: 12 },
  left: { flex: 1, marginRight: 12 },
  tag: { color: t.ink, fontSize: 14.5 },
  note: { color: t.inkFaint, fontSize: 12.5, marginTop: 3 },
  date: { color: t.inkFaint, fontSize: 11.5, marginTop: 3 },
  warn: { color: t.spend, fontSize: 11.5, marginTop: 3, fontWeight: '600' },
  amount: { fontSize: 16, fontWeight: '600', flexShrink: 0 },
});
