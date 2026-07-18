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
      // 백엔드 추가 필드: direction(-1..1, 가로중심), danger(0..1, 근접·큰 물체일수록 큼)
      const cx = (b.x1 + b.x2) / 2;
      const direction = +((cx / 640) * 2 - 1).toFixed(2);
      const danger = +Math.min(1, (distance === 'near' ? 0.8 : distance === 'medium' ? 0.5 : 0.25) + hFrac * 0.3).toFixed(2);
      const label = pick(LIST);
      const o = { label, confidence: conf(0.45, 0.97), ...b, distance, direction, danger };
      if (label === '신호등') o.state = pick(['red', 'green', 'unknown']); // 백엔드 state 필드 흉내
      // relevant: 원거리·저위험은 false(감지만, 경고 안 함), 가끔 null(구버전 호환)
      o.relevant = Math.random() < 0.12 ? null : (danger < 0.32 || Math.abs(direction) > 0.85 ? false : true);
      obstacles.push(o);
    }
    return { frame_id: frameId, deviation, obstacles, depth_corroboration: null };
  }

  return {
    start(onMessage, intervalMs = 900) { this.stop(); frameId = 0; timer = setInterval(() => onMessage(make()), intervalMs); },
    stop() { if (timer) { clearInterval(timer); timer = null; } }
  };
})();
