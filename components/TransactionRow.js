import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { findCategory } from './categories';
import { formatLong } from './dateUtils';
import { useTheme } from './theme';
import { peso } from './format';
import { imageUri } from './imageStore';

// The picture behind an entry, in one of three looks: fade / glass / clear
export function EntryBackdrop({ image, look = 'fade', bg, onError }) {
  const uri = imageUri(image);
  if (!uri) return null;
  const clear = (a) => bg + a; // bg is a #RRGGBB theme colour; append alpha
  if (look === 'glass') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={22} transition={250} onError={onError} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: clear('85') }]} />
      </View>
    );
  }
  if (look === 'clear') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} onError={onError} />
        <LinearGradient colors={['rgba(0,0,0,0.72)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.55)']} locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </View>
    );
  }
  // fade: the picture takes the right ~40% and melts into the card
  return (
    <View style={styles0.fadeWrap} pointerEvents="none">
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} onError={onError} />
      <LinearGradient colors={[clear('FF'), clear('CC'), clear('33'), clear('00')]} locations={[0, 0.3, 0.75, 1]}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}

export default function TransactionRow({ item, categories, onPress, showDate, warnings }) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [broken, setBroken] = useState(false); // picture file missing (e.g. restored on a new phone)
  const cat = findCategory(categories, item.category);
  const sign = item.type === 'income' ? '+' : '−';
  const hasImage = !!item.image && !broken;
  const look = item.imageLook || 'fade';
  const onPhoto = hasImage && look === 'clear';
  const amountColor = item.type === 'income' ? t.gain : t.spend;
  const ink = onPhoto ? '#FFFFFF' : t.ink;
  const dim = onPhoto ? 'rgba(255,255,255,0.82)' : t.inkFaint;

  return (
    <TouchableOpacity style={[styles.row, hasImage && styles.imageRow]} onPress={() => onPress(item)} activeOpacity={0.75}>
      {hasImage && <EntryBackdrop image={item.image} look={look} bg={hasImage ? t.surface : t.bg} onError={() => setBroken(true)} />}
      <View style={[styles.colorBar, { backgroundColor: cat.color }]} />
      <View style={styles.left}>
        <Text style={[styles.tag, { color: ink }, onPhoto && styles.shadow]} numberOfLines={1}>{cat.icon} {cat.label}</Text>
        {!!item.note && <Text style={[styles.note, { color: dim }, onPhoto && styles.shadow]} numberOfLines={1} ellipsizeMode="tail">{item.note}</Text>}
        {showDate && <Text style={[styles.date, { color: dim }]}>{formatLong(item.date)}</Text>}
        {!!warnings && warnings.length > 0 && (
          <Text style={[styles.warn, onPhoto && { color: '#FFB4A2' }]}>⚠️ Over {warnings.join(' + ')} limit</Text>
        )}
      </View>
      <View style={[styles.amountPill, hasImage && { backgroundColor: onPhoto ? 'rgba(0,0,0,0.35)' : t.surface + 'D9' }]}>
        <Text style={[styles.amount, { color: onPhoto ? (item.type === 'income' ? '#9FF0C0' : '#FFB4A2') : amountColor }]} numberOfLines={1}>{sign}{peso(item.amount, 2)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles0 = StyleSheet.create({
  fadeWrap: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '42%' },
});

const makeStyles = (t) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingRight: 20, paddingLeft: 12, borderBottomColor: t.edge, borderBottomWidth: 1, overflow: 'hidden' },
  imageRow: { marginHorizontal: 12, marginVertical: 5, borderRadius: 18, borderBottomWidth: 0, minHeight: 78, paddingRight: 12, backgroundColor: t.surface },
  colorBar: { width: 3, alignSelf: 'stretch', borderRadius: 2, marginRight: 12 },
  left: { flex: 1, marginRight: 12 },
  tag: { fontSize: 14.5 },
  note: { fontSize: 12.5, marginTop: 3 },
  date: { fontSize: 11.5, marginTop: 3 },
  warn: { color: t.spend, fontSize: 11.5, marginTop: 3, fontWeight: '600' },
  amountPill: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 8, flexShrink: 0 },
  amount: { fontSize: 16, fontWeight: '700' },
  shadow: { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
});
