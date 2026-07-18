/*
 * overlay.js — 바운딩 박스 렌더링 (RN BoundingBoxOverlay와 동일 스타일)
 * 좌표는 "클라이언트가 보낸 프레임(640×480)" 기준 → 캔버스 내부 해상도를 640×480으로 고정.
 * 신뢰도 미달(below)은 회색 점선 "확인필요", 근접(near)은 굵은 테두리+글로우.
 */
const Overlay = (() => {
  const FRAME_W = 640, FRAME_H = 480;
  let ctx = null;

  function init(canvasEl) {
    canvasEl.width = FRAME_W; canvasEl.height = FRAME_H;
    ctx = canvasEl.getContext('2d');
  }
  function clear() { if (ctx) ctx.clearRect(0, 0, FRAME_W, FRAME_H); }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(dets) {
    if (!ctx) return;
    clear();
    for (const d of dets) {
      const c = d.color;
      const w = d.x2 - d.x1, h = d.y2 - d.y1;
      const glow = !d.below && d.risk === 'near';

      ctx.lineWidth = glow ? 4 : 3;
      ctx.strokeStyle = c;
      ctx.setLineDash(d.below ? [10, 8] : []);
      ctx.shadowColor = c;
      ctx.shadowBlur = glow ? 20 : 10;
      roundRect(d.x1, d.y1, w, h, 12);
      ctx.stroke();
      ctx.setLineDash([]); ctx.shadowBlur = 0;

      const label = d.below ? `${d.name} 확인필요` : `${d.name} ${d.confPct}%`;
      ctx.font = '700 20px -apple-system,system-ui,sans-serif';
      const tw = ctx.measureText(label).width;
      const lx = Math.max(0, Math.min(d.x1, FRAME_W - tw - 16));
      const ly = Math.max(24, d.y1);
      ctx.fillStyle = c;
      roundRect(lx, ly - 26, tw + 16, 26, 8);
      ctx.fill();
      ctx.fillStyle = '#141210';
      ctx.fillText(label, lx + 8, ly - 7);
    }
  }

  return { init, draw, clear, FRAME_W, FRAME_H };
})();
