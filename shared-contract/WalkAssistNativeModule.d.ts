// shared-contract/WalkAssistNativeModule.d.ts
// 백엔드/AI 코어 트랙과 공유하는 계약. 함수명/필드명 임의 변경 금지.
// (현재 실제 전송은 WebSocket /ws/stream 이지만, 향후 네이티브 퍼셉션 모듈로
//  교체될 경우를 대비해 원형 계약을 그대로 보존한다. src/types.ts 참고)

export type BrailleBlockStatus = 'normal' | 'deviatedLeft' | 'deviatedRight' | 'notDetected';

export interface ObstacleData {
  class: string;              // "person" | "bicycle" | "pole" | "vehicle" 등
  distance: number;           // meters (단안 추정치, 깊이센서 있으면 더 정확)
  angle: number;              // degrees, -90(좌) ~ 90(우)
  approaching: boolean;
  distanceConfidence: 'sensor' | 'estimated';
}

export type TrafficLightState = 'red' | 'green' | 'unknown';

export interface TrafficLightData {
  state: TrafficLightState;
  confidence: number;         // 0.0~1.0, 임계값 미만이면 UI에서 'unknown'과 동일 취급
}

export interface CrowdData {
  density: 'low' | 'medium' | 'high';
  flowDirection: 'approaching' | 'passing' | 'stationary';
  suggestedEvasion: 'left' | 'right' | null;
  confidence: number;
}

export interface WalkAssistNativeModule {
  startPerceptionSession(): Promise<void>;
  stopPerceptionSession(): void;
  isDepthSensorAvailable(): Promise<boolean>;

  onBrailleBlockStatus(callback: (status: BrailleBlockStatus) => void): () => void;
  onObstacleDetected(callback: (data: ObstacleData[]) => void): () => void;
  onTrafficLightDetected(callback: (data: TrafficLightData) => void): () => void;
  onCrowdDetected(callback: (data: CrowdData) => void): () => void;
}
