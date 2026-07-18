/*
 * labels.js — COCO 사전학습 14종 라벨 → 표시 메타 (RN classify.ts와 동일)
 * 이 외 라벨은 오지 않으므로 정확 매칭 테이블로 처리한다.
 */
const LABELS = {
  '사람':     { cat: 'person',  chip: '🚶', color: '#ff6b6b' },
  '자전거':   { cat: 'vehicle', chip: '🚲', color: '#ff8a5c' },
  '자동차':   { cat: 'vehicle', chip: '🚗', color: '#ff5c5c' },
  '오토바이': { cat: 'vehicle', chip: '🏍️', color: '#ff5c5c' },
  '버스':     { cat: 'vehicle', chip: '🚌', color: '#ff5c5c' },
  '트럭':     { cat: 'vehicle', chip: '🚚', color: '#ff5c5c' },
  '신호등':   { cat: 'signal',  chip: '🚦', color: '#ffd23f' },
  '소화전':   { cat: 'fixed',   chip: '🧯', color: '#ffb347' },
  '정지표지판': { cat: 'sign',  chip: '🛑', color: '#ff8a5c' },
  '벤치':     { cat: 'fixed',   chip: '🪑', color: '#ffb347' },
  '고양이':   { cat: 'animal',  chip: '🐈', color: '#ffc04d' },
  '개':       { cat: 'animal',  chip: '🐕', color: '#ffc04d' },
  '의자':     { cat: 'fixed',   chip: '🪑', color: '#ffb347' },
  '화분':     { cat: 'fixed',   chip: '🪴', color: '#ffb347' },
};
const LABEL_FALLBACK = { cat: 'fixed', chip: '⚠️', color: '#ffc04d' };
const UNCERTAIN_COLOR = '#9aa0a6';

const RISK_KO = { near: '가까움', mid: '보통', far: '멂' };

function metaOf(label) { return LABELS[label] || LABEL_FALLBACK; }
