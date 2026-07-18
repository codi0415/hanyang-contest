import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useStore } from '../store/useStore';
import { colors } from '../theme';

function Stepper({
  value,
  label,
  onDec,
  onInc,
}: {
  value: string;
  label: string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <View style={styles.stepRow}>
      <Pressable style={styles.stepBtn} onPress={onDec} accessibilityLabel={`${label} 감소`}>
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={styles.stepVal}>{value}</Text>
      <Pressable style={styles.stepBtn} onPress={onInc} accessibilityLabel={`${label} 증가`}>
        <Text style={styles.stepBtnText}>＋</Text>
      </Pressable>
    </View>
  );
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, +v.toFixed(2)));

export function SettingsScreen({ insets }: { insets: { top: number; bottom: number } }) {
  const settings = useStore((s) => s.settings);
  const patch = useStore((s) => s.patchSettings);

  return (
    <LinearGradient colors={['#fff8f2', '#fff1e6']} style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 18, paddingBottom: insets.bottom + 100 }}>
        <Text style={styles.title}>설정</Text>

        <Row label="음성 안내">
          <Switch value={settings.voice} onValueChange={(v) => patch({ voice: v })} trackColor={{ true: colors.warm2 }} />
        </Row>
        <Row label="진동 안내">
          <Switch value={settings.haptic} onValueChange={(v) => patch({ haptic: v })} trackColor={{ true: colors.warm2 }} />
        </Row>

        <ColRow label="음성 속도" val={`${settings.rate.toFixed(1)}×`}>
          <Stepper
            label="음성 속도"
            value={`${settings.rate.toFixed(1)}×`}
            onDec={() => patch({ rate: clamp(settings.rate - 0.1, 0.6, 1.8) })}
            onInc={() => patch({ rate: clamp(settings.rate + 0.1, 0.6, 1.8) })}
          />
        </ColRow>
        <ColRow label="음성 볼륨" val={`${Math.round(settings.volume * 100)}%`}>
          <Stepper
            label="음성 볼륨"
            value={`${Math.round(settings.volume * 100)}%`}
            onDec={() => patch({ volume: clamp(settings.volume - 0.1, 0, 1) })}
            onInc={() => patch({ volume: clamp(settings.volume + 0.1, 0, 1) })}
          />
        </ColRow>

        <ColRow label="감지 신뢰도 임계값" val={`${Math.round(settings.conf * 100)}%`}>
          <Stepper
            label="감지 신뢰도 임계값"
            value={`${Math.round(settings.conf * 100)}%`}
            onDec={() => patch({ conf: clamp(settings.conf - 0.05, 0.3, 0.9) })}
            onInc={() => patch({ conf: clamp(settings.conf + 0.05, 0.3, 0.9) })}
          />
          <Text style={styles.hint}>이 값보다 확신이 낮은 감지는 "확인 필요"로 표시하고 음성으로 단정하지 않아요.</Text>
        </ColRow>

        <Row label="서버 연결 (끄면 Mock)">
          <Switch value={settings.live} onValueChange={(v) => patch({ live: v })} trackColor={{ true: colors.warm2 }} />
        </Row>
        <View style={[styles.card, styles.colCard]}>
          <Text style={styles.label}>서버 주소</Text>
          <TextInput
            style={styles.input}
            value={settings.wsUrl}
            onChangeText={(t) => patch({ wsUrl: t })}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
          <Text style={styles.hint}>데모 서버가 없으면 서버 연결을 꺼서 Mock 데이터로 동작하세요.</Text>
        </View>

        <View style={[styles.card, styles.disabled]}>
          <Text style={styles.label}>보호자 연락처 관리</Text>
          <Text style={styles.chev}>›</Text>
        </View>
        <View style={[styles.card, styles.disabled]}>
          <Text style={styles.label}>티맵 내비 연동  ·  향후 확장</Text>
          <Text style={styles.chev}>›</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}
function ColRow({ label, val, children }: { label: string; val: string; children: React.ReactNode }) {
  return (
    <View style={[styles.card, styles.colCard]}>
      <View style={styles.colHead}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.val}>{val}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: 23, fontWeight: '800', color: colors.ink, marginTop: 8, marginBottom: 18 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  colCard: { flexDirection: 'column', alignItems: 'stretch', gap: 12 },
  colHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  disabled: { opacity: 0.55 },
  label: { fontSize: 15, fontWeight: '700', color: colors.ink },
  val: { fontSize: 14, fontWeight: '700', color: colors.warm2 },
  hint: { fontSize: 12, lineHeight: 18, color: 'rgba(58,36,22,0.55)' },
  chev: { fontSize: 16, color: 'rgba(58,36,22,0.4)' },
  input: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(58,36,22,0.15)',
    backgroundColor: 'rgba(255,255,255,0.7)',
    color: colors.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stepBtn: {
    width: 48,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,122,89,0.15)',
  },
  stepBtnText: { fontSize: 22, fontWeight: '800', color: colors.warm2 },
  stepVal: { fontSize: 16, fontWeight: '800', color: colors.ink },
});
