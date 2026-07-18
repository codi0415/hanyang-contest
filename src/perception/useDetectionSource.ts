import { MutableRefObject, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import type { Camera } from 'react-native-vision-camera';

import { ConnState, Deviation, Detection, FrameSize } from '../types';
import { useStore } from '../store/useStore';
import { TTS } from '../tts/announcementQueue';
import { WSClient } from '../net/wsClient';
import { MockSource, MOCK_FRAME_SIZE } from '../mocks/mockSource';
import { FrameSender } from './frameSender';
import { process } from './process';
import { voiceName } from './classify';

export interface WalkState {
  deviation: Deviation;
  dets: Detection[];
  traffic: Detection | null;
  topObstacle: Detection | null;
  frameSize: FrameSize;
  conn: ConnState;
}

const EMPTY: WalkState = {
  deviation: 'normal',
  dets: [],
  traffic: null,
  topObstacle: null,
  frameSize: MOCK_FRAME_SIZE,
  conn: 'connecting',
};

/**
 * 세션이 active일 때 Mock 또는 WS+카메라 소스를 켜고,
 * 각 프레임을 UI 파생상태 + 음성/진동/기록으로 반영한다.
 */
export function useDetectionSource(cameraRef: MutableRefObject<Camera | null>, active: boolean) {
  const [state, setState] = useState<WalkState>(EMPTY);
  const live = useStore((s) => s.settings.live);
  const wsUrl = useStore((s) => s.settings.wsUrl);
  const pushHistory = useStore((s) => s.pushHistory);

  // 자주 바뀌는 설정은 ref로 읽어 소스를 재구독하지 않게 함
  const settingsRef = useRef(useStore.getState().settings);
  useEffect(() => useStore.subscribe((s) => (settingsRef.current = s.settings)), []);

  const frameSizeRef = useRef<FrameSize>(MOCK_FRAME_SIZE);

  useEffect(() => {
    if (!active) return;

    const handle = (msg: Parameters<typeof process>[0]) => {
      const conf = settingsRef.current.conf;
      const haptic = settingsRef.current.haptic;
      const r = process(msg, conf, frameSizeRef.current.h);

      // ── 이탈 안내 (최우선) ──
      if (r.deviation !== 'normal') {
        const goRight = r.deviation === 'left'; // 왼쪽 이탈 → 오른쪽으로 이동
        TTS.announce(
          'deviation',
          goRight
            ? '점자블록에서 왼쪽으로 벗어났어요. 오른쪽으로 이동하세요.'
            : '점자블록에서 오른쪽으로 벗어났어요. 왼쪽으로 이동하세요.',
        );
        if (haptic) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        pushHistory({
          label: goRight ? '경로 이탈 (좌)' : '경로 이탈 (우)',
          detail: goRight ? '오른쪽으로 이동' : '왼쪽으로 이동',
          risk: 'mid',
        });
      }

      // ── 신호등 (신뢰도 이상일 때만 단정) ──
      if (r.traffic && !r.traffic.below && r.traffic.sub !== 'unknown') {
        TTS.announce(
          'traffic',
          r.traffic.sub === 'red'
            ? '빨간불로 보여요. 멈추고 직접 확인하세요.'
            : '초록불로 보여요. 하지만 직접 확인하고 건너세요.',
        );
      }

      // ── 장애물 ──
      if (r.topObstacle) {
        const t = r.topObstacle;
        const near = t.risk === 'near';
        const vname = voiceName(t.cat, t.sub);
        TTS.announce(
          near ? 'obstacleNear' : 'obstacleMid',
          near ? `전방 가까이 ${vname} 있어요. 주의하세요.` : `전방에 ${vname} 있어요.`,
        );
        if (near && haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        pushHistory({ label: `${t.name} 감지`, detail: `전방 ${t.risk === 'near' ? '가까움' : t.risk === 'mid' ? '보통' : '멂'} · ${t.confPct}%`, risk: t.risk });
      }

      setState({ ...r, frameSize: frameSizeRef.current, conn: live ? 'live' : 'mock' });
    };

    if (live) {
      const ws = new WSClient(handle, (conn) => setState((s) => ({ ...s, conn })));
      ws.connect(wsUrl);
      const sender = new FrameSender(
        cameraRef,
        (buf) => ws.send(buf),
        (sz) => (frameSizeRef.current = sz),
      );
      sender.start(300);
      return () => {
        sender.stop();
        ws.close();
      };
    } else {
      frameSizeRef.current = MOCK_FRAME_SIZE;
      const mock = new MockSource();
      setState((s) => ({ ...s, conn: 'mock' }));
      mock.start(handle, 900);
      return () => mock.stop();
    }
  }, [active, live, wsUrl, cameraRef, pushHistory]);

  return state;
}
