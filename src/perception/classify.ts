import { Category, ServerObstacle } from '../types';

/*
 * COCO 사전학습에서 오는 14종 라벨(백엔드 RELEVANT_CLASSES)만 온다.
 * 이 외 라벨은 절대 오지 않으므로 정규식이 아니라 정확 매칭 테이블로 처리한다.
 * 모두 "장애물"로 취급 — 색상 없는 신호등도 마찬가지("전방에 신호등 있어요. 주의하세요").
 * (신호등 색상 state, 계단 등은 백엔드 2단계 승인 시 별도 확장 예정)
 */
export interface LabelMeta {
  cat: Category;
  chip: string;
  color: string;
}

export const LABELS: Record<string, LabelMeta> = {
  사람: { cat: 'person', chip: '🚶', color: '#ff6b6b' },
  자전거: { cat: 'vehicle', chip: '🚲', color: '#ff8a5c' },
  자동차: { cat: 'vehicle', chip: '🚗', color: '#ff5c5c' },
  오토바이: { cat: 'vehicle', chip: '🏍️', color: '#ff5c5c' },
  버스: { cat: 'vehicle', chip: '🚌', color: '#ff5c5c' },
  트럭: { cat: 'vehicle', chip: '🚚', color: '#ff5c5c' },
  신호등: { cat: 'signal', chip: '🚦', color: '#ffd23f' },
  소화전: { cat: 'fixed', chip: '🧯', color: '#ffb347' },
  정지표지판: { cat: 'sign', chip: '🛑', color: '#ff8a5c' },
  벤치: { cat: 'fixed', chip: '🪑', color: '#ffb347' },
  고양이: { cat: 'animal', chip: '🐈', color: '#ffc04d' },
  개: { cat: 'animal', chip: '🐕', color: '#ffc04d' },
  의자: { cat: 'fixed', chip: '🪑', color: '#ffb347' },
  화분: { cat: 'fixed', chip: '🪴', color: '#ffb347' },
};

const FALLBACK: LabelMeta = { cat: 'fixed', chip: '⚠️', color: '#ffc04d' };

export function metaOf(o: ServerObstacle): LabelMeta {
  return LABELS[o.label] ?? FALLBACK;
}
