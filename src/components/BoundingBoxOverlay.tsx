import { StyleSheet, Text, View } from 'react-native';
import { Detection, FrameSize } from '../types';

/*
 * 바운딩 박스 오버레이.
 * 좌표계 주의: 서버 좌표는 "전송한 프레임" 픽셀 기준.
 * 카메라 프리뷰가 화면을 cover(중앙 크롭)로 채우므로 동일한 cover 매핑으로 변환한다.
 */
export function BoundingBoxOverlay({
  dets,
  frameSize,
  layout,
}: {
  dets: Detection[];
  frameSize: FrameSize;
  layout: { width: number; height: number };
}) {
  const { width: pw, height: ph } = layout;
  const { w: fw, h: fh } = frameSize;
  if (!pw || !ph || !fw || !fh) return null;

  const scale = Math.max(pw / fw, ph / fh);
  const ox = (pw - fw * scale) / 2;
  const oy = (ph - fh * scale) / 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {dets.map((d, i) => {
        const left = ox + d.x1 * scale;
        const top = oy + d.y1 * scale;
        const width = (d.x2 - d.x1) * scale;
        const height = (d.y2 - d.y1) * scale;
        const label = d.below ? `${d.name} 확인필요` : `${d.name} ${d.confPct}%`;
        return (
          <View key={i} style={{ position: 'absolute', left, top, width, height }}>
            <View
              style={[
                styles.box,
                {
                  borderColor: d.color,
                  shadowColor: d.color,
                  borderStyle: d.below ? 'dashed' : 'solid',
                  borderWidth: !d.below && d.risk === 'near' && d.kind === 'obstacle' ? 4 : 3,
                },
              ]}
            />
            <View style={[styles.tag, { backgroundColor: d.color, top: -24 }]}>
              <Text style={styles.tagText} numberOfLines={1}>
                {label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    borderRadius: 12,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  tag: {
    position: 'absolute',
    left: 0,
    maxWidth: 220,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tagText: { fontSize: 13, fontWeight: '800', color: '#141210' },
});
