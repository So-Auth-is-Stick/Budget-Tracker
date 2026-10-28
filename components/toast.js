// A small message bar above the tab bar, e.g. "Deleted · Undo" or "Saved ₱120 to Food".
import { createContext, useContext, useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './theme';

const ToastContext = createContext({ show: () => {} });

export function ToastProvider({ children }) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const hide = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setToast(null));
  }, [anim]);

  const show = useCallback((message, opts = {}) => {
    clearTimeout(timer.current);
    setToast({ message, ...opts, key: Date.now() });
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    timer.current = setTimeout(hide, opts.duration || (opts.actionLabel ? 5000 : 2400));
  }, [anim, hide]);

  useEffect(() => () => clearTimeout(timer.current), []);
  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) + 92, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}
        >
          <View style={[styles.bar, { backgroundColor: t.isDark ? t.ink : '#1F2622' }]}>
            <Text style={[styles.msg, { color: t.isDark ? t.bg : '#F4EFE6' }]} numberOfLines={2}>{toast.message}</Text>
            {toast.actionLabel && (
              <TouchableOpacity onPress={() => { toast.onAction && toast.onAction(); hide(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.action, { color: t.accent }]}>{toast.actionLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, maxWidth: 480, width: '100%', elevation: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  msg: { flex: 1, fontSize: 13.5 },
  action: { fontWeight: '700', fontSize: 13.5 },
});
