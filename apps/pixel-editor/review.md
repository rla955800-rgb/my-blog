# Review — 도트 그림판

검토일: 2026-11-11 · 검토 대상: `apps/pixel-editor/` (index.html, style.css, editor.js, history.js, palette.js, exporter.js, storage.js, ui.js)
환경: Windows, 데스크톱 앱 내장 브라우저(Chromium), Node v26.13.0, `python -m http.server 8000`

## 요약 (통과 / 수정 필요)

**수정 필요** (중간 1건, 고치기 쉬움). 기능은 모두 정상이다.

- 로직 테스트 44/44 통과, PNG(배율 4종) 색·알파·크기 모두 정확, 그리기·지우개·채우기·스포이드·되돌리기·전체 지우기·단축키·키보드 그리기·작업 보존·테마 동기화 모두 spec대로 동작.
- 360/375/768/1280px에서 가로 스크롤 없음, 44px보다 작은 터치 대상 없음, 라이트/다크 글자 대비 모두 4.5:1 이상.
- 확정 사항 7: iframe 높이를 300→2000px로 바꿔도 `.app` 높이는 그대로(폭에만 의존). 단 Embed 쪽 측정 방법에 주의할 점 2가지(아래 2번).
- 고칠 것: 넓은 레이아웃에서 블로그 iframe 폭(약 644px)일 때 도구 막대가 두 줄로 접힘(spec은 한 줄).

## 발견한 문제

### 1. [중간] 넓은 레이아웃에서 도구 막대가 한 줄에 안 들어감 (iframe 폭 600~약 660px)
- 파일: `style.css:489-506` (`@media (min-width: 600px)`의 `.toolbar`·`.tool-group`·`.edit-group`)
- 재현: 폭 644px iframe(블로그 데스크톱 카드 안쪽 폭)이나 600~660px 창에서 앱을 연다 → `[연필][지우개][채우기][스포이드]`와 `[↶][↷][#][전체 지우기]`가 두 줄로 나뉨.
- 측정: 글자 있는 도구 묶음 345.6px + 편집 묶음 272.2px + 간격 12px = 약 630px가 필요한데, 644px iframe의 콘텐츠 폭은 612px. 그래서 높이가 561.6px(한 줄)이 아니라 613.6px가 됨. 768px 이상 단독 실행에서는 한 줄.
- spec 5절 넓은 화면 그림은 "한 줄"이고, 블로그 데스크톱 카드가 정확히 이 폭이라 대부분의 사용자가 이 상태를 보게 된다.
- 제안: 넓은 레이아웃에서 약 20px만 줄이면 된다. 예를 들어 `.toolbar` 가로 간격 12→8px, `.edit-group`의 `padding-left` 12→8px, `.tool-button` 좌우 패딩 8→6px(8개 × 4px = 32px 절약). 또는 600~679px 구간에서만 편집 묶음의 "전체 지우기" 글자를 숨기고 `aria-label`을 그대로 둔다.

### 2. [중간·Embed 참고] 자동 높이 맞춤 측정 때 주의할 점 (앱 수정은 필요 없음)
- (a) `body { min-height: 100vh }`(`style.css:82`, 확정 7에서 허용) 때문에 `document.documentElement.scrollHeight`는 **iframe 높이보다 작아지지 않는다**. 예: 높이 1200px iframe에서 scrollHeight = 1200(콘텐츠는 832). 그래서 부모가 scrollHeight로 맞추면 창을 넓혀(좁음→넓음) 콘텐츠가 832→614로 줄어도 iframe이 줄어들지 않는다.
- (b) Windows처럼 스크롤바가 자리를 차지하는 환경에서는, 콘텐츠보다 낮은 iframe에 세로 스크롤바(15px)가 생기면서 콘텐츠 폭이 줄고 높이가 바뀐다. 예: 폭 360px에서 스크롤바가 있으면 817px, 없으면 832px. 스크롤바가 있는 상태에서 잰 값으로 맞추면 15px 모자라 다시 스크롤이 생길 수 있다.
- 제안(Embed 단계): `scrollHeight` 대신 `contentDocument.querySelector('.app').getBoundingClientRect().height`(또는 `body.firstElementChild`)를 재고, iframe에 `scrolling="no"`나 `overflow: hidden`을 주어 스크롤바 없이 잰다. 폭이 바뀔 때 다시 재려면 iframe 문서 안의 `.app`에 `ResizeObserver`를 건다. 아래 실측표는 "스크롤바 없음" 값(맞춘 뒤 최종 상태) 기준이다.

