import { Detection, Risk, ServerMessage } from '../types';
import { colors } from '../theme';
import { metaOf } from './classify';

const FRAME_H = 480; // 위험도 추정 기준 높이 (mock/다운스케일 프레임과 동일)

// 박스 크기로 거리(위험도) 추정: 단안이라 정확한 미터는 알 수 없어 보수적으로 근사.
export function riskOf(hPx: number, frameH: number): Risk {
  const f = hPx / (frameH || FRAME_H);
  if (f > 0.55) return 'near';
  if (f > 0.32) return 'mid';
  return 'far';
}

const RANK: Record<Risk, number> = { near: 3, mid: 2, far: 1 };

// 백엔드 깊이 표기(near/medium/far) → 프론트 위험도
const DEPTH_TO_RISK: Record<string, Risk> = { near: 'near', medium: 'mid', far: 'far' };

export interface Processed {
  deviation: ServerMessage['deviation'];
  dets: Detection[];
  topObstacle: Detection | null;
}

// 서버 메시지 → 화면에 필요한 파생 데이터 일괄 계산.
export function process(msg: ServerMessage, confThreshold: number, frameH: number): Processed {
  const dets: Detection[] = (msg.obstacles ?? []).map((o) => {
    const meta = metaOf(o);
    const below = o.confidence < confThreshold;
    // 장애물별 실제 깊이(distance)가 오면 그걸 우선 사용, 없으면 bbox 높이로 추정.
    const risk: Risk = o.distance ? (DEPTH_TO_RISK[o.distance] ?? riskOf(o.y2 - o.y1, frameH)) : riskOf(o.y2 - o.y1, frameH);
    return {
      ...o,
      cat: meta.cat,
      risk,
      below,
      name: o.label,
      confPct: Math.round(o.confidence * 100),
      color: below ? colors.uncertain : meta.color,
      chip: meta.chip,
    };
  });

  const topObstacle =
    dets
      .filter((d) => !d.below)
      .sort((a, b) => RANK[b.risk] - RANK[a.risk] || b.confidence - a.confidence)[0] ?? null;

  return { deviation: msg.deviation ?? 'normal', dets, topObstacle };
}
