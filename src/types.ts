// 실제 백엔드(/ws/stream)가 내려주는 메시지 스키마 및 프론트 파생 타입.

// ── 서버 → 클라 (schemas.py 기준) ──
export type Deviation = 'normal' | 'left' | 'right';

export interface ServerObstacle {
  label: string;           // COCO 14종 한국어 라벨 (labels.ts 참고)
  confidence: number;      // 0.0~1.0 (소수 3자리 반올림)
  x1: number; y1: number; x2: number; y2: number; // 전송한 프레임 픽셀 좌표
}

export interface ServerMessage {
  frame_id: number;
  deviation: Deviation;
  obstacles: ServerObstacle[];
  depth_corroboration: 'near' | 'medium' | 'far' | null;
}

export interface ServerError {
  error: string;
}

// ── 프론트 파생 타입 ──
// COCO 사전학습 기준 카테고리. 신호등도 (현재 색상 정보 없음) 일반 장애물로 취급.
export type Category = 'person' | 'vehicle' | 'animal' | 'signal' | 'sign' | 'fixed';
export type Risk = 'near' | 'mid' | 'far';

export interface Detection extends ServerObstacle {
  cat: Category;
  risk: Risk;
  below: boolean;       // 신뢰도 임계값 미달 = "확인필요"
  name: string;         // 화면/음성 표기명 (= 라벨)
  confPct: number;
  color: string;
  chip: string;         // 이모지
}

export interface HistoryItem {
  id: string;
  label: string;
  detail: string;
  risk: Risk;
  time: string;
}

export type ConnState = 'connecting' | 'live' | 'mock' | 'offline';
export type FrameSize = { w: number; h: number };
