import { Category, ServerObstacle } from '../types';
import { CAT } from '../theme';

// 서버 라벨(+옵션 필드)을 카테고리와 세부속성으로 분류.
// 라벨 표기가 바뀌어도 최대한 견디도록 폭넓게 매칭한다.
export function classify(o: ServerObstacle): { cat: Category; sub: string } {
  const s = `${o.label ?? ''} ${o.class ?? ''} ${o.type ?? ''}`;

  if (/신호|traffic\s*light/i.test(s)) {
    const c = `${s} ${o.state ?? ''} ${o.color ?? ''}`;
    let sub = 'unknown';
    if (/빨|적색|정지|red/i.test(c)) sub = 'red';
    else if (/초록|녹색|보행|green/i.test(c)) sub = 'green';
    return { cat: 'traffic', sub };
  }
  if (/보도|점자|블록|braille|tactile/i.test(s)) return { cat: 'braille', sub: '' };
  if (/사람|보행자|person|pedestrian|human/i.test(s)) return { cat: 'person', sub: '' };
  if (/기둥|전봇대|볼라드|폴대|pole|pillar|bollard/i.test(s)) return { cat: 'pole', sub: '' };
  if (/웅덩이|물기|puddle|water/i.test(s)) return { cat: 'puddle', sub: '' };
  if (/계단|층계|stair|step/i.test(s)) {
    const c = `${s} ${o.direction ?? ''}`;
    let sub = '';
    if (/내려|하행|하강|down/i.test(c)) sub = 'down';
    else if (/올라|오르|상행|상승|up/i.test(c)) sub = 'up';
    return { cat: 'stairs', sub };
  }
  return { cat: 'other', sub: '' };
}

export function displayName(cat: Category, sub: string): string {
  if (cat === 'traffic') return sub === 'red' ? '빨간불' : sub === 'green' ? '초록불' : '신호등';
  if (cat === 'stairs') return sub === 'down' ? '계단↓' : sub === 'up' ? '계단↑' : '계단';
  return CAT[cat].name;
}

export function voiceName(cat: Category, sub: string): string {
  if (cat === 'stairs') return sub === 'down' ? '내려가는 계단' : sub === 'up' ? '올라가는 계단' : '계단';
  if (cat === 'other') return '장애물';
  return CAT[cat].name;
}
