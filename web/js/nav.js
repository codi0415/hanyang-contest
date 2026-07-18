/*
 * nav.js — 길안내 컨트롤러. 백엔드 확정 계약(2026-07) 반영.
 *
 *   GET  /nav/search?q=<검색어>
 *        → { results: [ { name, address, lat, lng } ] }         (좌표 = lat/lng, WGS84)
 *   POST /nav/route  { start:{lat,lng}, dest:{lat,lng}, startName?, destName? }
 *        → { totalDistance, totalTime, destination:{lat,lng},
 *            steps:[ { description, turnType, lat, lng, distanceFromPrev } ] }
 *        · step.lat/lng = 안내 실행 지점(maneuver), distanceFromPrev = 이전 step→이 step 구간 m
 *        · description = 완결된 한글 안내(그대로 읽음), turnType = 화살표 아이콘 보조
 *
 * 재경로: 백엔드는 stateless(reroute 안 함). 경로 이탈 감지 시 현재 GPS를 start로 /nav/route 재호출.
 * 서버 연결(live)이 꺼져 있으면 Mock + GPS 시뮬레이션으로 데모 동작.
 */

function haversine(a, b) {
  const R = 6371000, toR = (x) => (x * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
// 국소 평면 근사(경로 이탈 계산용 point→segment 거리, m)
function toXY(o, ref) {
  const R = 6371000, toR = (x) => (x * Math.PI) / 180;
  return { x: R * toR(o.lng - ref.lng) * Math.cos(toR(ref.lat)), y: R * toR(o.lat - ref.lat) };
}
function pointSegDist(p, a, b) {
  const P = toXY(p, a), B = toXY(b, a);
  const len2 = B.x * B.x + B.y * B.y;
  let t = len2 ? (P.x * B.x + P.y * B.y) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(P.x - B.x * t, P.y - B.y * t);
}

// ── Mock (백엔드/GPS 없이 데모) ──
const MockNav = (() => {
  const BASE = { lat: 37.55773414, lng: 127.04201548 }; // 한양대 서울캠 인근
  function search(q) {
    const name = q || '목적지';
    return Promise.resolve({ results: [
      { name, address: '서울 성동구 왕십리로 222', lat: BASE.lat + 0.0045, lng: BASE.lng - 0.0068 },
      { name: name + ' 2호점', address: '서울 성동구 마장로 12', lat: BASE.lat + 0.006, lng: BASE.lng - 0.0021 },
      { name: name + ' 인근 출구', address: '서울 성동구 살곶이길 30', lat: BASE.lat - 0.003, lng: BASE.lng + 0.004 },
    ] });
  }
  function startPos() { return { lat: BASE.lat, lng: BASE.lng }; }
  function route(start, dest) {
    const plan = [
      { d: '앞으로 직진하세요', t: 11 },
      { d: '횡단보도를 건너세요', t: 211 },
      { d: '좌회전 후 왕십리로를 따라 이동', t: 12 },
      { d: '목적지 도착', t: 201 },
    ];
    const N = plan.length, steps = [];
    let prev = start, total = 0;
    for (let i = 0; i < N; i++) {
      const f = (i + 1) / N;
      const p = { lat: start.lat + (dest.lat - start.lat) * f, lng: start.lng + (dest.lng - start.lng) * f };
      const seg = Math.round(haversine(prev, p));
      total += seg;
      steps.push({ description: plan[i].d, turnType: plan[i].t, lat: p.lat, lng: p.lng, distanceFromPrev: seg });
      prev = p;
    }
    return Promise.resolve({ steps, destination: { lat: dest.lat, lng: dest.lng }, totalDistance: total, totalTime: Math.round(total / 1.2) });
  }
  return { search, startPos, route };
})();

const Nav = (() => {
  const ARRIVE = 20, APPROACH = 60, OFFROUTE = 45; // meters
  const st = {
    active: false, live: false, steps: [], idx: 0, dest: null, pos: null,
    distToNext: 0, remaining: 0, total: 0, totalTime: 0, arrived: false,
    routePoints: [], rerouting: false, offCount: 0,
  };
  const announced = new Set();
  let onUpdate = () => {};
  let watchId = null, simTimer = null;

  function setLive(v) { st.live = !!v; }
  function setOnUpdate(fn) { onUpdate = fn; }
  function emit() { onUpdate({ ...st, nextStep: st.steps[st.idx] || null }); }

  async function search(q) {
    if (!st.live) return (await MockNav.search(q)).results;
    const r = await fetch('/nav/search?q=' + encodeURIComponent(q));
    if (!r.ok) throw new Error('검색 실패 (' + r.status + ')');
    const d = await r.json();
    return Array.isArray(d) ? d : (d.results || d.candidates || []);
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

  async function route(start, dest, startName, destName) {
    if (!st.live) return MockNav.route(start, dest);
    const r = await fetch('/nav/route', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start, dest, startName, destName }),
    });
    if (!r.ok) throw new Error('경로 요청 실패 (' + r.status + ')');
    const d = await r.json();
    if (Array.isArray(d)) {
      const last = d[d.length - 1];
      return { steps: d, destination: last ? { lat: last.lat, lng: last.lng } : null, totalDistance: 0, totalTime: 0 };
    }
    return { steps: d.steps || [], destination: d.destination || null, totalDistance: d.totalDistance || 0, totalTime: d.totalTime || 0 };
  }

  function applyRoute(start, r) {
    st.steps = r.steps; st.idx = 0; announced.clear();
    st.total = r.totalDistance || 0; st.totalTime = r.totalTime || 0;
    st.routePoints = [{ lat: start.lat, lng: start.lng }, ...r.steps.map((s) => ({ lat: s.lat, lng: s.lng }))];
  }

  async function startTo(cand) {
    const start = await getStart();
    const r = await route(start, { lat: cand.lat, lng: cand.lng }, '현재 위치', cand.name);
    if (!r.steps || !r.steps.length) throw new Error('경로를 찾지 못했어요.');
    st.active = true; st.arrived = false; st.rerouting = false; st.offCount = 0;
    st.dest = { name: cand.name, lat: (r.destination && r.destination.lat) || cand.lat, lng: (r.destination && r.destination.lng) || cand.lng };
    st.pos = start;
    applyRoute(start, r);
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
      st.pos = start;
      simTimer = setInterval(simStep, 900); // GPS 시뮬레이션(데모)
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
    const step = 22;
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
    checkOffRoute();
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

  // 경로 이탈 감지 → 현재 GPS를 start로 재경로 요청 (백엔드 stateless)
  function checkOffRoute() {
    if (!st.active || st.rerouting || st.idx >= st.steps.length || st.routePoints.length < 2) return;
    let minD = Infinity;
    for (let i = st.idx; i < st.routePoints.length - 1; i++) {
      minD = Math.min(minD, pointSegDist(st.pos, st.routePoints[i], st.routePoints[i + 1]));
    }
    if (minD > OFFROUTE) {
      st.offCount++;
      if (st.offCount >= 3) reroute();
    } else st.offCount = 0;
  }

  async function reroute() {
    if (st.rerouting || !st.active || !st.dest) return;
    st.rerouting = true; st.offCount = 0;
    TTS.announce('nav', '경로를 벗어났어요. 경로를 다시 계산합니다.');
    try {
      const r = await route({ lat: st.pos.lat, lng: st.pos.lng }, { lat: st.dest.lat, lng: st.dest.lng }, '현재 위치', st.dest.name);
      if (r.steps && r.steps.length) { applyRoute(st.pos, r); emit(); }
    } catch { /* 실패 시 기존 경로 유지 */ }
    finally { st.rerouting = false; }
  }

  function finish() {
    st.active = false; st.arrived = true; stopTracking();
    TTS.announce('nav', '목적지에 도착했어요.');
    emit();
  }
  function stop() {
    st.active = false; st.arrived = false; st.steps = []; st.idx = 0; st.dest = null; st.routePoints = [];
    stopTracking(); emit();
  }

  return { search, startTo, stop, setLive, setOnUpdate, get state() { return st; } };
})();
