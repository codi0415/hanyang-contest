/*
 * a11y.js — 시각장애인용 제스처 조작 레이어.
 *
 * 공통 원리: 꾹 누른 채로 드래그 → 손가락에 "가장 가까운 항목"을 TTS로 읽어주고 틱음(타다닥),
 *            손을 떼면 그 항목이 선택된다. 일반 탭/클릭도 그대로 동작(폴백).
 *
 *  - 하단바: 좌우 드래그로 탭 탐색 → 놓으면 그 탭으로 이동
 *  - 길찾기: 화면(빈 영역)을 누른 채로 말하면 음성 검색 / 결과는 상하 드래그로 탐색·선택
 *  - 설정: 상하 드래그로 항목 탐색(2초 머무르면 이름·값 읽음), 좌우 드래그로 슬라이더 값 변경
 *          (조용히 2초 있으면 값 읽음), 토글은 탭으로 전환(항상 상태 읽음)
 *
 * 소리: 짧은 사각파 클릭(tick) = 톱니바퀴 타다닥, 사인 비프 = 선택 확정.
 */
const A11y = (() => {
  let ac = null;
  function audio() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }
  function tick(freq = 190) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(); o.type = 'square'; o.frequency.value = freq;
    const t = a.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.06);
  }
  function confirmBeep() {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = 660;
    const t = a.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.17);
  }
  const say = (t) => TTS.speakUI(t);

  // ── 리스트 탐색기 (하단바·길찾기 결과): 드래그로 최근접 항목 포커스, 놓으면 선택 ──
  function listExplorer(container, { axis, getItems, labelOf, onSelect }) {
    let active = false, cur = -1;
    const coord = (e) => (axis === 'x' ? e.clientX : e.clientY);
    function nearest(e) {
      const items = getItems(); if (!items.length) return -1;
      const p = coord(e); let best = -1, bd = Infinity;
      items.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const c = axis === 'x' ? (r.left + r.right) / 2 : (r.top + r.bottom) / 2;
        const d = Math.abs(p - c); if (d < bd) { bd = d; best = i; }
      });
      return best;
    }
    function focus(e) {
      const i = nearest(e); if (i < 0 || i === cur) return;
      cur = i; const items = getItems();
      items.forEach((el, k) => el.classList.toggle('a11y-focus', k === i));
      tick(); say(labelOf(items[i], i));
    }
    function clearFocus() { getItems().forEach((el) => el.classList.remove('a11y-focus')); }
    container.addEventListener('pointerdown', (e) => {
      active = true; cur = -1; audio();
      try { container.setPointerCapture(e.pointerId); } catch {}
      focus(e); e.preventDefault();
    });
    container.addEventListener('pointermove', (e) => { if (active) focus(e); });
    container.addEventListener('pointerup', () => {
      if (!active) return; active = false;
      const items = getItems();
      if (cur >= 0 && items[cur]) { confirmBeep(); onSelect(items[cur], cur); }
      clearFocus();
    });
    container.addEventListener('pointercancel', () => { active = false; clearFocus(); });
  }

  // ── 설정 화면: 상하=항목 탐색(2초 이름), 좌우=슬라이더 값, 탭=토글 ──
  function initSettings(section) {
    let active = false, axis = null, sx = 0, sy = 0;
    let rows = [], cur = -1, dwell = null, still = null;
    let slider = null, sMin = 0, sMax = 1, sStart = 0;
    const isControl = (t) => t.closest('.slider, .toggle, input, button, a, .set-row__chev');
    const collect = () => { rows = [...section.querySelectorAll('.set-row')].filter((r) => r.offsetParent !== null); };
    function name(row) {
      const l = row.querySelector('.set-row__label'); if (!l) return '';
      for (const n of l.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return n.textContent.trim();
      return l.textContent.trim();
    }
    function control(row) {
      const s = row.querySelector('.slider'); if (s) return { type: 'slider', el: s };
      const t = row.querySelector('.toggle'); if (t) return { type: 'toggle', el: t };
      return { type: 'info' };
    }
    function valueText(row) {
      const c = control(row);
      if (c.type === 'toggle') return c.el.getAttribute('aria-checked') === 'true' ? '켜짐' : '꺼짐';
      if (c.type === 'slider') { const v = row.querySelector('.set-row__val'); return v ? v.textContent : ''; }
      return '';
    }
    function nearestRow(y) { let best = -1, bd = Infinity; rows.forEach((r, i) => { const b = r.getBoundingClientRect(); const d = Math.abs(y - (b.top + b.bottom) / 2); if (d < bd) { bd = d; best = i; } }); return best; }
    function focusRow(i) {
      if (i < 0 || i === cur) return;
      cur = i; rows.forEach((r, k) => r.classList.toggle('a11y-focus', k === i)); tick();
      clearTimeout(dwell);
      dwell = setTimeout(() => { const r = rows[cur]; if (r) say(`${name(r)}, ${valueText(r)}`); }, 2000);
    }
    section.addEventListener('pointerdown', (e) => {
      if (isControl(e.target)) return;               // 네이티브 컨트롤은 그대로
      active = true; axis = null; sx = e.clientX; sy = e.clientY; audio(); collect();
      try { section.setPointerCapture(e.pointerId); } catch {}
    });
    section.addEventListener('pointermove', (e) => {
      if (!active) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!axis) {
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (axis === 'x') {
          const r = rows[cur], c = r ? control(r) : null;
          if (c && c.type === 'slider') { slider = c.el; sMin = +slider.min; sMax = +slider.max; sStart = +slider.value; }
          else { slider = null; say('먼저 위아래로 항목을 고르세요'); }
        }
      }
      if (axis === 'y') focusRow(nearestRow(e.clientY));
      else if (axis === 'x' && slider) {
        const range = sMax - sMin, step = +slider.step || 0.1;
        let nv = Math.min(sMax, Math.max(sMin, sStart + (dx / 240) * range));
        nv = Math.round(nv / step) * step;
        if (nv !== +slider.value) { slider.value = nv; slider.dispatchEvent(new Event('input', { bubbles: true })); tick(240); }
        clearTimeout(still);
        still = setTimeout(() => { const r = rows[cur]; if (r) say(valueText(r)); }, 1500);
      }
    });
    function end(e) {
      if (!active) return;
      if (!axis && e) {                              // 탭(이동 없음) → 토글 전환
        const i = nearestRow(e.clientY), r = rows[i], c = r ? control(r) : null;
        if (c && c.type === 'toggle') { focusRow(i); clearTimeout(dwell); c.el.click(); } // click → speakToggle에서 상태 읽음
      }
      active = false; axis = null; slider = null; clearTimeout(still);
    }
    section.addEventListener('pointerup', end);
    section.addEventListener('pointercancel', () => { active = false; axis = null; slider = null; clearTimeout(still); });
  }

  function init(o) {
    // 하단바
    if (o.tabbar) {
      listExplorer(o.tabbar, {
        axis: 'x',
        getItems: () => [...o.tabbar.querySelectorAll('.tab')],
        labelOf: (el) => el.textContent.trim(),
        onSelect: (el) => { el.click(); say(`${el.textContent.trim()} 선택됨`); },
      });
    }
    // 길찾기 결과
    if (o.navResults) {
      listExplorer(o.navResults, {
        axis: 'y',
        getItems: () => [...o.navResults.querySelectorAll('.nav-result')],
        labelOf: (el) => { const n = el.querySelector('.nav-result__name'); return n ? n.textContent.trim() : ''; },
        onSelect: (el) => el.click(),
      });
    }
    // 길찾기: 화면(빈 영역) 누른 채로 말하면 음성검색 (push-to-talk)
    if (o.navSection && o.startVoice) {
      let hold = null;
      o.navSection.addEventListener('pointerdown', (e) => {
        if (o.navResults && o.navResults.contains(e.target)) return;
        if (e.target.closest('input')) return;                 // 텍스트 입력은 그대로
        audio();
        hold = setTimeout(() => { hold = null; o.startVoice(); }, 300);
      });
      const release = () => { if (hold) { clearTimeout(hold); hold = null; } o.stopVoice(); };
      o.navSection.addEventListener('pointerup', release);
      o.navSection.addEventListener('pointercancel', release);
    }
    // 설정
    if (o.settingsSection) initSettings(o.settingsSection);
  }

  return { init, resume: audio };
})();
