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

  function process(msg, confThreshold, frameH) {
    const dets = (msg.obstacles || []).map(o => {
      const meta = metaOf(o.label);
      const below = o.confidence < confThreshold;
      const risk = o.distance ? (DEPTH_TO_RISK[o.distance] || riskOf(o.y2 - o.y1, frameH))
                              : riskOf(o.y2 - o.y1, frameH);
      return {
        ...o,
        cat: meta.cat,
        risk,
        below,
        name: o.label,
        confPct: Math.round(o.confidence * 100),
        color: below ? UNCERTAIN_COLOR : meta.color,
        chip: meta.chip,
      };
    });

    const topObstacle = dets
      .filter(d => !d.below)
      .sort((a, b) => (RANK[b.risk] - RANK[a.risk]) || (b.confidence - a.confidence))[0] || null;

    return { deviation: msg.deviation || 'normal', dets, topObstacle };
  }

  return { process, riskOf };
})();
