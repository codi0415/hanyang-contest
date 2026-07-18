import * as ImageManipulator from 'expo-image-manipulator';
import type { Camera } from 'react-native-vision-camera';
import type { MutableRefObject } from 'react';
import { FrameSize } from '../types';

/*
 * 카메라 프레임을 주기적으로 캡처 → 640px로 다운스케일 → JPEG → WebSocket 전송.
 *
 * 참고: vision-camera의 정석은 frame processor + JPEG 인코더 플러그인이지만,
 * 1주 프로토타입에서는 takePhoto(speed 우선) + image-manipulator 리사이즈로
 * 크로스플랫폼 동작을 우선한다. (~3fps) 성능이 필요하면 프레임 프로세서로 교체.
 *
 * 백엔드 권장: 640×480 이하, ~200ms 간격. 서버가 프레임마다 YOLO를 돌리므로
 * 원본을 그대로 보내면 밀린다 → 반드시 다운스케일해서 전송.
 */
export class FrameSender {
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight = false;

  constructor(
    private cameraRef: MutableRefObject<Camera | null>,
    private send: (data: ArrayBuffer) => boolean,
    private onFrameSize: (s: FrameSize) => void,
  ) {}

  private async tick() {
    if (this.inFlight) return;
    const cam = this.cameraRef.current;
    if (!cam) return;
    this.inFlight = true;
    try {
      const photo = await cam.takePhoto({ flash: 'off', enableShutterSound: false });
      const uri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
      const manip = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 640 } }], {
        compress: 0.5,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      this.onFrameSize({ w: manip.width, h: manip.height });
      const res = await fetch(manip.uri);
      const buf = await res.arrayBuffer();
      this.send(buf);
    } catch {
      // 캡처 실패 프레임은 조용히 스킵 (다음 틱에서 재시도)
    } finally {
      this.inFlight = false;
    }
  }

  start(intervalMs = 300) {
    this.stop();
    this.timer = setInterval(() => this.tick(), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
