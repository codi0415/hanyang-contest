import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

import { useDetectionSource } from '../perception/useDetectionSource';
import { StatusPill } from '../components/StatusPill';
import { TrafficLightCard } from '../components/TrafficLightCard';
import { DetectionChips } from '../components/DetectionChips';
import { ObstacleAlertCard } from '../components/ObstacleAlertCard';
import { BoundingBoxOverlay } from '../components/BoundingBoxOverlay';
import { colors } from '../theme';

export function ActiveWalkScreen({ insets }: { insets: { top: number; bottom: number } }) {
  const cameraRef = useRef<Camera | null>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  const state = useDetectionSource(cameraRef, true);
  const onLayout = (e: LayoutChangeEvent) =>
    setLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });

  const showCamera = hasPermission && !!device;

  return (
    <View style={styles.root} onLayout={onLayout}>
      {showCamera ? (
        <Camera ref={cameraRef} style={StyleSheet.absoluteFill} device={device} isActive photo />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholderBg]}>
          <Text style={styles.placeholder}>카메라 프리뷰{'\n'}<Text style={styles.placeholderSub}>(권한 허용 시 실시간 영상)</Text></Text>
        </View>
      )}

      {/* 따뜻한 톤 오버레이 */}
      <LinearGradient
        colors={['rgba(255,179,71,0.22)', 'transparent', 'rgba(255,92,138,0.22)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* 바운딩 박스 */}
      <BoundingBoxOverlay dets={state.dets} frameSize={state.frameSize} layout={layout} />

      {/* 상단: 이탈 상태 + 연결 배지 + 신호등 */}
      <StatusPill deviation={state.deviation} top={insets.top + 8} />
      <View style={[styles.conn, { top: insets.top + 10 }, connStyle(state.conn)]}>
        <Text style={styles.connText}>{connLabel(state.conn)}</Text>
      </View>
      <TrafficLightCard traffic={state.traffic} top={insets.top + 50} />

      {/* 이탈 방향 화살표 */}
      {state.deviation !== 'normal' && (
        <View style={styles.dirHint} pointerEvents="none">
          <Text style={styles.dirArrow}>{state.deviation === 'left' ? '→' : '←'}</Text>
        </View>
      )}

      {/* 하단: 감지 칩 + 안내 카드 */}
      <DetectionChips dets={state.dets} bottom={insets.bottom + 190} />
      <ObstacleAlertCard
        top={state.topObstacle}
        deviation={state.deviation}
        anyCount={state.dets.length}
        bottom={insets.bottom + 96}
      />
    </View>
  );
}

function connLabel(c: string) {
  return c === 'live' ? '실시간' : c === 'mock' ? 'MOCK' : c === 'connecting' ? '연결 중' : '오프라인';
}
function connStyle(c: string) {
  if (c === 'live') return { backgroundColor: 'rgba(61,220,132,0.9)' };
  if (c === 'mock') return { backgroundColor: 'rgba(255,179,71,0.9)' };
  return { backgroundColor: 'rgba(0,0,0,0.35)' };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.camBg },
  placeholderBg: { backgroundColor: colors.camBg, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 22 },
  placeholderSub: { color: 'rgba(255,255,255,0.32)', fontWeight: '400' },
  conn: { position: 'absolute', right: 16, zIndex: 5, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8 },
  connText: { fontSize: 10, fontWeight: '700', color: '#3a2416' },
  dirHint: {
    position: 'absolute',
    top: '42%',
    alignSelf: 'center',
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,122,89,0.32)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    zIndex: 5,
  },
  dirArrow: { fontSize: 56, fontWeight: '800', color: '#fff' },
});
