/*
 * nav.js — 길안내 컨트롤러.
 *
 * 흐름: 목적지 검색(/nav/search) → 후보 선택 → 현재 GPS + 목적지로 경로(/nav/route)
 *       → watchPosition 갱신마다 다음 step까지 거리 계산 → 가까워지면 음성 안내.
 *
 * ⚠️ 백엔드 계약(아래 가정)은 확정 전이라, 응답을 폭넓게 받도록(배열/래핑 모두) 처리한다.
 *   /nav/search?q=<검색어>  → [{ name, address, lat, lng }] 또는 { candidates:[...] }
 *   POST /nav/route { start:{lat,lng}, dest:{lat,lng} }
 *                         → [{ description, lat, lng, distance }] 또는 { steps:[...] }
 *   좌표계: WGS84 위경도. step.lat/lng = 그 안내를 실행할 지점(maneuver).
 *
 * 서버 연결(live)이 꺼져 있으면 MockNav로 동작하고, GPS도 시뮬레이션해 데모가 된다.
 */

function haversine(a, b) {
  const R = 6371000, toR = (x) => (x * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// ── Mock (백엔드/GPS 없이 데모) ──
const MockNav = (() => {
  const BASE = { lat: 37.5573, lng: 127.0458 }; // 한양대 인근 대략 좌표
  function search(q) {
    const name = q || '목적지';
    return Promise.resolve([
      { name, address: '서울 성동구 왕십리로 222', lat: BASE.lat + 0.0045, lng: BASE.lng + 0.0032 },
      { name: name + ' 2호점', address: '서울 성동구 마장로 12', lat: BASE.lat + 0.006, lng: BASE.lng - 0.0021 },
      { name: name + ' 인근 출구', address: '서울 성동구 살곶이길 30', lat: BASE.lat - 0.003, lng: BASE.lng + 0.004 },
    ]);
  }
  function startPos() { return { lat: BASE.lat, lng: BASE.lng }; }
  function route(start, dest) {
    const descs = ['앞으로 직진하세요', '횡단보도를 건너세요', '좌회전하세요', '우회전 후 직진하세요'];
    const N = 4, steps = [];
    let prev = start;
    for (let i = 1; i <= N; i++) {
      const t = i / N;
      const p = { lat: start.lat + (dest.lat - start.lat) * t, lng: start.lng + (dest.lng - start.lng) * t };
      steps.push({
        description: i === N ? '목적지 도착' : descs[(i - 1) % descs.length],
        lat: p.lat, lng: p.lng, distance: Math.round(haversine(prev, p)),
      });
      prev = p;
    }
    return Promise.resolve(steps);
  }
  return { search, startPos, route };
})();

const Nav = (() => {
  const ARRIVE = 20, APPROACH = 60; // meters
  const st = { active: false, live: false, steps: [], idx: 0, dest: null, pos: null, distToNext: 0, remaining: 0, arrived: false };
  const announced = new Set();
  let onUpdate = () => {};
  let watchId = null, simTimer = null;

  function setLive(v) { st.live = !!v; }
  function setOnUpdate(fn) { onUpdate = fn; }
  function emit() { onUpdate({ ...st, nextStep: st.steps[st.idx] || null }); }

  async function search(q) {
    if (!st.live) return MockNav.search(q);
    const r = await fetch('/nav/search?q=' + encodeURIComponent(q));
    if (!r.ok) throw new Error('검색 실패 (' + r.status + ')');
    const d = await r.json();
    return Array.isArray(d) ? d : (d.candidates || d.results || []);
  }

  function getStart() {
    return new Promise((res) => {
      if (!st.live || !navigator.geolocation) return res(MockNav.startPos());
      navigator.geolocation.getCurrentPosition(
        (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => res(MockNav.startPos()),
        { enableHighAccuracy: true, timeout: 8000 });
    });
  }

  async function route(start, dest) {
    if (!st.live) return MockNav.route(start, dest);
    const r = await fetch('/nav/route', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start, dest }),
    });
    if (!r.ok) throw new Error('경로 요청 실패 (' + r.status + ')');
    const d = await r.json();
    return Array.isArray(d) ? d : (d.steps || []);
  }

  async function startTo(cand) {
    const start = await getStart();
    const steps = await route(start, { lat: cand.lat, lng: cand.lng });
    if (!steps || !steps.length) throw new Error('경로를 찾지 못했어요.');
    st.active = true; st.arrived = false; st.steps = steps; st.idx = 0; st.dest = cand; st.pos = start;
    announced.clear();
    beginTracking(start);
    emit();
    TTS.announce('nav', `${cand.name} 안내를 시작합니다.`);
  }

  function beginTracking(start) {
    stopTracking();
    if (st.live && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (p) => onPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {}, { enableHighAccuracy: true, maximumAge: 1000 });
    } else {
      // GPS 시뮬레이션(데모): 다음 step 좌표로 걷는 속도만큼 이동
      st.pos = start;
      simTimer = setInterval(simStep, 900);
    }
  }
  function stopTracking() {
    if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    if (simTimer) { clearInterval(simTimer); simTimer = null; }
  }

  function simStep() {
    if (!st.active || st.idx >= st.steps.length) return;
    const target = st.steps[st.idx];
    const d = haversine(st.pos, target);
    const step = 22; // 시뮬 걷기 속도(m/틱)
    if (d <= step) st.pos = { lat: target.lat, lng: target.lng };
    else {
      const t = step / d;
      st.pos = { lat: st.pos.lat + (target.lat - st.pos.lat) * t, lng: st.pos.lng + (target.lng - st.pos.lng) * t };
    }
    onPos(st.pos);
  }

  function onPos(p) {
    st.pos = p;
    guide();
    st.remaining = st.dest ? haversine(p, st.dest) : 0;
    emit();
  }

  function guide() {
    if (!st.active || st.idx >= st.steps.length) return;
    const step = st.steps[st.idx];
    const d = haversine(st.pos, step);
    st.distToNext = d;
    if (d < ARRIVE) {
      TTS.announce('nav', step.description);
      st.idx++;
      if (st.idx >= st.steps.length) finish();
    } else if (d < APPROACH && !announced.has(st.idx)) {
      announced.add(st.idx);
      TTS.announce('nav', `${Math.round(d)}미터 앞 ${step.description}`);
    }
  }

  function finish() {
    st.active = false; st.arrived = true; stopTracking();
    TTS.announce('nav', '목적지에 도착했어요.');
    emit();
  }
  function stop() {
    st.active = false; st.arrived = false; st.steps = []; st.idx = 0; st.dest = null;
    stopTracking(); emit();
  }

  return { search, startTo, stop, setLive, setOnUpdate, get state() { return st; } };
})();