### 3. [낮음] 포인터 캡처가 실패하면 획이 끝나지 않을 수 있음
- 파일: `ui.js:284-290`, `ui.js:327-334`
- `setPointerCapture`가 예외를 던지는 환경에서 캔버스 밖으로 나간 뒤 손을 떼면 `pointerup`을 받지 못해, 다음 `pointerdown`이나 도구 변경 때까지 획(`ctx.stroke`)이 남는다. 다음 입력에서 `finishStroke()`로 정리되므로 데이터 손상은 없다.
- 제안: 캡처 실패 시 `window`에 일회성 `pointerup` 리스너를 붙여 획을 끝낸다. (보통 브라우저에서는 캡처가 되므로 우선순위는 낮음)

### 4. [낮음] 사용자 색 스와치의 선택 상태가 보조기기에 전달되지 않음
- 파일: `index.html:73-76`, `ui.js:118`
- 팔레트 16색은 `aria-pressed`로 상태를 알리지만, 사용자 색은 `<input type="color">`라 `.is-selected` 클래스(시각 표시)만 있다. spec 12절 "각 스와치 aria-label·aria-pressed 정확" 중 사용자 색은 상태 정보가 없다.
- 제안: 선택됐을 때 `aria-label`을 "사용자 색 고르기, 선택됨 #ab12cd"처럼 바꾸거나 `aria-describedby`로 현재 색 텍스트를 연결한다.

### 5. [낮음] 로드 때 콘솔 info 메시지 "Autofocus processing was blocked…"
- 파일: `index.html:111` (닫힌 `<dialog>` 안 `autofocus`)
- 에러·경고는 아니고 대화상자를 열면 "취소"에 포커스가 정상으로 간다. 콘솔을 깨끗하게 하려면 `autofocus`를 빼고 `openClearDialog()`에서 `showModal()` 뒤 취소 버튼에 직접 `focus()`.

### 6. [낮음] macOS Ctrl+클릭
- `ui.js:268-275`: macOS에서 Ctrl+클릭은 `button === 0`이라 연필로 칠해지고, 컨텍스트 메뉴는 막힌다. 오른쪽 버튼 지우개를 기대한 사용자에게는 다르게 보일 수 있다(트랙패드 두 손가락 클릭은 정상). 원하면 `event.ctrlKey && isMac`일 때 지우개로 처리.

### 7. [낮음·참고] 다크 모드 체크무늬·격자선이 은은함
- 체크무늬 두 색 대비: 라이트 1.25:1, 다크 1.16:1. 격자선 알파 0.14. 스크린샷으로 보면 구분은 되지만 다크에서는 약하다. 장식 요소라 대비 기준 대상은 아니고, 원하면 다크 `--grid-line` 알파를 0.2 정도로 올린다.

## 체크리스트 결과 (spec 12절)

### 로직 (Node로 새로 작성한 44개 테스트, 모두 통과)
- ✅ `lineCells(0,0,5,2)` 양 끝 포함·8방향 인접·6칸, `(3,3,3,3)` 1칸, 역방향 같은 개수, 무작위 300개 선분 모두 인접·`max(dx,dy)+1`칸
- ✅ `setPixel` 같은 색/범위 밖(음수·16·소수) → 원래 참조
- ✅ `floodFill`: 빈 캔버스 256칸, 대각선만 닿은 영역 제외, 닫힌 사각형 안쪽 9칸만, 대상색 = 현재 색 → 원래 참조, (0,0)·(15,15) 시작, 투명 영역 채우기, `null`로 채우기(지우기)
- ✅ `history`: 51번 commit 후 undo 정확히 50회, undo 후 새 commit → redo 불가, 같은 참조 commit 무시
- ✅ `normalizeColor('#ABC')` → `'#aabbcc'`, `'red'`·`'#12345'`·비문자열 → `null`
- ✅ (추가) `drawLine`·`clearPixels` 무변화 시 원래 참조, `pointToCell` clamp, PALETTE 16색 소문자·중복 없음

