# 도트 그림판 (가제) — 구현 계획

## 1. 개요

- **앱 이름**: 도트 그림판 (가제)
- **한 줄 설명**: 16×16 격자에 도트를 찍어 그림을 그리고, 투명 배경 PNG로 저장하는 픽셀 아트 에디터.
- 위치: `apps/pixel-editor/` (자체 완결, 블로그의 `css/`, `js/`를 import하지 않음, 외부 라이브러리 없음, 상대 경로만 사용)

## 2. 기능

| 기능 | 범위 | 동작 |
| --- | --- | --- |
| 연필 | 기본 | 현재 색으로 칸을 칠함. 드래그하면 지나간 칸을 빠짐없이 칠함 |
| 지우개 | 기본 | 칸을 투명(`null`)으로 되돌림. 드래그 지원 |
| 전체 지우기 | 기본 | 확인 대화상자(`<dialog>`) 후 모든 칸을 투명으로. 되돌리기 가능 |
| PNG 저장 | 기본 | 5절 참고 |
| 채우기 | 기본(제안) | 누른 칸과 **같은 색(투명 포함)으로 상하좌우 연결된 영역**을 현재 색으로 채움. 대각선은 연결로 보지 않음 |
| 스포이드 | 기본(제안) | 누른 칸의 색을 현재 색으로. 투명 칸을 찍으면 지우개 도구로 전환. 한 번 찍은 뒤 직전 도구(연필/채우기)로 자동 복귀 |
| 되돌리기 / 다시하기 | 기본(제안) | 한 번의 획(누름~뗌), 채우기 1회, 전체 지우기 1회가 각각 1단계. 최대 50단계. 새 작업을 하면 다시하기 기록은 버림 |
| 격자선 표시 | 기본(제안) | 켜기/끄기 토글. 기본값 켬. PNG에는 격자선이 들어가지 않음 |

- 선택 기능 4개는 구현 부담이 작아(순수 함수 몇 개) 모두 기본 범위로 넣는 것을 제안 — "결정 필요" 참고
- 아무것도 바뀌지 않은 작업(같은 색 위에 칠하기, 같은 색으로 채우기, 빈 캔버스 전체 지우기)은 기록에 남기지 않음
- 빈 캔버스에서 전체 지우기 버튼은 비활성(`disabled`)

## 3. 색상 팔레트

### 기본 16색 (이 앱 고유 구성)

특정 제품 팔레트를 쓰지 않고, 무채색 4 + 색상환 순서 10 + 피부/살구 계열 2로 직접 구성한다. 각 버튼의 `aria-label`에 한국어 이름을 쓴다.

| # | 이름 | 값 | # | 이름 | 값 |
| --- | --- | --- | --- | --- | --- |
| 1 | 검정 | `#000000` | 9 | 연두 | `#8fd14f` |
| 2 | 진회색 | `#5c5f66` | 10 | 초록 | `#2e9e4f` |
| 3 | 회색 | `#a3a7ad` | 11 | 청록 | `#1f7a8c` |
| 4 | 흰색 | `#ffffff` | 12 | 하늘 | `#4aa8e8` |
| 5 | 고동 | `#7a3e1f` | 13 | 파랑 | `#2f4fd1` |
| 6 | 빨강 | `#d93636` | 14 | 보라 | `#7b3fc4` |
| 7 | 주황 | `#f08a24` | 15 | 분홍 | `#e46aa8` |
| 8 | 노랑 | `#f5d33b` | 16 | 살구 | `#f2c6a0` |

- 팔레트 색은 UI 토큰이 아니라 **그림 데이터**이므로 `palette.js` 상수로 둔다. 스와치 배경은 인라인 CSS 변수(`style="--swatch: #d93636"`)로 넘기고 CSS에서는 `var(--swatch)`만 사용
- 초기 현재 색: 검정

### 사용자 지정 색

- 팔레트 마지막 칸에 `<input type="color">`를 "사용자 색" 스와치로 둔다 (라벨: "사용자 색 고르기")
- 색을 고르면(`input` 이벤트) 그 색이 현재 색이 되고, 스와치 배경이 그 색으로 바뀜. 사용자 색은 1칸만 유지(최근 색 목록은 범위 밖)
- 값은 항상 소문자 `#rrggbb`로 정규화

### 현재 색 표시

