import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { findCategory } from './categories';

export default function TransactionRow({ item, categories, onPress, onDelete }) {
  const cat = findCategory(categories, item.category);
  const sign = item.type === 'income' ? '+' : '−';
  const amountColor = item.type === 'income' ? '#7FC29B' : '#D97A55';

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={styles.topLine}>
        <Text style={styles.tag}>{cat.icon} {cat.label}</Text>
        {onDelete && (
          <TouchableOpacity onPress={() => onDelete(item.id)} hitSlop={8}>
            <Text style={styles.del}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      {!!item.note && (
        <Text style={styles.note} numberOfLines={1} ellipsizeMode="tail">
          {item.note}
        </Text>
      )}
      <Text style={[styles.amount, { color: amountColor }]}>
        {sign}₱{item.amount.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 12, paddingHorizontal: 20, borderBottomColor: '#2A3B34', borderBottomWidth: 1 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { color: '#F4EFE6', fontSize: 14.5 },
  del: { color: '#5E6F68', fontSize: 15 },
  note: { color: '#5E6F68', fontSize: 12.5, marginTop: 3 },
  amount: { fontSize: 16, marginTop: 6, fontWeight: '600' },
});