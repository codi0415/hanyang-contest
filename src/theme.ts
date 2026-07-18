// 디자인 토큰 (Obstacle Detection App 디자인 기준)
export const colors = {
  warm1: '#ffb347',
  warm2: '#ff7a59',
  warm3: '#ff5c8a',
  ink: '#3a2416',
  safe: '#3ddc84',
  warn: '#ffb347',
  danger: '#ff5c5c',
  camBg: '#1a1410',
  uncertain: '#9aa0a6',
  white: '#ffffff',
};

// 라벨→표시 메타는 perception/classify.ts 의 LABELS 테이블 참고.

export const RISK_KO: Record<string, string> = { near: '가까움', mid: '보통', far: '멂' };

export const gradients = {
  header: ['#ffb347', '#ff7a59'] as const,
  onboarding: ['#ff8558', '#ff6f6f'] as const,
  light: ['#fff8f2', '#fff1e6'] as const,
};
