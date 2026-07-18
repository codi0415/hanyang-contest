import { ConnState, ServerMessage } from '../types';

/*
 * /ws/stream WebSocket 래퍼 (자동 재연결).
 *   클라 → 서버 : JPEG 바이너리 프레임 (ws.send(ArrayBuffer))
 *   서버 → 클라 : JSON 텍스트 (ServerMessage) / 실패 시 {error:"invalid_frame"}
 * 서버는 상태 비저장 → 재연결해도 문제없음.
 */
export class WSClient {
  private ws: WebSocket | null = null;
  private url = '';
  private wantOpen = false;
  private retry = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private onMessage: (msg: ServerMessage) => void,
    private onStatus: (s: ConnState) => void,
  ) {}

  connect(url: string) {
    this.url = url;
    this.wantOpen = true;
    this.open();
  }

  private open() {
    if (!this.wantOpen) return;
    this.clearRetry();
    this.onStatus('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this.scheduleRetry();
      return;
    }
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => {
      this.retry = 0;
      this.onStatus('live');
    };
    ws.onclose = () => {
      this.onStatus('offline');
      if (this.wantOpen) this.scheduleRetry();
    };
    ws.onerror = () => {
      /* onclose가 이어서 처리 */
    };
    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return; // 서버는 JSON 텍스트만 보냄
      let msg: any;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.error) return; // invalid_frame 등 먼저 걸러냄
      this.onMessage(msg as ServerMessage);
    };
  }

  private scheduleRetry() {
    this.clearRetry();
    this.retry = Math.min(this.retry + 1, 6);
    const delay = Math.min(500 * 2 ** (this.retry - 1), 8000);
    this.onStatus('connecting');
    this.retryTimer = setTimeout(() => this.open(), delay);
  }

  private clearRetry() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  send(data: ArrayBuffer): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
      return true;
    }
    return false;
  }

  isOpen() {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  close() {
    this.wantOpen = false;
    this.clearRetry();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.onStatus('offline');
  }
}
