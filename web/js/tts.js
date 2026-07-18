/*
 * tts.js — 음성 안내 우선순위 큐 (Web Speech API).
 * 우선순위(숫자 클수록 우선): 근접 장애물 > 이탈 > 군중 > 내비 > 신호등 > 중거리 장애물
 *   5 근접 장애물 (즉시 새치기)
 *   4 점자블록 이탈
 *   3 군중(2단계, 예약)
 *   2 길안내(내비)
 *   1 신호등(향후 색상 기능용)
 *   0 중거리 장애물 / 기타
 * 앞에 장애물/이탈이 뜨면 내비 안내는 자연히 양보(새치기 당함).
 */
const TTS = (() => {
  const PRIORITY = { obstacleNear: 5, deviation: 4, crowd: 3, nav: 2, traffic: 1, obstacleMid: 0, info: 0 };
  const synth = window.speechSynthesis;
  const supported = !!synth;

  let enabled = true, rate = 1.0, volume = 1.0;
  let current = null;
  let onDuck = () => {};   // TTS 발화 시작/끝을 공간음향 덕킹에 연결
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
    u.onend = u.onerror = () => { onDuck(false); if (current && current.text === text) current = null; };
    current = { level, text };
    lastAt.set(text, Date.now());
    synth.cancel();
    synth.speak(u);
  }

  return {
    setEnabled(v) { enabled = !!v; if (!enabled && supported) { synth.cancel(); current = null; onDuck(false); } },
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
      if (level > current.level) speakNow(level, text); // 새치기
    },
    stop() { if (supported) synth.cancel(); current = null; }
  };
})();
