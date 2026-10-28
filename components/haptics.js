// Small vibrations for feedback. Silently does nothing where unsupported or switched off.
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { getPrefs } from './prefs';

const on = () => Platform.OS !== 'web' && getPrefs().haptics;
const safe = (fn) => { try { if (on()) fn(); } catch (e) {} };

export const tap = () => safe(() => Haptics.selectionAsync());
export const bump = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const success = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const warning = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
export const error = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
