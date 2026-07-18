import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Detection } from '../types';

export function DetectionChips({ dets, bottom }: { dets: Detection[]; bottom: number }) {
  const groups = new Map<string, { d: Detection; n: number }>();
  for (const d of dets) {
    const key = `${d.name}|${d.below ? 'x' : 'o'}`;
    const g = groups.get(key);
    if (g) g.n++;
    else groups.set(key, { d, n: 1 });
  }
  const items = [...groups.values()];
  if (items.length === 0) return null;

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map(({ d, n }, i) => {
          const label = d.name + (n > 1 ? ` ×${n}` : '');
          return (
            <View
              key={i}
              style={[
                styles.chip,
                { borderColor: d.color },
                d.below && styles.dim,
              ]}
            >
              <Text style={styles.icon}>{d.chip}</Text>
              <Text style={styles.text}>{label}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 5 },
  row: { gap: 8, paddingRight: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderWidth: 1,
  },
  dim: { opacity: 0.6, borderStyle: 'dashed' },
  icon: { fontSize: 13 },
  text: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
