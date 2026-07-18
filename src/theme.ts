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

// 카테고리별 메타 (kind: obstacle=경고, info=신호등, guide=보도블록[위험 아님])
export const CAT: Record<
  string,
  { name: string; chip: string; color: string; kind: 'obstacle' | 'info' | 'guide' }
> = {
  traffic: { name: '신호등', chip: '🚦', color: '#ffd23f', kind: 'info' },
  braille: { name: '보도블록', chip: '⠿', color: '#7ee8a8', kind: 'guide' },
  person: { name: '사람', chip: '🚶', color: '#ff6b6b', kind: 'obstacle' },
  pole: { name: '기둥', chip: '🧱', color: '#ffb347', kind: 'obstacle' },
  puddle: { name: '물웅덩이', chip: '💧', color: '#4fc3f7', kind: 'obstacle' },
  stairs: { name: '계단', chip: '🪜', color: '#ff8a5c', kind: 'obstacle' },
  other: { name: '기타', chip: '⚠️', color: '#ffc04d', kind: 'obstacle' },
};

export const RISK_KO: Record<string, string> = { near: '가까움', mid: '보통', far: '멂' };

export const gradients = {
  header: ['#ffb347', '#ff7a59'] as const,
  onboarding: ['#ff8558', '#ff6f6f'] as const,
  light: ['#fff8f2', '#fff1e6'] as const,
};