- 팔레트 위에 "현재 색" 미리보기 칸 + 색 이름(팔레트 색이면 이름, 아니면 hex) 텍스트
- 선택된 스와치: `aria-pressed="true"` + 두꺼운 테두리(밝은 색·어두운 색 모두 보이도록 바깥 `--text` 링 + 안쪽 `--bg` 링 이중 테두리)
- 지우개 도구일 때 미리보기는 체크무늬 + "투명"

### 투명

- 별도 "투명" 스와치는 두지 않고 **지우개 도구 = 투명**으로 처리 (팔레트는 색, 도구는 동작으로 역할 분리)

## 4. PNG 저장

| 항목 | 내용 |
| --- | --- |
| 출력 크기 | 배율 선택 `<select>`: ×1(16px) / ×8(128px) / ×16(256px, 기본) / ×32(512px) |
| 투명 | 투명 칸은 알파 0으로 유지 (배경을 채우지 않음) |
| 스무딩 | 출력용 캔버스에 직접 `fillRect(x*scale, y*scale, scale, scale)`로 그려 보간이 생기지 않게 함. 추가로 `imageSmoothingEnabled = false` 설정 |
| 파일 이름 | `pixel-art-YYYYMMDD-HHMMSS-{px}px.png` (로컬 시각, 예: `pixel-art-20261111-153012-256px.png`) |
| 방식 | 화면 밖 `<canvas>` → `toBlob('image/png')` → `URL.createObjectURL` → 임시 `<a download>` 클릭 → 잠시 뒤 `revokeObjectURL` |
| 대체 | `toBlob` 미지원/`null`이면 `toDataURL('image/png')`로 같은 방식 다운로드 |
| 빈 그림 | 저장 허용 (완전 투명 PNG) |
| 안내 | 저장 후 `aria-live="polite"` 영역에 "256×256 PNG로 저장했어요" |

- 저장 버튼은 강조색 버튼(앱 안에서 유일한 채움 버튼)
- 마지막으로 고른 배율은 작업 보존(7절)과 함께 저장

## 5. 화면 구성

### 좁은 화면 (폭 600px 미만, 기본)

```
┌──────────────────────────────┐
│ 도트 그림판                   │  ← h1
│ [✏연필][⌫지우개][▨채우기][💧스포이드]│  ← 도구 (aria-pressed)
│ [↶되돌리기][↷다시하기][#격자][🗑전체 지우기]│  ← 편집
│ ┌──────────────────────────┐ │
│ │░▓░▓  16×16 캔버스  ░▓░▓ │ │  ← 정사각형, 폭 100% (최대 384px)
│ │ (투명 칸은 체크무늬)       │ │
│ └──────────────────────────┘ │
│ 현재 색 ■ 빨강                │
│ ■■■■■ ■■■■■                   │  ← 팔레트 (폭에 따라 5~10칸/줄)
│ ■■■■■ ■■[사용자 색]           │
│ 크기 [×16 (256px) ▾] [PNG 저장]│
│ 방향키로 이동, Space로 칠하기  │  ← 조작 안내 (muted, 한 줄)
└──────────────────────────────┘
```

### 넓은 화면 (폭 600px 이상)

```
┌──────────────────────────────────────────────┐
│ 도트 그림판                                    │
│ [연필][지우개][채우기][스포이드] │ [↶][↷][#][전체 지우기] │  ← 한 줄
│ ┌──────────────────┐  현재 색 ■ 빨강          │
│ │                  │  ■■■■                   │
│ │   캔버스 384px    │  ■■■■  (4칸/줄)          │
│ │                  │  ■■■■                   │
│ │                  │  ■■■■ [사용자]           │
│ │                  │  크기 [×16 ▾]            │
│ └──────────────────┘  [PNG 저장]              │
│ 방향키로 이동, Space로 칠하기                  │
└──────────────────────────────────────────────┘
```

- 시맨틱: `<header>`(제목), `<main>`(도구 막대 `role="toolbar"` 없이 `<div class="tool-group" role="group" aria-label="도구">`, 캔버스, 팔레트 `role="group" aria-label="색상 팔레트"`, 저장), `<footer>`(조작 안내)
- 도구 버튼: 아이콘(인라인 SVG, `aria-hidden`) + 짧은 글자. 좁은 화면에서 글자를 숨기면 `aria-label`로 이름 유지
- 레이아웃: 앱 최대 폭 `640px`, 좌우 여백 16px. 넓은 화면은 `grid-template-columns: minmax(0, 384px) 200px`, 간격 24px
- 캔버스 크기: `width: min(100%, 384px)`, `aspect-ratio: 1`. 360px 화면에서 한 칸 약 20px(328/16)
- 모든 버튼·스와치·select는 최소 44×44px. 팔레트는 `grid-template-columns: repeat(auto-fill, minmax(44px, 1fr))`, 간격 4px

