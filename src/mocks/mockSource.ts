import { ServerMessage } from '../types';

/*
 * 백엔드 없이 UI/음성 플로우를 검증하기 위한 모의 데이터.
 * 서버 스키마와 동일한 형태를 흘려보낸다. 좌표는 640×480 기준.
 */
const KINDS: { label: string; pos: 'top' | 'mid' | 'low' }[] = [
  { label: '사람', pos: 'mid' },
  { label: '기둥', pos: 'mid' },
  { label: '볼라드', pos: 'mid' },
  { label: '물웅덩이', pos: 'low' },
  { label: '계단(내려가는)', pos: 'low' },
  { label: '계단(올라가는)', pos: 'low' },
  { label: '보도블록', pos: 'low' },
];

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T,>(arr: T[]): T => arr[rand(0, arr.length - 1)];
const conf = (a: number, b: number) => +(a + Math.random() * (b - a)).toFixed(2);

function box(pos: 'top' | 'mid' | 'low', w: [number, number], h: [number, number]) {
  const bw = rand(w[0], w[1]);
  const bh = rand(h[0], h[1]);
  let y1 = pos === 'top' ? rand(24, 90) : pos === 'low' ? rand(230, 480 - bh - 10) : rand(120, 300);
  y1 = Math.max(10, Math.min(y1, 480 - bh - 10));
  const x1 = rand(20, 640 - bw - 20);
  return { x1, y1, x2: x1 + bw, y2: y1 + bh };
}

export const MOCK_FRAME_SIZE = { w: 640, h: 480 };

export class MockSource {
  private timer: ReturnType<typeof setInterval> | null = null;
  private frameId = 0;

  private make(): ServerMessage {
    this.frameId++;
    const deviation = Math.random() < 0.2 ? pick(['left', 'right'] as const) : 'normal';
    const obstacles: ServerMessage['obstacles'] = [];

    if (Math.random() < 0.5) {
      obstacles.push({
        label: '신호등',
        state: pick(['red', 'green']),
        confidence: conf(0.5, 0.97),
        ...box('top', [54, 82], [70, 110]),
      });
    }
    const n = rand(0, 2);
    for (let i = 0; i < n; i++) {
      const k = pick(KINDS);
      obstacles.push({ label: k.label, confidence: conf(0.45, 0.97), ...box(k.pos, [90, 240], [110, 300]) });
    }
    return { frame_id: this.frameId, deviation, obstacles, depth_corroboration: null };
  }

  start(onMessage: (m: ServerMessage) => void, intervalMs = 900) {
    this.stop();
    this.frameId = 0;
    this.timer = setInterval(() => onMessage(this.make()), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
