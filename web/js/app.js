/*
 * app.js — 화면 오케스트레이션 + 감지결과 → UI/음성/진동 매핑.
 * RN(App.tsx + useDetectionSource.ts + 화면들)의 로직을 그대로 웹으로 옮긴 것.
 *
 * deviation 방향: left/right = "사용자가 벗어난 방향". right = 오른쪽 치우침 → "왼쪽으로 이동".
 * 우선순위: 근접 장애물 > 점자블록 이탈 > 신호등 > 중거리 장애물 (TTS 큐가 관리).
 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);

  const screens = [...document.querySelectorAll('.screen')];
  const tabbar = $('tabbar');
  const tabs = [...document.querySelectorAll('.tab')];
  const camVideo = $('camVideo'), camOverlay = $('camOverlay'), camPlaceholder = $('camPlaceholder');
  const statusPill = $('statusPill'), statusText = $('statusText');
  const connBadge = $('connBadge');
  const alertCard = $('alertCard'), alertIcon = $('alertIcon'), alertTitle = $('alertTitle'), alertDesc = $('alertDesc');
  const dirHint = $('dirHint'), dirArrow = $('dirArrow');
  const histList = $('histList'), histEmpty = $('histEmpty');
  const chips = $('chips');

  // ── 설정 상태 ──
  const settings = { voice: true, haptic: true, rate: 1.0, volume: 1.0, conf: 0.6, live: false, wsUrl: '' };

  // 같은 서버(=페이지를 서빙한 곳)로 자동 연결하는 기본 WS 주소.
  function defaultWsUrl() {
    const p = location.protocol;
    if (p === 'https:') return `wss://${location.host}/ws/stream`;
    if (p === 'http:' && location.host) return `ws://${location.host}/ws/stream`;
    return 'ws://127.0.0.1:8000/ws/stream'; // file:// 등 폴백
  }
  const AUTO_URL = defaultWsUrl();

  // 웹은 항상 640×480으로 다운스케일해 보내므로 프레임 크기 고정.
  const FRAME = { w: Overlay.FRAME_W, h: Overlay.FRAME_H };

  let started = false, source = null, ws = null;
  let history = [], lastHistKey = '', lastHistAt = 0;

  // ─────────── 화면 전환 ───────────
  function show(name) {
    for (const s of screens) s.hidden = s.dataset.screen !== name;
    tabbar.hidden = name === 'onboarding';
    tabbar.classList.toggle('tabbar--light', name === 'history' || name === 'settings');
    for (const t of tabs) t.classList.toggle('tab--active', t.dataset.goto === name);
    if (name === 'history') renderHistory();
  }
  tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.goto)));

  // ─────────── 시작 ───────────
  $('startBtn').addEventListener('click', async () => { await begin(); show('main'); });

  async function begin() {
    if (started) return;
    started = true;
    Overlay.init(camOverlay);
    Camera.init(camVideo);
    let camOk = false;
    try { await Camera.start(); camOk = true; camPlaceholder.hidden = true; }
    catch (e) { camPlaceholder.innerHTML = '카메라를 열 수 없어요<br><span>' + (e.message || '') + '</span>'; }
    if (settings.live) startLive(camOk); else startMock();
  }

  function startLive(camOk) {
    source = 'live';
    Mock.stop();
    setConn('connecting');
    ws = new WSClient(handleMessage, (st) => setConn(st === 'live' ? 'live' : st === 'connecting' ? 'connecting' : 'offline'));
    ws.connect(settings.wsUrl || AUTO_URL);
    if (camOk) Camera.startSending((blob) => ws.send(blob), 200);
  }

  function startMock() {
    source = 'mock';
    if (ws) { ws.close(); ws = null; }
    Camera.stopSending();
    setConn('mock');
    Mock.start(handleMessage, 900);
  }

  function setConn(state) {
    connBadge.classList.remove('conn-badge--live', 'conn-badge--mock');
    if (state === 'live') { connBadge.textContent = '실시간'; connBadge.classList.add('conn-badge--live'); }
    else if (state === 'mock') { connBadge.textContent = 'MOCK'; connBadge.classList.add('conn-badge--mock'); }
    else if (state === 'connecting') { connBadge.textContent = '연결 중'; }
    else { connBadge.textContent = '오프라인'; }
  }

  // ─────────── 감지결과 처리 ───────────
  function handleMessage(msg) {
    if (!msg || msg.error) return;
    const r = Processor.process(msg, settings.conf, FRAME.h);
    Overlay.draw(r.dets);
    renderChips(r.dets);
    updateDeviation(r.deviation);
    updateAlertAndVoice(r.deviation, r.topObstacle, r.dets.length);
  }

  function updateDeviation(dev) {
    statusPill.classList.remove('status-pill--warn');
    if (dev === 'normal') {
      statusText.textContent = '안전 — 이동 가능';
      dirHint.hidden = true;
      return;
    }
    statusPill.classList.add('status-pill--warn');
    const goRight = dev === 'left';   // 왼쪽 이탈 → 오른쪽으로 이동
    statusText.textContent = goRight ? '왼쪽으로 벗어남' : '오른쪽으로 벗어남';
    dirArrow.textContent = goRight ? '→' : '←';
    dirHint.hidden = false;

    TTS.announce('deviation', goRight
      ? '점자블록에서 왼쪽으로 벗어났어요. 오른쪽으로 이동하세요.'
      : '점자블록에서 오른쪽으로 벗어났어요. 왼쪽으로 이동하세요.');
    haptic([60, 40, 60]);
    pushHistory({ label: goRight ? '경로 이탈 (좌)' : '경로 이탈 (우)', detail: goRight ? '오른쪽으로 이동' : '왼쪽으로 이동', risk: 'mid' });
  }

  function updateAlertAndVoice(dev, top, count) {
    if (top) {
      const near = top.risk === 'near';
      alertCard.classList.remove('alert-card--warn', 'alert-card--danger');
      alertCard.classList.add(near ? 'alert-card--danger' : 'alert-card--warn');
      alertIcon.textContent = near ? '!' : (top.chip || '▲');
      alertTitle.textContent = `전방에 ${top.name}${near ? '이(가) 가까이' : ''} 있어요`;
      const distNote = top.distance ? '' : ' (추정 거리)';
      alertDesc.textContent = `${RISK_KO[top.risk]} · 신뢰도 ${top.confPct}%${distNote}`;

      TTS.announce(near ? 'obstacleNear' : 'obstacleMid',
        near ? `전방 가까이 ${top.name} 있어요. 주의하세요.` : `전방에 ${top.name} 있어요.`);
      if (near) haptic([120]);
      pushHistory({ label: `${top.name} 감지`, detail: `전방 ${RISK_KO[top.risk]} · ${top.confPct}%`, risk: top.risk });
    } else if (dev === 'normal') {
      alertCard.classList.remove('alert-card--warn', 'alert-card--danger');
      alertIcon.textContent = '✓';
      alertTitle.textContent = '전방이 안전해요';
      alertDesc.textContent = count > 0 ? '감지된 물체가 멀리 있어요' : '감지되면 바로 알려드릴게요';
    }
  }

  function haptic(pattern) { if (settings.haptic && navigator.vibrate) navigator.vibrate(pattern); }

  // ─────────── 감지 칩 ───────────
  function renderChips(dets) {
    const groups = new Map();
    for (const d of dets) {
      const key = d.name + '|' + (d.below ? 'x' : 'o');
      if (!groups.has(key)) groups.set(key, { d, n: 0 });
      groups.get(key).n++;
    }
    chips.innerHTML = '';
    for (const { d, n } of groups.values()) {
      const el = document.createElement('div');
      el.className = 'chip' + (d.below ? ' chip--dim' : '');
      el.style.setProperty('--c', d.color);
      const i = document.createElement('span'); i.className = 'chip__i'; i.textContent = d.chip;
      const t = document.createElement('span'); t.textContent = d.name + (n > 1 ? ` ×${n}` : '');
      el.append(i, t);
      chips.appendChild(el);
    }
  }

  // ─────────── 기록 ───────────
  function pushHistory(item) {
    const now = Date.now();
    const key = item.label;
    if (key === lastHistKey && now - lastHistAt < 5000) return;
    lastHistKey = key; lastHistAt = now;
    const d = new Date(now);
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    history.unshift({ ...item, time });
    if (history.length > 40) history.pop();
  }

  const RISK_ICON = { near: '●', mid: '▲', far: '■' };
  const RISK_COLOR = { near: '#ff5c5c', mid: '#ff8a5c', far: '#ffb347' };

  function renderHistory() {
    histList.innerHTML = '';
    if (!history.length) { histList.appendChild(histEmpty); histEmpty.hidden = false; return; }
    for (const it of history) {
      const row = document.createElement('div');
      row.className = 'hist-item';
      row.innerHTML =
        `<div class="hist-item__icon" style="background:${RISK_COLOR[it.risk] || RISK_COLOR.mid}">${RISK_ICON[it.risk] || '▲'}</div>` +
        `<div class="hist-item__body"><div class="hist-item__label"></div><div class="hist-item__detail"></div></div>` +
        `<div class="hist-item__time"></div>`;
      row.querySelector('.hist-item__label').textContent = it.label;
      row.querySelector('.hist-item__detail').textContent = it.detail;
      row.querySelector('.hist-item__time').textContent = it.time;
      histList.appendChild(row);
    }
  }

  // ─────────── 설정 바인딩 ───────────
  function bindToggle(id, key, extra) {
    const el = $(id);
    el.addEventListener('click', () => {
      const on = el.getAttribute('aria-checked') !== 'true';
      el.setAttribute('aria-checked', String(on));
      settings[key] = on;
      if (extra) extra(on);
    });
  }
  bindToggle('tgVoice', 'voice', (on) => TTS.setEnabled(on));
  bindToggle('tgHaptic', 'haptic');
  bindToggle('tgLive', 'live', (on) => {
    if (!started) return;
    if (on) startLive(Camera.active); else startMock();
  });

  const rate = $('rate'), rateVal = $('rateVal');
  rate.addEventListener('input', () => { settings.rate = +rate.value; rateVal.textContent = (+rate.value).toFixed(1) + '×'; TTS.setRate(rate.value); });
  const vol = $('vol'), volVal = $('volVal');
  vol.addEventListener('input', () => { settings.volume = +vol.value; volVal.textContent = Math.round(vol.value * 100) + '%'; TTS.setVolume(vol.value); });
  const conf = $('conf'), confVal = $('confVal');
  conf.addEventListener('input', () => { settings.conf = +conf.value; confVal.textContent = Math.round(conf.value * 100) + '%'; });
  const wsUrl = $('wsUrl');
  wsUrl.addEventListener('change', () => {
    settings.wsUrl = wsUrl.value.trim();
    if (started && source === 'live') startLive(Camera.active);
  });

  $('wsAuto').textContent = AUTO_URL;
  TTS.setRate(settings.rate); TTS.setVolume(settings.volume); TTS.setEnabled(settings.voice);

  // 통합/디버그용 훅: 서버 메시지 형식을 직접 주입해 UI 검증 가능.
  window.WalkAssist = { feed: handleMessage };

  show('onboarding');
})();
