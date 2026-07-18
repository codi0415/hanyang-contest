import { BlurView } from 'expo-blur';
import { StyleSheet, Text, View } from 'react-native';
import { Detection } from '../types';

export function TrafficLightCard({ traffic, top }: { traffic: Detection | null; top: number }) {
  if (!traffic) return null;
  const uncertain = traffic.below || traffic.sub === 'unknown';
  const red = !uncertain && traffic.sub === 'red';
  const green = !uncertain && traffic.sub === 'green';

  const title = uncertain
    ? '신호 판단 불가 · 직접 확인하세요'
    : red
      ? `빨간불 · 멈추세요 (신뢰도 ${traffic.confPct}%)`
      : `초록불 · 확인 후 건너세요 (신뢰도 ${traffic.confPct}%)`;

  const tint = red ? 'rgba(120,24,24,0.5)' : green ? 'rgba(16,86,50,0.5)' : 'rgba(42,42,46,0.6)';
  const border = red ? 'rgba(255,92,92,0.6)' : green ? 'rgba(61,220,132,0.6)' : 'rgba(255,255,255,0.2)';

  return (
    <BlurView intensity={30} tint="dark" style={[styles.card, { top, backgroundColor: tint, borderColor: border }]}>
      <View style={styles.lights}>
        <View style={[styles.dot, red && styles.redOn]} />
        <View style={[styles.dot, green && styles.greenOn]} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>AI 보조 정보 · 최종 확인은 직접 하세요</Text>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  lights: { gap: 5, padding: 6, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.4)' },
  dot: { width: 15, height: 15, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.14)' },
  redOn: { backgroundColor: '#ff4d4d', shadowColor: '#ff4d4d', shadowOpacity: 1, shadowRadius: 8 },
  greenOn: { backgroundColor: '#3ddc84', shadowColor: '#3ddc84', shadowOpacity: 1, shadowRadius: 8 },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.72)', marginTop: 2 },
});
