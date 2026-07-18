import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from './src/store/useStore';
import { TTS } from './src/tts/announcementQueue';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ActiveWalkScreen } from './src/screens/ActiveWalkScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TabBar } from './src/components/TabBar';

function Root() {
  const insets = useSafeAreaInsets();
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);
  const voice = useStore((s) => s.settings.voice);
  const rate = useStore((s) => s.settings.rate);
  const volume = useStore((s) => s.settings.volume);

  // 설정 → TTS 동기화
  useEffect(() => TTS.setEnabled(voice), [voice]);
  useEffect(() => TTS.setRate(rate), [rate]);
  useEffect(() => TTS.setVolume(volume), [volume]);

  const pad = { top: insets.top, bottom: insets.bottom };
  const light = screen === 'history' || screen === 'settings';

  return (
    <View style={styles.root}>
      {screen === 'onboarding' && <OnboardingScreen onStart={() => setScreen('main')} />}
      {screen === 'main' && <ActiveWalkScreen insets={pad} />}
      {screen === 'history' && <HistoryScreen insets={pad} />}
      {screen === 'settings' && <SettingsScreen insets={pad} />}

      {screen !== 'onboarding' && (
        <TabBar screen={screen} onGo={setScreen} light={light} bottom={insets.bottom + 16} />
      )}
      <StatusBar style={light ? 'dark' : 'light'} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#1a1410' } });
