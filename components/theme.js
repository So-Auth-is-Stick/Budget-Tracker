import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const THEMES = {
  // ---- dark ----
  midnight: { name: 'Midnight', isDark: true, bg: '#0F1A18', surface: '#16241F', surface2: '#1D2E27', edge: '#2A3B34', ink: '#F4EFE6', inkDim: '#9FB0A8', inkFaint: '#5E6F68', accent: '#E8B84B', onAccent: '#1B1200', gain: '#7FC29B', spend: '#D97A55' },
  ocean: { name: 'Ocean', isDark: true, bg: '#0B1524', surface: '#12213A', surface2: '#1A2D4D', edge: '#27406B', ink: '#E8F0FF', inkDim: '#93A8C9', inkFaint: '#5A7096', accent: '#4FC3F7', onAccent: '#04202E', gain: '#6FD6A5', spend: '#FF8A80' },
  amethyst: { name: 'Amethyst', isDark: true, bg: '#15101F', surface: '#201835', surface2: '#2B2147', edge: '#3D3163', ink: '#F1EAFF', inkDim: '#A99BC9', inkFaint: '#6C5F91', accent: '#B794F6', onAccent: '#1A0B33', gain: '#7FD6A5', spend: '#F28B82' },
  sunset: { name: 'Sunset', isDark: true, bg: '#1C1210', surface: '#2A1B17', surface2: '#382520', edge: '#52352C', ink: '#FFEFE5', inkDim: '#C9A595', inkFaint: '#8A6A5C', accent: '#FF9E5E', onAccent: '#2A1100', gain: '#8FD694', spend: '#FF6B6B' },
  forest: { name: 'Forest', isDark: true, bg: '#0C140E', surface: '#132018', surface2: '#1A2B20', edge: '#27402F', ink: '#EAF5EC', inkDim: '#98B5A0', inkFaint: '#5C7864', accent: '#9BE15D', onAccent: '#0E1A04', gain: '#5FD3A0', spend: '#FF8F6B' },
  mocha: { name: 'Mocha', isDark: true, bg: '#17110D', surface: '#221913', surface2: '#2E221A', edge: '#463428', ink: '#F5EBE0', inkDim: '#BFA996', inkFaint: '#806B5A', accent: '#D9A066', onAccent: '#241304', gain: '#A3C98A', spend: '#E57F6A' },
  graphite: { name: 'Graphite', isDark: true, bg: '#111214', surface: '#1A1C1F', surface2: '#24272B', edge: '#34383E', ink: '#F2F3F5', inkDim: '#A3A8B0', inkFaint: '#666B73', accent: '#F2F3F5', onAccent: '#111214', gain: '#6FD39A', spend: '#FF7A7A' },
  nord: { name: 'Nord', isDark: true, bg: '#20252E', surface: '#2A303B', surface2: '#333B48', edge: '#434C5E', ink: '#ECEFF4', inkDim: '#AEB7C6', inkFaint: '#717C8F', accent: '#88C0D0', onAccent: '#14232A', gain: '#A3BE8C', spend: '#D08770' },
  neon: { name: 'Neon', isDark: true, bg: '#0D0716', surface: '#170D26', surface2: '#221338', edge: '#3A2160', ink: '#FBEFFF', inkDim: '#BBA0D6', inkFaint: '#7A5E99', accent: '#FF4FD8', onAccent: '#2A0022', gain: '#3DF5C4', spend: '#FF6F91' },
  cyber: { name: 'Cyber', isDark: true, bg: '#0A0C0A', surface: '#121612', surface2: '#1A201A', edge: '#2A332A', ink: '#EFFFE9', inkDim: '#A2B89C', inkFaint: '#617060', accent: '#C6FF3D', onAccent: '#162200', gain: '#55F2A8', spend: '#FF5C7A' },
  // ---- light ----
  daylight: { name: 'Daylight', isDark: false, bg: '#F3EFE4', surface: '#FFFFFF', surface2: '#EAE3D3', edge: '#DCD3BE', ink: '#1B241F', inkDim: '#5C6B62', inkFaint: '#93A197', accent: '#B9862A', onAccent: '#FFFFFF', gain: '#2F8F5B', spend: '#B9502F' },
  sakura: { name: 'Sakura', isDark: false, bg: '#FBF1F3', surface: '#FFFFFF', surface2: '#F5E1E6', edge: '#EBCBD3', ink: '#3A1F27', inkDim: '#7D5A66', inkFaint: '#B393A0', accent: '#D6537A', onAccent: '#FFFFFF', gain: '#3E9A6B', spend: '#C2452F' },
  matcha: { name: 'Matcha', isDark: false, bg: '#EFF3E6', surface: '#FFFFFF', surface2: '#E1E9D2', edge: '#CCD8B8', ink: '#1E2A16', inkDim: '#5B6B4E', inkFaint: '#93A285', accent: '#5E8F2E', onAccent: '#FFFFFF', gain: '#2F8F5B', spend: '#C0533A' },
  lavender: { name: 'Lavender', isDark: false, bg: '#F3F0FA', surface: '#FFFFFF', surface2: '#E7E1F5', edge: '#D5CCEC', ink: '#251D3A', inkDim: '#665C82', inkFaint: '#A39BBD', accent: '#7C5CD6', onAccent: '#FFFFFF', gain: '#2E8F6A', spend: '#C24B5A' },
  sky: { name: 'Sky', isDark: false, bg: '#EEF5FB', surface: '#FFFFFF', surface2: '#DDEBF6', edge: '#C6DCEE', ink: '#13253A', inkDim: '#4F6680', inkFaint: '#8EA3BA', accent: '#2A7BD5', onAccent: '#FFFFFF', gain: '#1E8C66', spend: '#C8483C' },
  peach: { name: 'Peach', isDark: false, bg: '#FFF3EC', surface: '#FFFFFF', surface2: '#FBE3D6', edge: '#F2CDB9', ink: '#3A2116', inkDim: '#7F5A49', inkFaint: '#B8968A', accent: '#E8743B', onAccent: '#FFFFFF', gain: '#3A8F55', spend: '#C23B3B' },
  mono: { name: 'Mono', isDark: false, bg: '#F5F5F5', surface: '#FFFFFF', surface2: '#EAEAEA', edge: '#D6D6D6', ink: '#111111', inkDim: '#555555', inkFaint: '#999999', accent: '#111111', onAccent: '#FFFFFF', gain: '#1F7A4D', spend: '#B3261E' },
  sand: { name: 'Sand', isDark: false, bg: '#F6F0E6', surface: '#FFFDF9', surface2: '#EDE3D2', edge: '#DDCFB8', ink: '#2B2318', inkDim: '#6B5D49', inkFaint: '#A8997F', accent: '#2F6F6A', onAccent: '#FFFFFF', gain: '#2F7F4F', spend: '#B04A32' },
};