## 6. 조작

### 마우스·터치·펜 (Pointer Events)

- 캔버스 요소에 `touch-action: none`, `html/body`에 `overscroll-behavior: none` → 그리는 동안 스크롤·당겨서 새로고침 방지
- `pointerdown`: 주 포인터(`isPrimary`)만 처리. `setPointerCapture`로 캔버스 밖으로 나가도 획 유지. 좌표 → 칸 계산(`getBoundingClientRect`, 0~15로 clamp). 연필/지우개는 칸을 칠하고 "마지막 칸" 기록
- `pointermove`(누르는 중): `getCoalescedEvents()`가 있으면 각 이벤트를 처리. 현재 칸이 마지막 칸과 다르면 **Bresenham 직선**으로 사이 칸까지 모두 칠함 → 빠르게 그어도 끊기지 않음
- `pointerup` / `pointercancel` / `lostpointercapture`: 획 종료, 변화가 있으면 기록 1단계 + 저장 예약
- 채우기·스포이드는 `pointerdown`에서 1회만 동작(드래그 없음)
- 두 번째 손가락 등 비주 포인터는 무시 (핀치 확대는 지원하지 않음, 범위 밖)
- 마우스 호버 시 칸 하이라이트(반투명 테두리)로 어느 칸인지 표시 (터치는 없음)

### 오른쪽 클릭

- 캔버스 위 `contextmenu`는 `preventDefault()` (캔버스 밖은 기본 메뉴 유지)
- 오른쪽 버튼으로 누르고 끌면 **그 획만 지우개**로 동작 (연필/지우개/채우기 도구일 때. 채우기면 투명으로 채우기) — "결정 필요" 참고
- 가운데 버튼 등 기타 버튼은 무시

### 키보드

- 캔버스 요소: `tabindex="0"`, `role="application"`, `aria-label="16×16 그림판"`, `aria-describedby`로 조작 안내 연결
- 키보드 커서: 포커스가 들어오면 커서 칸(초기 8,8 또는 마지막 위치)에 굵은 테두리 표시
- **방향키**: 커서 이동(가장자리에서 멈춤). **Shift+방향키**: 이동하면서 현재 도구로 칠하기(연필/지우개, 한 번 누를 때마다 1칸)
- **Space / Enter**: 커서 칸에 현재 도구 적용(연필·지우개·채우기·스포이드). 각 입력이 기록 1단계 (Shift+방향키 연속 칠하기는 Shift를 뗄 때까지 1단계로 묶음)
- **Home/End**: 행의 처음/끝, **Ctrl+Home/End**는 생략(범위 밖)
- 커서 이동 시 화면 밖 `aria-live="polite"` 영역에 "3행 5열, 빨강" 같이 위치와 칸 색 안내 (빠른 이동 시 마지막 값만 읽히도록 짧게 지연)
- 처리한 키(방향키, Space)는 `preventDefault()` → 페이지·부모 iframe 스크롤 방지

### 단축키 (문서 전체, 단 `<input>`/`<select>`에 포커스가 있거나 대화상자가 열렸을 때는 무시)

| 키 | 동작 |
| --- | --- |
| `P` | 연필 |
| `E` | 지우개 |
| `F` | 채우기 |
| `I` | 스포이드 |
| `G` | 격자선 토글 |
| `Ctrl/Cmd+Z` | 되돌리기 |
| `Ctrl/Cmd+Shift+Z`, `Ctrl+Y` | 다시하기 |

- 위 조합 외 Ctrl/Alt/Meta가 눌린 키는 가로채지 않음 (브라우저 단축키 유지)
- 버튼의 `title`/`aria-keyshortcuts`에 단축키 표기

### 전체 지우기 확인

- `<dialog>`를 `showModal()`로 열기: "그림을 모두 지울까요?" + [취소](첫 포커스) [모두 지우기]
- Esc = 취소, 닫히면 전체 지우기 버튼으로 포커스 복귀. 되돌리기로 복구 가능하다는 안내 한 줄

