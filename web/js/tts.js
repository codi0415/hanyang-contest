/*
 * tts.js — 음성 안내 우선순위 큐 (Web Speech API). RN announcementQueue.ts와 동일.
 * 우선순위(숫자 클수록 우선) — 확정 정책: 근접 장애물 > 점자블록 이탈:
 *   3 근접 장애물 (즉시 새치기)
 *   2 점자블록 이탈
 *   1 신호등(향후 색상 기능용)
 *   0 중거리 장애물 / 기타
 */
const TTS = (() => {
  const PRIORITY = { obstacleNear: 3, deviation: 2, traffic: 1, obstacleMid: 0, info: 0 };
  const synth = window.speechSynthesis;
  const supported = !!synth;

  let enabled = true, rate = 1.0, volume = 1.0;
  let current = null;
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
    u.onend = u.onerror = () => { if (current && current.text === text) current = null; };
    current = { level, text };
    lastAt.set(text, Date.now());
    synth.cancel();
    synth.speak(u);
  }

  return {
    setEnabled(v) { enabled = !!v; if (!enabled && supported) { synth.cancel(); current = null; } },
    setRate(r) { rate = +r; },
    setVolume(v) { volume = +v; },
    supported,
    announce(kind, text) {
      if (!enabled || !text) return;
      const level = PRIORITY[kind] ?? 0;
      const last = lastAt.get(text);
      if (last && Date.now() - last < DEBOUNCE_MS) return;
      if (!current) { speakNow(level, text); return; }
      if (level > current.level) speakNow(level, text); // 새치기
    },
    stop() { if (supported) synth.cancel(); current = null; }
  };
})();
