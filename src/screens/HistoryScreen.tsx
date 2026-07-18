import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../store/useStore';
import { colors } from '../theme';

const RISK_ICON: Record<string, string> = { near: '●', mid: '▲', far: '■' };
const RISK_COLOR: Record<string, string> = { near: '#ff5c5c', mid: '#ff8a5c', far: '#ffb347' };

export function HistoryScreen({ insets }: { insets: { top: number; bottom: number } }) {
  const history = useStore((s) => s.history);
  return (
    <LinearGradient colors={['#fff8f2', '#fff1e6']} style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 18, paddingBottom: insets.bottom + 100 }}>
        <Text style={styles.title}>탐지 기록</Text>
        {history.length === 0 ? (
          <Text style={styles.empty}>아직 기록이 없어요.{'\n'}보행을 시작하면 여기에 쌓여요.</Text>
        ) : (
          history.map((it) => (
            <View key={it.id} style={styles.item}>
              <View style={[styles.icon, { backgroundColor: RISK_COLOR[it.risk] }]}>
                <Text style={styles.iconText}>{RISK_ICON[it.risk]}</Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.label}>{it.label}</Text>
                <Text style={styles.detail}>{it.detail}</Text>
              </View>
              <Text style={styles.time}>{it.time}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: 23, fontWeight: '800', color: colors.ink, marginTop: 8, marginBottom: 18 },
  empty: { textAlign: 'center', color: 'rgba(58,36,22,0.5)', fontSize: 14, lineHeight: 24, paddingVertical: 60 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  icon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  body: { flex: 1 },
  label: { fontSize: 15, fontWeight: '700', color: colors.ink },
  detail: { fontSize: 12, color: 'rgba(58,36,22,0.6)', marginTop: 2 },
  time: { fontSize: 11, color: 'rgba(58,36,22,0.45)' },
});