## 7. 작업 보존

- **제안: 새로고침해도 그림 유지** — "결정 필요" 참고
- `localStorage` 키 `pixel-editor:v1`, 값:
  ```js
  { version: 1, size: 16, pixels: (string|null)[256], color: '#rrggbb',
    customColor: '#rrggbb' | null, tool: 'pencil'|'eraser'|'fill'|'picker',
    showGrid: boolean, scale: 1|8|16|32 }
  ```
- 저장 시점: 획 종료·채우기·전체 지우기·되돌리기/다시하기·설정 변경 후 (획 중에는 저장하지 않음)
- 불러오기: JSON 파싱 → 검증(길이 256, 각 값이 `null` 또는 `#rrggbb`, 나머지 필드 허용값) → 실패하면 해당 필드만 기본값
- 읽기/쓰기 모두 `try/catch`. 막히면 메모리에서만 동작하고 에러를 띄우지 않음
- 되돌리기 기록은 저장하지 않음 (새로고침하면 기록 초기화)
- 같은 출처의 다른 탭과 동기화는 하지 않음 (범위 밖)

## 8. 디자인

블로그와 같은 배경·글자 톤에 블로그 강조색(파랑)을 그대로 써서 카드 안에서 자연스럽게 어울리게 한다.

### 토큰

| 토큰 | 라이트 | 다크 | 용도 |
| --- | --- | --- | --- |
| `--bg` | `#ffffff` | `#111317` | 배경 |
| `--surface` | `#f6f7f9` | `#191c21` | 버튼 배경 |
| `--text` | `#1f2328` | `#e6e8eb` | 글자, 선택 링 바깥 |
| `--muted` | `#5f6873` | `#9aa3ad` | 안내 문구 |
| `--border` | `#e4e7eb` | `#2a2f36` | 테두리 |
| `--accent` | `#2557d6` | `#7aa2ff` | 저장 버튼, 선택된 도구, 포커스 |
| `--accent-text` | `#ffffff` | `#0b1530` | 강조 버튼 글자 |
| `--accent-soft` | `#e8eefc` | `#1c2740` | 선택된 도구 배경 |
| `--checker-a` | `#ffffff` | `#2a2f36` | 투명 칸 체크무늬 1 |
| `--checker-b` | `#e3e6ea` | `#20242b` | 투명 칸 체크무늬 2 |
| `--grid-line` | `rgb(31 35 40 / 0.14)` | `rgb(230 232 235 / 0.14)` | 격자선 |
| `--cursor` | `#2557d6` | `#7aa2ff` | 키보드 커서 테두리 (`--accent`와 같게 시작) |
| `--backdrop` | `rgb(17 19 23 / 0.4)` | `rgb(0 0 0 / 0.6)` | 대화상자 뒤 배경 |

- 다크: `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {…} }` + `:root[data-theme="dark"] {…}` (숫자 합치기와 같은 구조), `color-scheme` 함께 설정
- 색 값은 토큰에만, 컴포넌트는 `var()`만 사용 (팔레트 스와치·칸 색은 데이터라 예외, 인라인 변수로 전달)

### 캔버스 표시

- 표시용은 **DOM 격자**(`display: grid; grid-template-columns: repeat(16, 1fr)`, 칸 256개 `<div>`)로 그림. 칸 색은 `style.backgroundColor`, 투명 칸은 `data-empty` 속성 → CSS 체크무늬 (칸 하나를 2×2 체크로)
- 격자선: 캔버스에 `.show-grid` 클래스가 있을 때 칸에 `box-shadow: inset 0 0 0 0.5px var(--grid-line)` (레이아웃에 영향 없음)
- 캔버스 바깥 테두리 1px `--border`
- 키보드 커서: 포커스가 있을 때만 커서 칸에 `outline: 2px solid var(--cursor)` + 안쪽 `--bg` 링 (어떤 칸 색 위에서도 보이게)
- 캔버스 전체 포커스 링은 `:focus-visible`에서 바깥 `outline 3px var(--accent)`

### 선택 상태

- 도구: `aria-pressed="true"` → `--accent-soft` 배경 + `--accent` 테두리·아이콘
- 격자 토글: `aria-pressed`로 상태 표시
- 스와치: 3절의 이중 링
- 비활성 버튼(되돌리기 불가 등): `disabled` + 흐린 글자 (대비는 요구 대상 아님, 단 상태가 구분되게)

