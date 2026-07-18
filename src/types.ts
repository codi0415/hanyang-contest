// 실제 백엔드(/ws/stream)가 내려주는 메시지 스키마 및 프론트 파생 타입.

// ── 서버 → 클라 (schemas.py 기준) ──
export type Deviation = 'normal' | 'left' | 'right';

export interface ServerObstacle {
  label: string;           // 한국어 라벨 ("사람", "기둥", "신호등" 등)
  confidence: number;      // 0.0~1.0
  x1: number; y1: number; x2: number; y2: number; // 전송한 프레임 픽셀 좌표
  // 선택 필드(백엔드 확장 대비): 신호등 색/계단 방향 등이 별도 필드로 올 수도 있음
  state?: string;
  color?: string;
  direction?: string;
  class?: string;
  type?: string;
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
export type Category = 'traffic' | 'braille' | 'person' | 'pole' | 'puddle' | 'stairs' | 'other';
export type CatKind = 'obstacle' | 'info' | 'guide';
export type Risk = 'near' | 'mid' | 'far';

export interface Detection extends ServerObstacle {
  cat: Category;
  sub: string;          // traffic: red|green|unknown, stairs: up|down|''
  kind: CatKind;
  risk: Risk;
  below: boolean;       // 신뢰도 임계값 미달 = "확인필요"
  name: string;         // 화면 표기명 (예: 빨간불, 계단↓)
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
