/*
 * spatial.js — 장애물 방향을 공간음향(HRTF) 비프로 알림.
 * 백엔드가 obstacle마다 주는 direction(-1..1, 화면 가로중심 기준)·danger(0..1)를 사용.
 * 확정 파라미터: 700Hz 사인 · 비프 90ms · 최대볼륨 0.6 · 방향폭 ±80° ·
 *               비프간격 near 130 / medium 520 / far 1100 ms.
 *
 * 겹침 방지: 매 프레임 가장 위험한(danger 최대, below 제외) 1개만 타깃 → 별도 루프에서 반복 비프.
 * 게이팅: enabled(설정 토글) && allowed(이어폰 연결) 일 때만 소리. TTS 발화 중엔 덕킹.
 */
const Spatial = (() => {
  const A = {
    freq: 700, wave: 'sine', beepLen: 0.09, maxVol: 0.6, azDeg: 80,
    interval: { near: 130, medium: 520, far: 1100 },
  };
  const RISK_TO_DIST = { near: 'near', mid: 'medium', far: 'far' };

  let ac = null;
  let enabled = false, allowed = false;
  let target = null, running = false, timer = null;
  let duck = 1;

  function ensureContext() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; } }
    return ac;
  }
  // 브라우저 정책상 사용자 탭(카메라 시작 등) 시점에 호출해야 소리가 난다.
  function resume() { ensureContext(); if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); }

  function active() { return enabled && allowed; }
  function sync() {
    if (active()) { if (!running) { running = true; resume(); loop(); } }
    else { running = false; if (timer) { clearTimeout(timer); timer = null; } target = null; }
  }
  function setEnabled(v) { enabled = !!v; sync(); }
  function setAllowed(v) { allowed = !!v; sync(); }
  function setDuck(on) { duck = on ? 0.35 : 1; } // TTS 발화 중 비프 볼륨 낮춤

  // 매 서버 프레임: below(저신뢰) 제외, danger 최대 1개만
  function onFrame(dets) {
    if (!active()) { target = null; return; }
    target = (dets || []).filter((o) => !o.below && o.danger != null && o.relevant !== false)
      .sort((a, b) => b.danger - a.danger)[0] || null;
  }

  function beep(direction, danger) {
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator(); osc.type = A.wave; osc.frequency.value = A.freq;
    const g = ac.createGain();
    const v = A.maxVol * Math.max(0, Math.min(1, danger)) * duck;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, v), now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + A.beepLen);
    const pan = ac.createPanner(); pan.panningModel = 'HRTF'; pan.rolloffFactor = 0;
    const az = (direction || 0) * A.azDeg * Math.PI / 180, r = 1.4;
    pan.positionX.value = Math.sin(az) * r; pan.positionY.value = 0; pan.positionZ.value = -Math.cos(az) * r;
    osc.connect(g).connect(pan).connect(ac.destination);
    osc.start(now); osc.stop(now + A.beepLen + 0.03);
  }

  function intervalMs(t) {
    const key = t.distance || RISK_TO_DIST[t.risk] || 'medium';
    return A.interval[key] || 700;
  }

  function loop() {
    if (!running) return;
    if (target) { beep(target.direction, target.danger); timer = setTimeout(loop, intervalMs(target)); }
    else timer = setTimeout(loop, 200); // 없으면 조용
  }

  return { resume, setEnabled, setAllowed, setDuck, onFrame, active };
})();
