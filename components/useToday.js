import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { todayStr } from './dateUtils';

// Re-reads "today" when the app returns to the foreground and once a minute,
// so screens roll over to the new day without restarting the app.
export function useToday() {
  const [today, setToday] = useState(todayStr());
  useEffect(() => {
    const refresh = () => setToday(todayStr());
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    const timer = setInterval(refresh, 60000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);
  return today;
}