### 그리기 조작 (브라우저, PointerEvent 디스패치 + 화면 확인)
- ✅ 연필 클릭 1칸, (0,15)→(15,0) 한 번에 이동해도 대각선 16칸 끊김 없음, 캔버스 위쪽 200px 밖으로 끌면 맨 윗줄에 clamp, 획 도중에는 저장하지 않음(획 끝에 저장)
- ✅ 지우개 드래그 → 체크무늬 복귀
- ✅ 오른쪽 버튼 드래그 = 지우개, 채우기 도구에서 오른쪽 버튼 = 투명 채우기, 캔버스 위 `contextmenu` 막힘·캔버스 밖은 안 막힘, 가운데 버튼 무시
- ✅ 스포이드: 색 칸 → 현재 색 변경·직전 도구(채우기) 복귀 / 투명 칸 → 지우개, 현재 색 "투명"
- ✅ 한 획·채우기·전체 지우기 각 1단계, 다시하기, 버튼 활성/비활성 정확, 빈 캔버스에서 전체 지우기 비활성
- ✅ 전체 지우기: 취소/Esc → 변화 없음·포커스 전체 지우기 버튼으로 복귀, 확인 → 전부 투명·포커스 캔버스로(버튼이 비활성이 되므로), 되돌리기로 복구
- ✅ 격자 토글: 칸 `box-shadow`만 바뀜, PNG는 DOM과 무관하게 그려 격자선 없음

### 키보드 (실제 키 입력)
- ✅ Tab 순서: 도구 4개 → (활성일 때 되돌리기/다시하기/전체 지우기) → 격자 → 캔버스 → 스와치 16개 → 사용자 색 → 배율 → 저장, 모두 `:focus-visible` 일치
- ✅ 방향키 이동·가장자리 멈춤(왼쪽 10번 → x=0), Space 칠하기, Shift+→ 3번 = 1단계, Enter로 채우기·스포이드, 커서 위치 안내("16행 4열, 투명")
- ✅ P/E/F/I/G, Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y, Meta+Z 동작. 한글 자판(`key: 'ㄷ'`, `code: KeyE`)도 동작. `<select>`·색 입력 포커스 중·대화상자 열림 중에는 무시. Ctrl+S·Ctrl+P·Alt+E·Ctrl+Alt+Z는 가로채지 않음
- ✅ 처리한 키로 스크롤 안 됨(긴 페이지에서 방향키 후 `scrollY` 0), iframe 안에서도 방향키·Space `defaultPrevented`

### 팔레트
- ✅ 16색 + 사용자 색, 선택 이중 링이 라이트/다크·흰색/검정 위에서 보임(스크린샷 확인)
- ✅ 사용자 색 `#AB12CD` 입력 → 현재 색·스와치 배경 갱신, 저장값 `#ab12cd`
- ⚠️ 16색 `aria-label`·`aria-pressed` 정확. 사용자 색은 선택 상태 정보 없음(문제 4)

