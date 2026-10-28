// Small animations: bars that grow to their value, numbers that count to their value.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text } from 'react-native';

// Drop-in for a progress fill <View style={{ width: `${pct}%` }} />
export function GrowBar({ pct, style, delay = 0 }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: Math.max(0, Math.min(100, pct || 0)), duration: 650, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, delay, v]);
  return <Animated.View style={[style, { width: v.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />;
}

// Text that counts from its previous value to the new one; `format` turns the number into a string
export function CountUp({ value, format, style, duration = 600, ...rest }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value) return undefined;
    let raf;
    const t0 = Date.now();
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(start + (value - start) * eased);
      if (k < 1) raf = requestAnimationFrame(step); else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); from.current = value; };
  }, [value, duration]);
  return <Text style={style} {...rest}>{format(shown)}</Text>;
}