### 글꼴·모션

- 블로그와 같은 시스템 폰트 스택, 본문 15~16px, `word-break: keep-all`
- 애니메이션 없음에 가깝게: 버튼 배경 전환 100ms 정도만, `prefers-reduced-motion: reduce`면 전환 없음

## 9. 파일 구조

```
apps/pixel-editor/
├── index.html   # 마크업, viewport·lang·title, head 인라인 테마 스크립트, style.css·ui.js(module) 로드
├── style.css    # 토큰(라이트/다크), 레이아웃(좁은/넓은), 캔버스·체크무늬·격자, 버튼·팔레트, 대화상자, reduced-motion
├── editor.js    # 순수 로직: 픽셀 배열, 칠하기·직선·채우기·지우기 (DOM 없음)
├── history.js   # 순수 로직: 되돌리기/다시하기 기록
├── palette.js   # 기본 16색 상수, 색 정규화·이름 찾기
├── exporter.js  # PNG 만들기(캔버스·Blob), 파일 이름, 다운로드
├── storage.js   # localStorage 읽기/쓰기/검증 (try/catch)
├── ui.js        # 진입점: 렌더링, 포인터·키보드 입력, 도구·팔레트·저장·대화상자, 테마 동기화
└── agents/      # 서브에이전트 지침 파일
```

- `editor.js`·`history.js`·`palette.js`는 입력을 받아 **새 값을 반환**하는 순수 함수만 (변화가 없으면 같은 참조를 반환해 "변화 여부" 판단에 사용)
- ES 모듈, `const`/`let`, 화살표 함수, 들여쓰기 2칸, 세미콜론, 작은따옴표, 전역 변수 금지
- 테마 처리는 숫자 합치기와 동일: `<head>` 인라인 스크립트에서 `localStorage`의 `theme`(`'dark'`/`'light'`)로 `data-theme` 설정(`try/catch`), 없으면 OS 설정, `storage` 이벤트로 블로그 테마 변경 반영. 앱 자체 토글 없음

## 10. 핵심 로직 설계

### 데이터 구조

```js
SIZE = 16
Color = string            // 소문자 '#rrggbb'
Pixels = (Color | null)[] // 길이 SIZE*SIZE, 인덱스 = y * SIZE + x, null = 투명
Tool = 'pencil' | 'eraser' | 'fill' | 'picker'
History = { past: Pixels[], present: Pixels, future: Pixels[], limit: number }

// ui.js 내부 상태 (모듈 스코프, 전역 아님)
UiState = { history, tool, prevTool, color, customColor, showGrid, scale,
            cursor: { x, y }, stroke: { pointerId, last: {x,y}, erase: boolean } | null }
```

### `editor.js`

```js
createPixels(size = 16) → Pixels                         // 전부 null
toIndex(x, y, size = 16) → number
inBounds(x, y, size = 16) → boolean
getPixel(pixels, x, y, size = 16) → Color | null
setPixel(pixels, x, y, color, size = 16) → Pixels        // 같으면 원래 참조
lineCells(x0, y0, x1, y1) → { x, y }[]                    // Bresenham, 양 끝 포함
drawLine(pixels, x0, y0, x1, y1, color, size = 16) → Pixels
floodFill(pixels, x, y, color, size = 16) → Pixels       // 4방향 BFS(재귀 금지), 대상색 === color면 원래 참조
clearPixels(pixels) → Pixels                             // 이미 비었으면 원래 참조
isEmpty(pixels) → boolean
pointToCell(clientX, clientY, rect, size = 16) → { x, y } // 0..size-1로 clamp (순수: rect를 인자로)
```

### `history.js`

```js
createHistory(pixels, limit = 50) → History
commit(history, pixels) → History     // pixels === present면 그대로, future 비움, past 길이 limit 유지
undo(history) → History               // 불가하면 그대로
redo(history) → History
canUndo(history) → boolean
canRedo(history) → boolean
```

- 획 중에는 `present`를 바꾸지 않고 임시 `Pixels`에 그린 뒤, 획 종료 시 `commit` 1회

### `palette.js`

