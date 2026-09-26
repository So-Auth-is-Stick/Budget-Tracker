import { useState } from 'react';
import PinScreen from './components/PinScreen';
import FeedScreen from './components/FeedScreen';

export default function App() {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return <PinScreen onUnlock={() => setUnlocked(true)} />;
  }

  return <FeedScreen />;
} 