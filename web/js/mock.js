/*
 * mock.js — 백엔드 없이 UI/음성 플로우 검증용 모의 데이터 (RN mockSource.ts와 동일).
 * 실제 백엔드가 주는 COCO 14종 라벨 + 장애물별 distance 를 그대로 흉내낸다. 좌표는 640×480.
 */
const Mock = (() => {
  const LIST = ['사람','자전거','자동차','오토바이','버스','트럭','신호등',
    '소화전','정지표지판','벤치','고양이','개','의자','화분'];
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (a) => a[rand(0, a.length - 1)];
  const conf = (a, b) => +(a + Math.random() * (b - a)).toFixed(3);
  let frameId = 0, timer = null;

  function box() {
    const bw = rand(90, 240), bh = rand(110, 300);
    const x1 = rand(20, 640 - bw - 20), y1 = rand(20, 480 - bh - 10);
    return { x1, y1, x2: x1 + bw, y2: y1 + bh };
  }

  function make() {
    frameId++;
    const deviation = Math.random() < 0.2 ? pick(['left', 'right']) : 'normal';
    const obstacles = [];
    const n = Math.random() < 0.6 ? rand(1, 2) : 0;
    for (let i = 0; i < n; i++) {
      const b = box();
      const hFrac = (b.y2 - b.y1) / 480;
      const distance = hFrac > 0.55 ? 'near' : hFrac > 0.32 ? 'medium' : 'far';
      obstacles.push({ label: pick(LIST), confidence: conf(0.45, 0.97), ...b, distance });
    }
    return { frame_id: frameId, deviation, obstacles, depth_corroboration: null };
  }

  return {
    start(onMessage, intervalMs = 900) { this.stop(); frameId = 0; timer = setInterval(() => onMessage(make()), intervalMs); },
    stop() { if (timer) { clearInterval(timer); timer = null; } }
  };
})();
