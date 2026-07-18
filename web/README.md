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
- 폰(LAN): 카메라는 **https(보안 컨텍스트)** 필요 → 백엔드 https 런처(`run_https.py`)로 서빙하고 폰에서 `https://<맥IP>:포트/` 접속

### B. 단독 서빙(테스트)
`python3 -m http.server` 로 이 폴더를 띄우고, 설정 화면에서 서버 주소를 직접 입력.

## ⚠️ 데모 전 반드시 확인 (mixed-content)
폰에서 카메라를 쓰려면 페이지가 **https** 여야 하고, 그러면 WebSocket도 **반드시 `wss://`** 여야 합니다
(https 페이지는 평문 `ws://`로 연결 불가 — 브라우저가 차단). 즉 백엔드 https 런처가
**정적 페이지와 `/ws/stream`을 같은 https/wss 오리진**으로 서빙해야 합니다. (백엔드 트랙에 확인 필요)

## 구조
```
web/
  index.html
  css/style.css
  js/labels.js      COCO 14종 라벨 메타
  js/tts.js         우선순위 음성 큐 (근접>이탈>신호등>중거리)
  js/process.js     메시지→파생 상태 (distance 우선, bbox 폴백)
  js/overlay.js     바운딩 박스 캔버스
  js/ws-client.js   WebSocket(재연결)
  js/mock.js        Mock 소스
  js/camera.js      getUserMedia → 640×480 JPEG 전송
  js/app.js         화면/음성/기록 오케스트레이션
```
디버그: 콘솔에서 `WalkAssist.feed({frame_id:1,deviation:'normal',obstacles:[...],depth_corroboration:null})` 로 임의 프레임 주입 가능.