```js
PALETTE: { name: string, value: Color }[]   // 16색
DEFAULT_COLOR = '#000000'
normalizeColor(value) → Color | null        // '#ABC'·'#AABBCC' 허용, 그 외 null
colorName(color) → string                   // 팔레트 이름 또는 hex
```

### `exporter.js`

```js
renderPixels(ctx, pixels, scale, size = 16) → void        // imageSmoothingEnabled=false, fillRect
createPngBlob(pixels, scale, size = 16) → Promise<Blob>   // toBlob, 실패 시 toDataURL 변환
makeFileName(date, px) → string                           // 'pixel-art-20261111-153012-256px.png'
downloadBlob(blob, fileName) → void                       // a[download] 클릭, 지연 revoke
```

### `storage.js`

```js
loadSaved() → Partial<SavedState>   // 검증 통과한 필드만, 실패 시 {}
saveState(state) → void             // 예외를 던지지 않음
```

### `ui.js`

```js
init()                               // DOM 참조, 저장 상태 복원, 칸 256개 생성, 이벤트 등록
render()                             // 바뀐 칸만 갱신(이전 Pixels와 비교), 도구·색·버튼 상태, 커서
setTool(tool) / setColor(color)
applyAt(x, y, { erase })             // 현재 도구 1회 적용 (키보드·포인터 공용)
bindPointer(canvasEl)                // capture, coalesced, Bresenham 연결, 오른쪽 버튼 지우개
bindKeyboard(canvasEl)               // 커서 이동, Space/Enter, Shift+방향키, 단축키
openClearDialog()
handleSave()                         // createPngBlob → downloadBlob → 안내
announce(text)                       // aria-live
bindThemeSync()                      // storage 이벤트
```

## 11. 블로그 임베드 계획 (이번 단계에서는 하지 않음)

- `apps/index.json`에 추가할 항목:
  - **제목**: 도트 그림판
  - **설명**: 16×16 칸에 도트를 찍어 그리고 PNG로 저장하는 픽셀 아트 에디터. 마우스·터치·키보드로 그려요.
- 블로그 iframe 안쪽 폭 = 화면 폭 − 66px (화면 712px 이상이면 약 644px로 고정). 앱의 좁은/넓은 전환점 600px → 화면 폭 약 666px부터 넓은 레이아웃

### 폭별 예상 문서 높이 (Review에서 실측 후 확정)

| 화면 폭 | iframe 안쪽 폭 | 레이아웃 | 예상 높이 |
| --- | --- | --- | --- |
| 360px | 약 294px | 좁음 (캔버스 262px, 팔레트 5칸×4줄) | 약 770px |
| 412px | 약 346px | 좁음 (캔버스 314px, 6칸×3줄) | 약 780px |
| 600px | 약 534px | 좁음 (캔버스 384px, 10칸×2줄, 도구 한 줄) | 약 750px |
| 768px 이상 | 약 644px | 넓음 (캔버스 384px) | 약 590px |
| 단독 1280px | 640px | 넓음 | 약 590px |

- 현재 블로그 `.app-card-frame` 높이는 모든 앱 공통 `clamp(528px, calc(256px + 76vw), 684px)`라 360px에서 약 530px → 이 앱은 좁은 화면에서 내부 스크롤이 생김. 앱별 높이 지정이 필요 — "결정 필요" 참고
- iframe 대비 사항(지금 구현에 반영): 캔버스 `touch-action: none`, 처리한 키 `preventDefault()`, 캔버스를 누르면 포커스가 iframe 안으로 들어감, 레이아웃은 iframe 폭 기준(미디어 쿼리가 iframe 폭에 반응)
- PNG 다운로드: 현재 iframe에는 `sandbox`가 없고 같은 출처라 `<a download>`가 동작해야 함. 나중에 `sandbox`를 붙이면 `allow-downloads allow-scripts allow-same-origin`가 필요

## 12. 검증 항목 (Review 체크리스트)

### 로직 (콘솔에서 모듈 import 후 직접 호출)

