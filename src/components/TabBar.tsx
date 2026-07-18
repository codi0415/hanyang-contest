import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../store/useStore';
import { colors } from '../theme';

const TABS: { key: Exclude<Screen, 'onboarding'>; label: string }[] = [
  { key: 'main', label: '홈' },
  { key: 'history', label: '기록' },
  { key: 'settings', label: '설정' },
];

export function TabBar({
  screen,
  onGo,
  light,
  bottom,
}: {
  screen: Screen;
  onGo: (s: Screen) => void;
  light: boolean;
  bottom: number;
}) {
  return (
    <BlurView
      intensity={30}
      tint={light ? 'light' : 'default'}
      style={[styles.bar, { bottom }, light ? styles.barLight : styles.barDark]}
    >
      {TABS.map((t) => {
        const active = screen === t.key;
        const color = active
          ? light
            ? colors.warm2
            : '#fff'
          : light
            ? 'rgba(58,36,22,0.45)'
            : 'rgba(255,255,255,0.55)';
        return (
          <Pressable key={t.key} style={styles.tab} onPress={() => onGo(t.key)} accessibilityRole="tab" accessibilityLabel={t.label}>
            <Text style={[styles.label, { color }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 60,
    zIndex: 10,
    flexDirection: 'row',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  barDark: { backgroundColor: 'rgba(255,255,255,0.22)' },
  barLight: { backgroundColor: 'rgba(58,36,22,0.14)' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '700' },
});
