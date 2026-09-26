import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { findCategory } from './categories';

export default function TransactionRow({ item, categories, onPress }) {
  const cat = findCategory(categories, item.category);
  const sign = item.type === 'income' ? '+' : '−';
  const amountColor = item.type === 'income' ? '#7FC29B' : '#D97A55';

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={[styles.colorBar, { backgroundColor: cat.color }]} />
      <View style={styles.left}>
        <Text style={styles.tag} numberOfLines={1}>{cat.icon} {cat.label}</Text>
        {!!item.note && (
          <Text style={styles.note} numberOfLines={1} ellipsizeMode="tail">{item.note}</Text>
        )}
      </View>
      <Text style={[styles.amount, { color: amountColor }]} numberOfLines={1}>
        {sign}₱{item.amount.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingRight: 20, paddingLeft: 12,
    borderBottomColor: '#2A3B34', borderBottomWidth: 1,
  },
  colorBar: { width: 3, alignSelf: 'stretch', borderRadius: 2, marginRight: 12 },
  left: { flex: 1, marginRight: 12 },
  tag: { color: '#F4EFE6', fontSize: 14.5 },
  note: { color: '#5E6F68', fontSize: 12.5, marginTop: 3 },
  amount: { fontSize: 16, fontWeight: '600', flexShrink: 0 },
});