- [ ] `lineCells(0,0,5,2)`가 양 끝 포함, 빈틈 없이 인접(8방향) 칸으로 이어짐. `(3,3,3,3)` → 1칸, 역방향 `(5,2,0,0)`도 동일 개수
- [ ] `setPixel` 같은 색 → 원래 참조 반환, 범위 밖 좌표 → 원래 참조
- [ ] `floodFill`: 빈 캔버스 → 256칸 전부, 대각선만 닿은 영역은 채우지 않음, 닫힌 도형 안쪽만 채움, 대상색 = 현재 색 → 원래 참조, 모서리(0,0)·(15,15) 시작 정상, 투명 영역 채우기 정상
- [ ] `history`: 51번 commit 후 undo 50회까지만 가능, undo 후 새 commit → redo 불가, 같은 참조 commit은 기록 안 됨
- [ ] `normalizeColor('#ABC')` → `'#aabbcc'`, `'red'`·`'#12345'` → `null`

### 그리기 조작

- [ ] 연필 클릭 1칸, 빠른 드래그(대각선 포함)에서 끊김 없음, 캔버스 밖으로 나갔다 들어와도 획 유지(capture), 밖에서는 가장자리 칸에 clamp
- [ ] 지우개 드래그로 투명(체크무늬) 복귀
- [ ] 오른쪽 버튼 드래그 = 지우개, 캔버스 위 컨텍스트 메뉴 안 뜸, 캔버스 밖에서는 뜸
- [ ] 스포이드: 색 칸 → 현재 색 변경·직전 도구 복귀 / 투명 칸 → 지우개 선택
- [ ] 한 획 = 되돌리기 1단계, 채우기·전체 지우기도 각 1단계, 다시하기 동작, 버튼 활성/비활성 상태 정확
- [ ] 전체 지우기: 취소/Esc → 변화 없음, 확인 → 전부 투명, 되돌리기로 복구, 포커스 복귀
- [ ] 격자 토글: 화면 격자선만 바뀌고 PNG에는 영향 없음

### 키보드

- [ ] Tab만으로 모든 도구·스와치·사용자 색·배율·저장 버튼·캔버스 접근, `:focus-visible` 보임
- [ ] 캔버스에서 방향키 이동(가장자리 멈춤), Space/Enter로 각 도구 적용, Shift+방향키 연속 칠하기 = 1단계
- [ ] 단축키 P/E/F/I/G, Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y 동작. `<select>`·색 입력 포커스 중·대화상자 열림 중에는 단축키 무시. 다른 Ctrl 조합은 가로채지 않음
- [ ] 처리한 키로 페이지·부모 페이지가 스크롤되지 않음

### 팔레트

- [ ] 16색 + 사용자 색, 선택 표시가 라이트/다크·흰색/검정 스와치 위에서 모두 보임
- [ ] 사용자 색 선택 시 현재 색·스와치 갱신, 소문자 hex로 저장
- [ ] 각 스와치 `aria-label`·`aria-pressed` 정확

### PNG

- [ ] 배율별 파일 크기 16/128/256/512px 정확 (`Image`로 불러와 `naturalWidth` 확인)
- [ ] 투명 칸 알파 0, 칠한 칸 RGB가 원래 hex와 정확히 일치, 경계에 보간 색 없음 (`getImageData`로 칸 경계 양쪽 픽셀 확인)
- [ ] 파일 이름 규칙, 빈 캔버스 저장 시 투명 PNG
- [ ] 블로그 메인 iframe 안에서 저장 버튼으로 다운로드 동작 (Chrome, 가능하면 Firefox·모바일 Safari 확인)

### 작업 보존

- [ ] 새로고침 후 그림·현재 색·사용자 색·도구·격자·배율 유지, 되돌리기 기록은 초기화
- [ ] 저장값을 망가뜨린 경우(잘못된 JSON, 길이 다름, 이상한 색) 에러 없이 기본값
- [ ] `localStorage` 차단 환경에서 에러 없이 동작

### 터치·반응형·테마

- [ ] 모바일 에뮬레이션에서 탭·드래그 그리기, 그리는 동안 페이지 스크롤·당겨서 새로고침 없음, 두 번째 손가락 무시
- [ ] 360 / 768 / 1280px에서 가로 스크롤 없음, 캔버스 정사각형, 터치 대상 44×44px 이상
- [ ] 폭별 실제 문서 높이 측정해 11절 표 갱신 (`document.documentElement.scrollHeight`)
- [ ] 라이트/다크 모두 글자 대비 4.5:1 이상(`--muted`, `--accent-text`/`--accent` 포함), 체크무늬·격자선·커서가 구분됨
- [ ] 블로그 테마 전환 시 iframe 안 앱도 바뀜, 앱 자체 토글 없음
- [ ] `prefers-reduced-motion: reduce`에서 전환 없음

