/*
 * camera.js — getUserMedia + 프레임 캡처/다운스케일/전송 (RN frameSender.ts 대응)
 * 640×480으로 중앙 크롭 → JPEG(q0.5) → ws.send(blob), ~5fps.
 * 주의: getUserMedia는 보안 컨텍스트(https 또는 localhost)에서만 동작.
 */
const Camera = (() => {
  const FRAME_W = 640, FRAME_H = 480;
  let video = null, stream = null, cvs = null, cctx = null, sendTimer = null;

  function init(videoEl) {
    video = videoEl;
    cvs = document.createElement('canvas');
    cvs.width = FRAME_W; cvs.height = FRAME_H;
    cctx = cvs.getContext('2d');
  }

  async function start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('이 브라우저/컨텍스트에서는 카메라를 쓸 수 없어요 (https 또는 localhost 필요).');
    }
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
    video.srcObject = stream;
    await video.play().catch(() => {});
    return true;
  }

  function stop() {
    stopSending();
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (video) video.srcObject = null;
  }

  function captureBlob() {
    return new Promise((resolve) => {
      if (!video || video.readyState < 2) return resolve(null);
      const vw = video.videoWidth, vh = video.videoHeight;
      if (!vw || !vh) return resolve(null);
      const scale = Math.max(FRAME_W / vw, FRAME_H / vh);
      const dw = vw * scale, dh = vh * scale;
      cctx.drawImage(video, (FRAME_W - dw) / 2, (FRAME_H - dh) / 2, dw, dh);
      cvs.toBlob(b => resolve(b), 'image/jpeg', 0.5);
    });
  }

  function startSending(sender, intervalMs = 200) {
    stopSending();
    let inFlight = false;
    sendTimer = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try { const blob = await captureBlob(); if (blob) sender(blob); }
      finally { inFlight = false; }
    }, intervalMs);
  }
  function stopSending() { if (sendTimer) { clearInterval(sendTimer); sendTimer = null; } }

  return { init, start, stop, startSending, stopSending, get active() { return !!stream; }, FRAME_W, FRAME_H };
})();
