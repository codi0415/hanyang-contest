import { Detection, Risk, ServerMessage } from '../types';
import { CAT, colors } from '../theme';
import { classify, displayName } from './classify';

const FRAME_H = 480; // 위험도 추정 기준 높이 (mock/다운스케일 프레임과 동일)

// 박스 크기로 거리(위험도) 추정: 단안이라 정확한 미터는 알 수 없어 보수적으로 근사.
export function riskOf(hPx: number, frameH: number): Risk {
  const f = hPx / (frameH || FRAME_H);
  if (f > 0.55) return 'near';
  if (f > 0.32) return 'mid';
  return 'far';
}

const RANK: Record<Risk, number> = { near: 3, mid: 2, far: 1 };

export interface Processed {
  deviation: ServerMessage['deviation'];
  dets: Detection[];
  traffic: Detection | null;
  topObstacle: Detection | null;
}

// 서버 메시지 → 화면에 필요한 파생 데이터 일괄 계산.
export function process(msg: ServerMessage, confThreshold: number, frameH: number): Processed {
  const dets: Detection[] = (msg.obstacles ?? []).map((o) => {
    const { cat, sub } = classify(o);
    const meta = CAT[cat];
    const risk = riskOf(o.y2 - o.y1, frameH);
    const below = o.confidence < confThreshold;
    const name = displayName(cat, sub);
    const confPct = Math.round(o.confidence * 100);
    return {
      ...o,
      cat,
      sub,
      kind: meta.kind,
      risk,
      below,
      name,
      confPct,
      color: below ? colors.uncertain : meta.color,
      chip: meta.chip,
    };
  });

  const traffic =
    dets.filter((d) => d.cat === 'traffic').sort((a, b) => b.confidence - a.confidence)[0] ?? null;

  const topObstacle =
    dets
      .filter((d) => d.kind === 'obstacle' && !d.below)
      .sort((a, b) => RANK[b.risk] - RANK[a.risk] || b.confidence - a.confidence)[0] ?? null;

  return { deviation: msg.deviation ?? 'normal', dets, traffic, topObstacle };
}