### PNG (브라우저에서 `exporter.js` import, `createImageBitmap` + `getImageData`로 전 픽셀 비교)
- ✅ ×1/×8/×16/×32 → 16/128/256/512px (`naturalWidth`도 같음), `image/png`
- ✅ 투명 칸 알파 0, 칠한 칸 RGB가 hex와 정확히 일치(16색 + `#123456`), 모든 픽셀 비교에서 불일치 0 → 경계 보간 없음
- ✅ 파일 이름 `pixel-art-20261111-153012-256px.png`, 한 자리 월·일·시 0 채움, 빈 캔버스 → 전부 알파 0
- ✅ `toBlob`이 `null`을 주거나 없을 때 `toDataURL` 대체 경로도 올바른 PNG
- ✅ 저장 버튼: `<a download>`가 문서에 붙은 채 클릭되고 바로 제거, 1초 뒤 `revokeObjectURL` 1회, 안내 "128×128 PNG로 저장했어요" (클릭을 가로채 확인. 실제 파일 저장은 하지 않음)
- ⚠️ 블로그 메인 iframe 안 다운로드: 아직 임베드 전이라 확인 못함. Firefox·모바일 Safari 확인 못함

### 작업 보존
- ✅ 새로고침 후 그림·현재 색(사용자 색)·도구·격자·배율 유지, 되돌리기 비활성(기록 초기화)
- ✅ 잘못된 JSON, `pixels` 길이 1, `'red'` 칸, 이상한 tool/scale/showGrid, version 2, 배열·`null`·숫자 → 예외 없이 해당 필드만 버림
- ✅ `localStorage.getItem`/`setItem`이 예외를 던지게 바꾼 상태에서 `loadSaved()` → `{}`, `saveState()` 예외 없음 (모듈 단위 확인. 앱 전체를 차단 환경에서 띄우지는 않음)

### 터치·반응형·테마
- ✅ 터치 PointerEvent: 탭·드래그 그리기, 두 번째 손가락(`isPrimary: false`) 무시, 터치는 호버 표시 없음, 캔버스 `touch-action: none`, html·body `overscroll-behavior: none`
- ✅ 360·375(모바일 프리셋)·768·1280px에서 `scrollWidth === innerWidth`, 캔버스 정사각형(360px에서 328×328), 44px보다 작은 버튼·스와치·select 없음
- ⚠️ 768px 이상 단독 실행은 도구 막대 한 줄, 블로그 iframe 폭(644px)에서는 두 줄(문제 1)
- ✅ 폭별 높이 실측(아래 표)
- ✅ 대비(라이트/다크): 글자/배경 15.8/15.15, `--muted`/배경 5.65/7.28, `--muted`/`--surface` 5.27/6.68, `--accent`/배경 6.15/7.47, `--accent-text`/`--accent` 6.15/7.25, `--accent`/`--accent-soft` 5.29/5.97. 체크무늬·격자선·커서 구분됨(다크 스크린샷 확인, 문제 7 참고)
- ✅ OS 다크(`colorScheme` 에뮬레이션) → 다크, `localStorage.theme = 'light'`가 OS 다크보다 우선, 같은 출처 iframe에서 부모가 `theme`를 light/dark/삭제하면 `storage` 이벤트로 즉시 반영. 앱 자체 토글 없음
- ✅ `prefers-reduced-motion`: 전환은 `.tool-button`에만 있고 reduce에서 `transition: none` (코드 확인)

### 기타
- ✅ 콘솔 에러·경고 없음 (info 1건: 문제 5. 서버 시작 전에 남은 `ERR_CONNECTION_REFUSED`는 앱과 무관)
- ✅ `apps/pixel-editor/` 밖 수정 없음 (git 상태: `apps/pixel-editor/` 추가, `.claude/launch.json`의 `blog-alt` 설정 추가는 Build 지침 범위 밖 파일이지만 앱 코드가 아니라 실행 설정임. 누가 바꿨는지 확인 권장), 블로그 `css/`·`js/` import 없음, 외부 라이브러리 없음, 상대 경로만 사용
- ✅ 색 값은 `:root` 토큰에만(팔레트 데이터·인라인 `--swatch` 제외), `!important`·ID 선택자 스타일 없음, ES 모듈·2칸·세미콜론·작은따옴표·전역 변수 없음(상태는 모듈 스코프 `ctx`), `node --check` 전부 통과, 포인터 `pointercancel`·`lostpointercapture` 처리, `revokeObjectURL` 호출

## 폭별 콘텐츠 높이 실측

