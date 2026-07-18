/*
 * tts.js — 음성 안내 우선순위 큐 (Web Speech API).
 * 우선순위(숫자 클수록 우선): 근접 장애물 > 이탈 > 군중 > 내비 > 중거리 장애물 > 신호등
 *   5 근접 장애물 (즉시 새치기)
 *   4 점자블록 이탈
 *   3 군중
 *   2 길안내(내비)
 *   1 중거리 장애물 / 기타
 *   0 신호등(최하위 — 다른 안내가 없을 때만 색만 알림)
 *
 * pending 슬롯: 새치기당한(낮은 우선순위) 안내를 버리지 않고 1칸 대기 →
 * 현재 발화가 끝나면 이어서 말한다(늦더라도 반드시). 대기 중 더 급한 게 오면 덮어써서
 * 큐가 무한정 쌓이지 않는다.
 */
const TTS = (() => {
  const PRIORITY = { obstacleNear: 5, deviation: 4, crowd: 3, nav: 2, obstacleMid: 1, traffic: 0, info: 0 };
  const synth = window.speechSynthesis;
  const supported = !!synth;

  let enabled = true, rate = 1.0, volume = 1.0;
  let current = null;
  let pending = null;              // 새치기 실패한 안내를 나중에라도 말하기 위한 대기 슬롯(1개)
  let onDuck = () => {};
  const lastAt = new Map();
  const DEBOUNCE_MS = 3500;

  let koVoice = null;
  function pickVoice() {
    if (!supported) return;
    const vs = synth.getVoices();
    koVoice = vs.find(v => /^ko/i.test(v.lang || '')) || null;
  }
  if (supported) { pickVoice(); synth.onvoiceschanged = pickVoice; }

  function speakNow(level, text) {
    if (!supported) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    if (koVoice) u.voice = koVoice;
    u.rate = rate; u.volume = volume;
    u.onstart = () => onDuck(true);
    u.onend = u.onerror = () => {
      onDuck(false);
      if (current && current.text === text) current = null;
      if (pending) { const p = pending; pending = null; speakNow(p.level, p.text); } // 대기 중이던 걸 이어서
    };
    current = { level, text };
    lastAt.set(text, Date.now());
    synth.cancel();
    synth.speak(u);
  }

  return {
    setEnabled(v) { enabled = !!v; if (!enabled && supported) { synth.cancel(); current = null; pending = null; onDuck(false); } },
    setRate(r) { rate = +r; },
    setVolume(v) { volume = +v; },
    setDuckHandler(fn) { onDuck = fn || (() => {}); },
    supported,

    announce(kind, text) {
      if (!enabled || !text) return;
      const level = PRIORITY[kind] ?? 0;
      const last = lastAt.get(text);
      if (last && Date.now() - last < DEBOUNCE_MS) return;
      if (!current) { speakNow(level, text); return; }
      if (level > current.level) { pending = null; speakNow(level, text); return; } // 새치기
      if (!pending || level >= pending.level) pending = { level, text };            // 버리지 않고 대기
    },

    stop() { if (supported) synth.cancel(); current = null; pending = null; }
  };
})();
