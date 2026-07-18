/*
 * ws-client.js — /ws/stream WebSocket 래퍼 (자동 재연결). RN wsClient.ts와 동일.
 *   클라 → 서버 : JPEG 바이너리 프레임 (ws.send(blob))
 *   서버 → 클라 : JSON 텍스트 / 실패 시 {error:"invalid_frame"}
 */
class WSClient {
  constructor(onMessage, onStatus) {
    this.onMessage = onMessage;
    this.onStatus = onStatus || (() => {});
    this.ws = null; this.url = null; this.wantOpen = false;
    this.retry = 0; this.retryTimer = null;
  }
  connect(url) { this.url = url; this.wantOpen = true; this._open(); }
  _open() {
    if (!this.wantOpen) return;
    this._clearRetry();
    this.onStatus('connecting');
    let ws;
    try { ws = new WebSocket(this.url); } catch { this._scheduleRetry(); return; }
    ws.binaryType = 'arraybuffer';
    this.ws = ws;
    ws.onopen = () => { this.retry = 0; this.onStatus('live'); };
    ws.onclose = () => { this.onStatus('offline'); if (this.wantOpen) this._scheduleRetry(); };
    ws.onerror = () => {};
    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.error) return;              // invalid_frame 등 먼저 걸러냄
      this.onMessage(msg);
    };
  }
  _scheduleRetry() {
    this._clearRetry();
    this.retry = Math.min(this.retry + 1, 6);
    const delay = Math.min(500 * 2 ** (this.retry - 1), 8000);
    this.onStatus('connecting');
    this.retryTimer = setTimeout(() => this._open(), delay);
  }
  _clearRetry() { if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null; } }
  send(blob) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) { this.ws.send(blob); return true; }
    return false;
  }
  isOpen() { return this.ws && this.ws.readyState === WebSocket.OPEN; }
  close() {
    this.wantOpen = false; this._clearRetry();
    if (this.ws) { try { this.ws.close(); } catch {} this.ws = null; }
    this.onStatus('offline');
  }
}
