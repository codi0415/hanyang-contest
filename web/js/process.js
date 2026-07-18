/*
 * process.js — 서버 메시지 → 화면 파생 데이터 (RN process.ts와 동일 로직)
 * 위험도: 장애물별 distance(near/medium/far)가 있으면 우선, 없으면 bbox 높이로 추정.
 */
const Processor = (() => {
  const FRAME_H = 480;
  const RANK = { near: 3, mid: 2, far: 1 };
  const DEPTH_TO_RISK = { near: 'near', medium: 'mid', far: 'far' };

  function riskOf(hPx, frameH) {
    const f = hPx / (frameH || FRAME_H);
    if (f > 0.55) return 'near';
    if (f > 0.32) return 'mid';
    return 'far';
  }

  // 신호등 상태 색: red/green이면 그 색, 아니면 기본
  function signalColor(state, base) {
    return state === 'red' ? '#ff5c5c' : state === 'green' ? '#3ddc84' : base;
  }

  function process(msg, confThreshold, frameH) {
    const dets = (msg.obstacles || []).map(o => {
      const meta = metaOf(o.label);
      const below = o.confidence < confThreshold;
      const risk = o.distance ? (DEPTH_TO_RISK[o.distance] || riskOf(o.y2 - o.y1, frameH))
                              : riskOf(o.y2 - o.y1, frameH);
      let color = below ? UNCERTAIN_COLOR : meta.color;
      if (meta.cat === 'signal' && !below) color = signalColor(o.state, meta.color); // 신호등 색 반영
      return {
        ...o,
        cat: meta.cat,
        risk,
        below,
        name: o.label,
        confPct: Math.round(o.confidence * 100),
        color,
        chip: meta.chip,
      };
    });

    // 장애물 음성은 신호등 제외(색 안내 전용) + relevant===false(차도차량·원거리 등) 제외 (null은 통과)
    const topObstacle = dets
      .filter(d => !d.below && d.cat !== 'signal' && d.relevant !== false)
      .sort((a, b) => (RANK[b.risk] - RANK[a.risk]) || (b.confidence - a.confidence))[0] || null;

    // 신호등(가장 신뢰도 높은 것) — state는 red|green|unknown|null
    const traffic = dets
      .filter(d => d.cat === 'signal' && !d.below)
      .sort((a, b) => b.confidence - a.confidence)[0] || null;

    return { deviation: msg.deviation || 'normal', dets, topObstacle, traffic, crowd: msg.crowd || null };
  }

  return { process, riskOf };
})();
