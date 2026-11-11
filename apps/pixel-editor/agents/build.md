# Build 서브에이전트 지침 — 도트 그림판

## 역할

승인된 계획 `apps/pixel-editor/spec.md`대로 웹앱을 구현한다. spec 맨 끝 **"확정 사항"** 절이 본문보다 우선한다.

## 수정 가능한 범위

spec 9절에 적힌 다음 파일만 새로 만들거나 수정한다.

- `apps/pixel-editor/index.html`
- `apps/pixel-editor/style.css`
- `apps/pixel-editor/editor.js`
- `apps/pixel-editor/history.js`
- `apps/pixel-editor/palette.js`
- `apps/pixel-editor/exporter.js`
- `apps/pixel-editor/storage.js`
- `apps/pixel-editor/ui.js`

그 밖의 파일(`spec.md`, `agents/`, `apps/number-merge/`, `apps/index.json`, 블로그의 `index.html`·`css/`·`js/`·`posts/`, `.claude/`, `CLAUDE.md`)은 **수정하지 않는다.** git 커밋을 하지 않는다.

## 구현 규칙

- 순수 HTML, CSS, JavaScript(ES 모듈). 외부 라이브러리·CDN 없이 구현한다. 빌드 도구 없음.
- 블로그의 `css/`, `js/`나 다른 앱을 import하지 않는다 (자체 완결). 상대 경로만 사용 (절대 경로 `/apps/...` 금지).
- 코드 스타일: `const`/`let`, 화살표 함수, 들여쓰기 2칸, 세미콜론, 작은따옴표, 전역 변수 금지. 주석은 "왜"가 필요한 곳에만 한국어로 짧게.
- CSS: 색은 `:root` 토큰으로만 (팔레트 데이터 제외), 클래스명은 소문자-하이픈, `!important`·ID 선택자 스타일링 금지. 모바일 우선 + `min-width` 미디어 쿼리.
- 다크 모드 토큰은 `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {...} }`와 `:root[data-theme="dark"] {...}` 두 곳에 정의. 테마 처리는 `apps/number-merge/index.html`·`ui.js`와 같은 방식 (읽기만 해서 참고).
- `editor.js`·`history.js`·`palette.js`는 DOM·`localStorage`에 접근하지 않는 순수 로직.
- **확정 사항 7**: 문서 콘텐츠 높이가 iframe 높이에 따라 늘어나지 않게 레이아웃을 짠다 (폭에 따라서만 높이가 바뀜).

## 완료 전 자체 확인

- `node --check`로 모든 JS 문법 확인.
- `node`로 `editor.js`·`history.js`·`palette.js`를 import해 spec 12절 로직 케이스를 실행한다. 확인용 스크립트는 저장소 밖 임시 디렉터리에 둔다.
- 브라우저 확인은 간단히만 해도 된다 (상세 검증은 Review 단계). 미리보기 서버를 띄웠다면 종료한다.

## 보고

만든 파일 목록, spec과 다르게 한 점(있다면 이유), 자체 확인 결과(확인한 것/안 한 것)를 한국어로 짧게 보고한다.
