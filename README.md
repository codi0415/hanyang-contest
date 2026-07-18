# 보행 도우미 (WalkAssist) — React Native

시각장애인 보행 보조 앱 프론트엔드. Expo(dev client) + TypeScript.

## 기능
- **점자블록 이탈 안내** (정상 / 좌 / 우 + 방향 화살표)
- **종류별 장애물 감지 UI**: 사람 · 기둥 · 물웅덩이 · 계단(↑/↓) · 기타 + 보도블록(경로 안내, 위험 아님)
- **신호등 인식**: 색상(빨강/초록) 표시 + 신뢰도. 임계값 미만/판단불가 시 "직접 확인하세요"로 대체 (단정 금지)
- **감지 요약 칩** / **근접 경고 카드**
- **음성 안내 우선순위 큐**: 이탈 > 근접 장애물 > 신호등 > 중거리 장애물 (새치기 + 디바운스)
- **설정**: 음성 on/off·속도·볼륨, 진동, 감지 신뢰도 임계값, 서버 주소/Mock 전환

## 백엔드 연동
WebSocket `/ws/stream` (기본 `ws://127.0.0.1:8000/ws/stream`)
- 클라 → 서버: JPEG 바이너리 프레임 (640px 다운스케일, ~3fps)
- 서버 → 클라: `{ frame_id, deviation, obstacles[], depth_corroboration }`
- 서버가 없으면 **설정에서 "서버 연결"을 꺼서 Mock 데이터로** UI/음성 검증 가능

## 실행
```bash
npm install
npx expo install        # 네이티브 의존성 버전 정합화 (권장)
npx expo prebuild        # 네이티브 프로젝트 생성
npx expo run:ios         # 또는 npx expo run:android  (실기기 권장: 카메라 필요)
```
> Expo Go 로는 실행 불가 (vision-camera 네이티브 모듈). **dev client / 실기기** 필요.
> LAN IP로 접속 시 카메라는 https(보안 컨텍스트)에서만 동작.

## 구조
```
src/
  types.ts                  서버 스키마 + 파생 타입
  theme.ts                  디자인 토큰 + 카테고리 메타
  store/useStore.ts         Zustand (화면/설정/기록)
  net/wsClient.ts           WebSocket (재연결)
  mocks/mockSource.ts       Mock 소스
  perception/
    classify.ts             라벨 → 카테고리(신호등 색/계단 방향)
    process.ts              메시지 → 파생 상태
    frameSender.ts          카메라 캡처 → 다운스케일 → 전송
    useDetectionSource.ts   소스 구독 + 음성/진동/기록
  tts/announcementQueue.ts  우선순위 음성 큐
  screens/ · components/    UI
shared-contract/            AI 코어 트랙과 공유하는 원형 계약
```

## 알아둘 점
- 프레임 전송은 `takePhoto` + 리사이즈(~3fps)로 크로스플랫폼 우선 구현. 성능이 필요하면
  vision-camera **frame processor + JPEG 인코더 플러그인**으로 교체(권장 최적화 경로).
- 거리(near/mid/far)는 단안이라 박스 크기로 **추정**하며 UI에도 "추정 거리"로 표기.
