import { ServerMessage } from '../types';

/*
 * 백엔드 없이 UI/음성 플로우를 검증하기 위한 모의 데이터.
 * 서버 스키마와 동일한 형태를 흘려보낸다. 좌표는 640×480 기준.
 * 라벨은 실제 백엔드가 주는 COCO 14종만 사용한다.
 */
const LABELS = [
  '사람', '자전거', '자동차', '오토바이', '버스', '트럭',
  '신호등', '소화전', '정지표지판', '벤치', '고양이', '개', '의자', '화분',
];

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T,>(arr: T[]): T => arr[rand(0, arr.length - 1)];
const conf = (a: number, b: number) => +(a + Math.random() * (b - a)).toFixed(3);

function box() {
  const bw = rand(90, 240);
  const bh = rand(110, 300);
  const x1 = rand(20, 640 - bw - 20);
  const y1 = rand(20, 480 - bh - 10);
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
    const n = Math.random() < 0.6 ? rand(1, 2) : 0;
    for (let i = 0; i < n; i++) {
      const b = box();
      const hFrac = (b.y2 - b.y1) / 480; // 실제 백엔드처럼 장애물별 distance도 채워 넣음
      const distance = hFrac > 0.55 ? 'near' : hFrac > 0.32 ? 'medium' : 'far';
      obstacles.push({ label: pick(LABELS), confidence: conf(0.45, 0.97), ...b, distance });
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
