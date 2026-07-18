import { BlurView } from 'expo-blur';
import { StyleSheet, Text, View } from 'react-native';
import { Deviation, Detection } from '../types';
import { RISK_KO, colors } from '../theme';

export function ObstacleAlertCard({
  top,
  deviation,
  anyCount,
  bottom,
}: {
  top: Detection | null;
  deviation: Deviation;
  anyCount: number;
  bottom: number;
}) {
  let title: string;
  let desc: string;
  let icon: string;
  let iconBg: string;
  let borderColor = 'rgba(255,255,255,0.3)';

  if (top) {
    const near = top.risk === 'near';
    icon = near ? '!' : top.chip;
    title = `전방에 ${top.name}${near ? '이(가) 가까이' : ''} 있어요`;
    desc = `${RISK_KO[top.risk]} · 신뢰도 ${top.confPct}% (추정 거리)`;
    iconBg = near ? '#ff5c5c' : '#ff8a5c';
    if (near) borderColor = 'rgba(255,92,92,0.6)';
  } else {
    icon = '✓';
    iconBg = colors.safe;
    title = deviation === 'normal' ? '전방이 안전해요' : '경로를 확인하세요';
    desc = anyCount > 0 ? '감지된 물체가 멀리 있어요' : '감지되면 바로 알려드릴게요';
  }

  return (
    <BlurView intensity={30} tint="light" style={[styles.card, { bottom, borderColor }]}>
      <View style={[styles.icon, { backgroundColor: iconBg }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{desc}</Text>
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
    padding: 18,
    paddingHorizontal: 20,
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  body: { flex: 1 },
  title: { fontSize: 17, fontWeight: '800', color: '#fff' },
  desc: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
});
