# 보행 도우미 — HTML 웹 버전

RN 앱과 **동일한 로직**(COCO 14종, 근접>이탈 우선순위, 장애물별 distance, 신뢰도 게이팅,
신호등=일반 장애물)을 그대로 옮긴 웹 프론트엔드. 디자인도 동일.

## 백엔드 연동
- WebSocket `/ws/stream` 로 JPEG 프레임(640×480, ~5fps) 전송 → JSON 수신
- 서버 주소는 **기본적으로 페이지를 서빙한 곳과 같은 오리진**으로 자동 연결
  (https 페이지 → `wss://`, http → `ws://`). 설정 화면에서 수동 지정도 가능.
- 서버 없이 열면 **Mock 모드**로 UI/음성 검증.

## 실행 방법
### A. 백엔드가 직접 서빙 (권장 — 카메라+WS 같은 오리진)
FastAPI가 `frontend/` 폴더를 `/`에 서빙하므로, **이 `web/` 안의 파일들을 백엔드의 `frontend/` 폴더에 복사**하면 됩니다.
- 로컬(맥): `uvicorn app.main:app --host 0.0.0.0 --port 8000` → `http://127.0.0.1:8000/` (localhost는 보안 컨텍스트라 카메라 OK)
- 폰(LAN): 카메라는 **https** 필요 → 백엔드 https 런처(`run_https.py`, **포트 8443**)로 서빙하고 폰에서 `https://<맥IP>:8443/` 접속
  - 자체서명 인증서라 폰에서 **최초 1회 수동 신뢰**("세부사항 보기 → 이 웹사이트 방문"). 페이지·wss가 같은 포트라 1회 신뢰로 둘 다 커버됨.

### B. 단독 서빙(테스트)
`python3 -m http.server` 로 이 폴더를 띄우고, 설정 화면에서 서버 주소를 직접 입력.

## mixed-content — ✅ 확인 완료
폰에서 카메라를 쓰려면 페이지가 https여야 하고 WebSocket도 wss여야 하는데,
백엔드 `run_https.py`가 **정적 페이지와 `/ws/stream`을 같은 https/wss 오리진·포트(8443)** 로 서빙함을
백엔드 트랙에서 `wss://<맥IP>:8443/ws/stream` 왕복으로 실측 확인했습니다. → mixed-content 안 막힘, 프론트 수정 불필요.

## 길안내 (내비게이션)
- 목적지 **텍스트 입력 + 음성(SpeechRecognition, 보조)** → `/nav/search` → 후보 리스트 → 선택
- 현재 위치는 `navigator.geolocation.watchPosition()`(HTTPS 필요) 실시간 추적
- 출발(현재 GPS)+도착으로 `/nav/route` → steps 수신 → GPS 갱신마다 **다음 step까지 haversine 거리** 계산
  → 근접 시 `description`을 음성 안내("N미터 앞 …"). 안내는 메인(카메라) 화면 배너로도 표시.
- 음성 우선순위: 근접 장애물 > 이탈 > 군중 > **내비** > 신호등 (장애물/이탈 뜨면 내비가 양보).
- 서버 연결(설정)이 꺼져 있으면 **Mock + GPS 시뮬레이션**으로 데모 동작.

> ⚠️ `/nav/search`·`/nav/route` 응답 스키마는 **가정값**으로 구현(배열/래핑 모두 수용).
> 실제 계약 확정되면 `js/nav.js`의 fetch/parse만 맞추면 됩니다. (아래 "백엔드 확인 필요" 참고)

### 백엔드 확인 필요 (js/nav.js 상단 주석에도 명시)
- `/nav/search` 요청/응답 필드명 (특히 좌표 `lat`/`lng`)
- `/nav/route` 응답의 **각 step에 좌표(lat/lng) 포함 여부** ← 안내 트리거에 필수
- `distance` 단위/의미(이전 step 대비 m?), 좌표계 WGS84 여부, `/nav/*` same-origin 여부

## 구조
```
web/
  index.html
  css/style.css
  js/labels.js      COCO 14종 라벨 메타
  js/tts.js         우선순위 음성 큐 (근접>이탈>군중>내비>신호등>중거리)
  js/process.js     메시지→파생 상태 (distance 우선, bbox 폴백)
  js/overlay.js     바운딩 박스 캔버스
  js/ws-client.js   WebSocket(재연결)
  js/mock.js        Mock 소스
  js/camera.js      getUserMedia → 640×480 JPEG 전송
  js/nav.js         길안내(검색/경로/GPS 안내) + Mock
  js/app.js         화면/음성/기록/내비 오케스트레이션
```
디버그: 콘솔에서 `WalkAssist.feed({frame_id:1,deviation:'normal',obstacles:[...],depth_corroboration:null})` 로 임의 프레임 주입 가능.
