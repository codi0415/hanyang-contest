import * as Speech from 'expo-speech';

/*
 * 음성 안내 우선순위 큐.
 * 우선순위(숫자 클수록 우선) — 확정 정책: 근접 장애물 > 점자블록 이탈:
 *   3 근접 장애물 (즉시 새치기)
 *   2 점자블록 이탈
 *   1 신호등(임계값 이상, 향후 색상 기능용)
 *   0 중거리 장애물 / 기타
 * 같은 문장 반복은 디바운스로 억제한다.
 */
export type AnnounceKind = 'deviation' | 'obstacleNear' | 'traffic' | 'obstacleMid' | 'info';

const PRIORITY: Record<AnnounceKind, number> = {
  obstacleNear: 3,
  deviation: 2,
  traffic: 1,
  obstacleMid: 0,
  info: 0,
};

class AnnouncementQueue {
  private enabled = true;
  private rate = 1.0;
  private volume = 1.0;
  private current: { level: number; text: string } | null = null;
  private lastAt = new Map<string, number>();
  private readonly DEBOUNCE = 3500;

  setEnabled(v: boolean) {
    this.enabled = v;
    if (!v) {
      Speech.stop();
      this.current = null;
    }
  }
  setRate(r: number) { this.rate = r; }
  setVolume(v: number) { this.volume = v; }

  private speakNow(level: number, text: string) {
    this.current = { level, text };
    this.lastAt.set(text, Date.now());
    Speech.stop(); // 브라우저/네이티브 큐를 직접 관리하므로 항상 초기화 후 재생
    const clear = () => {
      if (this.current && this.current.text === text) this.current = null;
    };
    Speech.speak(text, {
      language: 'ko-KR',
      rate: this.rate,
      volume: this.volume,
      onDone: clear,
      onStopped: clear,
      onError: clear,
    });
  }

  announce(kind: AnnounceKind, text: string) {
    if (!this.enabled || !text) return;
    const level = PRIORITY[kind] ?? 0;

    const last = this.lastAt.get(text);
    if (last && Date.now() - last < this.DEBOUNCE) return;

    if (!this.current) {
      this.speakNow(level, text);
      return;
    }
    if (level > this.current.level) {
      this.speakNow(level, text); // 새치기
    }
    // 같거나 낮으면 무시 (놓친 안내는 다음 프레임에서 다시 요청됨)
  }

  stop() {
    Speech.stop();
    this.current = null;
  }
}

export const TTS = new AnnouncementQueue();