같은 출처 iframe에 앱을 띄우고 `.app`의 `getBoundingClientRect().height`를 쟀다(px). **iframe 높이를 300/600/1200/2000px로 바꿔도 스크롤바 유무가 같으면 높이는 같다** → 확정 사항 7 충족. "스크롤바 있음"은 iframe이 콘텐츠보다 낮아 Windows 스크롤바(15px)가 폭을 차지한 경우.

| iframe 폭 | 레이아웃 | 캔버스 | 팔레트 칸/줄 | 높이 (스크롤바 없음, 최종) | 높이 (스크롤바 있음) |
| --- | --- | --- | --- | --- | --- |
| 294 (화면 360) | 좁음 | 262 | 5 | **866** | 851 |
| 320 | 좁음 | 288 | 6 | **844** | 877 |
| 346 (화면 412) | 좁음 | 314 | 6 | **818** | 803 |
| 360 | 좁음 | 328 | 6 | **832** | 817 |
| 400 | 좁음 | 368 | 7 | **849.6** | 857 |
| 412 | 좁음 | 380 | 8 | **861.6** | 846.6 |
| 480 / 534 (화면 600) / 560 / 599 | 좁음(글자 있는 도구) | 384 | 9~11 | **817.6** | 817.6 |
| 600 / 620 / 644 (화면 768+) | 넓음, 도구 막대 2줄 | 344 / 364 / 384 | 4 | **613.6** | 613.6 |
| 680 / 단독 768·1280 | 넓음, 도구 막대 1줄 | 384 | 4 | **561.6** | 561.6 |

- spec 11절 예상(좁음 약 770~780, 넓음 약 590)보다 좁은 화면은 약 50~90px 높고, 블로그 데스크톱 폭(644)은 도구 막대 접힘 때문에 614. 문제 1을 고치면 644px에서 561.6이 된다.
- 폭이 커지는데 높이가 오르내리는 것(294→320→346)은 팔레트 줄 수(17칸 ÷ 칸/줄)와 저장 줄 줄바꿈 때문이고 정상.
- `documentElement.scrollHeight`는 `body { min-height: 100vh }` 때문에 iframe 높이보다 작게 나오지 않는다(예: 1200px iframe → 1200). 자동 맞춤에는 `.app` 높이를 써야 한다(문제 2).

## 확인하지 못한 것

- 블로그 메인 iframe 안에서 실제 PNG 다운로드(아직 임베드 전), Firefox·Safari·실제 모바일 기기
- 실제 터치 기기의 당겨서 새로고침·스크롤 방지 (모바일 프리셋에서 `maxTouchPoints`가 0이라 합성 PointerEvent로만 확인)
- `localStorage` 차단 상태로 앱 전체를 처음부터 띄우는 경우 (모듈 함수 단위로만 확인)
- 스크린 리더로 실제 읽기(`aria-live` 문구는 DOM 값으로만 확인)
- `prefers-reduced-motion` 에뮬레이션에서의 화면 동작 (CSS 코드로만 확인)

## 수정 반영 (메인 에이전트 기록)

- 중간 1(600~660px 도구 막대 두 줄): Build가 넓은 레이아웃 간격·패딩·아이콘 크기를 줄여 600px 이상 전 구간 한 줄로 수정. Build 실측 `.app` 높이 561.6px(600~1280px).
- 중간 2(Embed 참고): 블로그 `js/main.js`가 iframe `body` 직계 자식의 아래 끝으로 콘텐츠 높이를 재고(`min-height: 100vh` 영향 없음), 맞추는 동안 iframe 문서의 세로 스크롤바를 숨김. `ResizeObserver`와 iframe `resize` 이벤트로 폭이 바뀔 때 다시 맞춤.
- 블로그 카드 안에서 확인: 360px·768px·1280px에서 두 앱 모두 잘림·가로 스크롤 없음. 카드 안에서 PNG 저장을 누르면 `pixel-art-…-256px.png` blob 다운로드 링크가 만들어짐(실제 파일 저장 대화상자는 확인 못 함).
- 낮음 5건: 이번 범위에서는 수정하지 않음.