### 기타

- [ ] 콘솔 에러·경고 없음
- [ ] `apps/pixel-editor/` 밖 파일 수정 없음, 블로그 `css/`·`js/` import 없음, 외부 라이브러리 없음, 상대 경로만 사용
- [ ] 색 값이 토큰 밖에 직접 쓰이지 않음 (팔레트 데이터 제외)

## 13. 범위 밖

- 16×16 외 캔버스 크기 변경, 확대/축소·이동(핀치 줌 포함)
- 레이어, 선택 영역·복사/붙여넣기, 직선·사각형·원 도구, 좌우 반전·회전
- 애니메이션 프레임, GIF 저장
- PNG 불러오기(이미지 열기), 여러 작품 저장·갤러리
- 최근 사용 색 목록, 팔레트 편집·저장, 반투명(알파) 색
- 다른 탭과 실시간 동기화, 계정·공유·서버 저장
- 앱 자체 테마 토글
- 블로그 메인 카드 임베드 (Embed 단계에서 진행)

## 결정 필요

1. **앱 이름**: "도트 그림판"(가제)으로 할지 (폴더 이름은 `pixel-editor` 유지)
2. **선택 기능 범위**: 채우기·스포이드·되돌리기/다시하기·격자선 토글을 모두 기본으로 넣을지 (기본안: 모두 넣음)
3. **팔레트**: 3절의 16색 구성으로 진행할지 (기본안: 그대로 진행, 투명은 지우개로 처리)
4. **PNG 배율**: ×1/×8/×16/×32 선택, 기본 ×16(256px)으로 할지 (기본안: 그대로)
5. **작업 보존**: 새로고침해도 그림을 유지할지 (기본안: `localStorage`에 유지, 되돌리기 기록은 저장 안 함)
6. **오른쪽 클릭**: 오른쪽 버튼 드래그를 지우개로 쓸지 (기본안: 지우개로 사용, 캔버스 위 컨텍스트 메뉴 막음)
7. **블로그 iframe 높이**: 이 앱은 좁은 화면에서 약 770px로 현재 공통 높이(약 530~684px)보다 큼. 기본안: Embed 단계에서 `apps/index.json`에 선택 필드(예: `"frameHeight": { "narrow": 790, "wide": 610 }`)를 두고 `js/main.js`가 iframe에 CSS 변수로 넘겨, `css/style.css`의 `.app-card-frame`이 화면 폭 약 666px 기준으로 두 값을 골라 쓰게 함(값이 없으면 기존 공통 높이 유지 → 숫자 합치기는 그대로). 대안: 부모가 같은 출처 iframe의 문서 높이를 읽어 자동으로 맞춤

## 확정 사항 (2026-11-11 사용자 승인)

위 "결정 필요" 항목은 다음과 같이 확정한다. 본문과 다르면 이 절을 따른다.

1. 앱 이름: **도트 그림판** (폴더 `pixel-editor`)
2. 기능 범위: 채우기·스포이드·되돌리기/다시하기(최대 50단계)·격자선 토글 **모두 넣음**
3. 팔레트: **3절의 16색 + 사용자 지정 색 1칸**, 투명은 지우개로 처리
4. PNG 배율: **×1/×8/×16/×32, 기본 ×16(256px)**
5. 작업 보존: **`localStorage`(`pixel-editor:v1`)에 유지**, 되돌리기 기록은 저장 안 함
6. 오른쪽 클릭: **오른쪽 버튼 드래그는 그 획만 지우개**, 캔버스 위 컨텍스트 메뉴 막음
7. 블로그 iframe 높이: **부모 페이지가 같은 출처 iframe의 실제 콘텐츠 높이를 읽어 자동으로 맞춤** (Embed 단계에서 블로그 쪽에 구현, `apps/index.json`에 높이 숫자를 두지 않음). 이를 위해 앱은 다음을 지킨다.
   - 문서 콘텐츠 높이가 뷰포트(iframe) 높이에 따라 늘어나지 않게 한다. `body` 직계 자식에 `flex: 1`, `height: 100vh`/`100%` 등으로 늘어나는 요소를 두지 않는다. (`body`의 `min-height: 100vh`처럼 배경만 채우는 것은 괜찮다.)
   - 높이는 폭에 따라서만 바뀐다.
