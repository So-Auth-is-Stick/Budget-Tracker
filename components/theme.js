import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const THEMES = {
  midnight: { name: 'Midnight', isDark: true, bg: '#0F1A18', surface: '#16241F', surface2: '#1D2E27', edge: '#2A3B34', ink: '#F4EFE6', inkDim: '#9FB0A8', inkFaint: '#5E6F68', accent: '#E8B84B', onAccent: '#1B1200', gain: '#7FC29B', spend: '#D97A55' },
  daylight: { name: 'Daylight', isDark: false, bg: '#F3EFE4', surface: '#FFFFFF', surface2: '#EAE3D3', edge: '#DCD3BE', ink: '#1B241F', inkDim: '#5C6B62', inkFaint: '#93A197', accent: '#B9862A', onAccent: '#FFFFFF', gain: '#2F8F5B', spend: '#B9502F' },
  ocean: { name: 'Ocean', isDark: true, bg: '#0B1524', surface: '#12213A', surface2: '#1A2D4D', edge: '#27406B', ink: '#E8F0FF', inkDim: '#93A8C9', inkFaint: '#5A7096', accent: '#4FC3F7', onAccent: '#04202E', gain: '#6FD6A5', spend: '#FF8A80' },
  amethyst: { name: 'Amethyst', isDark: true, bg: '#15101F', surface: '#201835', surface2: '#2B2147', edge: '#3D3163', ink: '#F1EAFF', inkDim: '#A99BC9', inkFaint: '#6C5F91', accent: '#B794F6', onAccent: '#1A0B33', gain: '#7FD6A5', spend: '#F28B82' },
  sakura: { name: 'Sakura', isDark: false, bg: '#FBF1F3', surface: '#FFFFFF', surface2: '#F5E1E6', edge: '#EBCBD3', ink: '#3A1F27', inkDim: '#7D5A66', inkFaint: '#B393A0', accent: '#D6537A', onAccent: '#FFFFFF', gain: '#3E9A6B', spend: '#C2452F' },
  sunset: { name: 'Sunset', isDark: true, bg: '#1C1210', surface: '#2A1B17', surface2: '#382520', edge: '#52352C', ink: '#FFEFE5', inkDim: '#C9A595', inkFaint: '#8A6A5C', accent: '#FF9E5E', onAccent: '#2A1100', gain: '#8FD694', spend: '#FF6B6B' },
};

export const THEME_ORDER = ['midnight', 'daylight', 'ocean', 'amethyst', 'sakura', 'sunset'];

// Picks dark or light text depending on how bright a color is
export function readableOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#1B1200' : '#FFFFFF';
}

const STORAGE_KEY = 'budget_theme';
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [themeKey, setKey] = useState('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => { if (v === 'system' || THEMES[v]) setKey(v); })
      .finally(() => setReady(true));
  }, []);

  const setThemeKey = (k) => { setKey(k); AsyncStorage.setItem(STORAGE_KEY, k); };
  const resolved = themeKey === 'system' ? (system === 'light' ? 'daylight' : 'midnight') : themeKey;
  const theme = THEMES[resolved] || THEMES.midnight;
  const value = useMemo(() => ({ theme, themeKey, setThemeKey }), [theme, themeKey]);

  if (!ready) return null; // avoids a flash of the wrong theme on launch
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
