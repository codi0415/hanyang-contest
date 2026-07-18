import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function OnboardingScreen({ onStart }: { onStart: () => void }) {
  return (
    <LinearGradient colors={['#ff8558', '#ff6f6f']} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={styles.root}>
      <View style={styles.logo}>
        <View style={styles.logoDot} />
      </View>
      <Text style={styles.title}>가는 길을 더 안전하게</Text>
      <Text style={styles.sub}>카메라로 앞길의 장애물과 점자블록을 감지하고{'\n'}음성과 진동으로 미리 알려드려요</Text>
      <Pressable style={styles.start} onPress={onStart} accessibilityRole="button" accessibilityLabel="시작하기">
        <Text style={styles.startText}>시작하기</Text>
      </Pressable>
      <Text style={styles.note}>시작하면 카메라 접근 권한을 요청해요</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  logoDot: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.95)' },
  title: { fontSize: 27, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 14 },
  sub: { fontSize: 15, lineHeight: 26, color: 'rgba(255,255,255,0.92)', textAlign: 'center', marginBottom: 44 },
  start: {
    width: '100%',
    paddingVertical: 19,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  startText: { fontSize: 17, fontWeight: '800', color: '#e0562e' },
  note: { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 22, textAlign: 'center' },
});