export const THEME_ORDER = ['midnight', 'ocean', 'amethyst', 'sunset', 'forest', 'mocha', 'graphite', 'nord', 'neon', 'cyber',
  'daylight', 'sakura', 'matcha', 'lavender', 'sky', 'peach', 'mono', 'sand'];

// Picks dark or light text depending on how bright a color is
export function readableOn(hex) {
  const n = parseInt(hex.slice(1, 7), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#1B1200' : '#FFFFFF';
}

const STORAGE_KEY = 'budget_theme';
export const ACCENT_KEY = 'budget_accent';
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [themeKey, setKey] = useState('system');
  const [accent, setAccentState] = useState(null); // custom accent colour laid over any theme
  const [ready, setReady] = useState(false);

  const load = () => AsyncStorage.multiGet([STORAGE_KEY, ACCENT_KEY]).then(([[, v], [, a]]) => {
    if (v === 'system' || THEMES[v]) setKey(v);
    setAccentState(a && /^#[0-9A-Fa-f]{6}$/.test(a) ? a : null);
  });
  useEffect(() => { load().finally(() => setReady(true)); }, []);

  const setThemeKey = (k) => { setKey(k); AsyncStorage.setItem(STORAGE_KEY, k); };
  const setAccent = (c) => { setAccentState(c); if (c) AsyncStorage.setItem(ACCENT_KEY, c); else AsyncStorage.removeItem(ACCENT_KEY); };

  const resolved = themeKey === 'system' ? (system === 'light' ? 'daylight' : 'midnight') : themeKey;
  const base = THEMES[resolved] || THEMES.midnight;
  const theme = useMemo(() => (accent ? { ...base, accent, onAccent: readableOn(accent) } : base), [base, accent]);
  const value = useMemo(() => ({ theme, themeKey, setThemeKey, accent, setAccent, reloadTheme: load }), [theme, themeKey, accent]);

  if (!ready) return null; // avoids a flash of the wrong theme on launch
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
