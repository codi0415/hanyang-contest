import { BlurView } from 'expo-blur';
import { StyleSheet, Text, View } from 'react-native';
import { Deviation } from '../types';
import { colors } from '../theme';

export function StatusPill({ deviation, top }: { deviation: Deviation; top: number }) {
  const normal = deviation === 'normal';
  const goRight = deviation === 'left';
  const text = normal ? '안전 — 이동 가능' : goRight ? '왼쪽으로 벗어남' : '오른쪽으로 벗어남';
  const dotColor = normal ? colors.safe : colors.warn;
  return (
    <View style={[styles.wrap, { top }]} pointerEvents="box-none">
      <BlurView intensity={30} tint="light" style={styles.pill}>
        <View style={[styles.dot, { backgroundColor: dotColor, shadowColor: dotColor }]} />
        <Text style={styles.text}>{text}</Text>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 5 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  dot: { width: 9, height: 9, borderRadius: 5, shadowOpacity: 0.9, shadowRadius: 6 },
  text: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
