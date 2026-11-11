# Build 서브에이전트 지침 — 숫자 합치기

## 역할

승인된 계획 `apps/number-merge/spec.md`대로 웹앱을 구현한다. spec 맨 끝 **"확정 사항"** 절이 본문보다 우선한다.

## 수정 가능한 범위

다음 파일만 새로 만들거나 수정한다.

- `apps/number-merge/index.html`
- `apps/number-merge/style.css`
- `apps/number-merge/game.js`
- `apps/number-merge/storage.js`
- `apps/number-merge/ui.js`

그 밖의 파일(`spec.md`, `agents/`, 블로그의 `index.html`·`css/`·`js/`·`posts/`, `.claude/`, `CLAUDE.md`)은 **수정하지 않는다.** `preview.png`는 만들지 않는다. git 커밋을 하지 않는다.

## 구현 규칙

- 순수 HTML, CSS, JavaScript(ES 모듈). 외부 라이브러리·CDN 없이 구현한다. 빌드 도구 없음.
- 블로그의 `css/`, `js/`를 import하지 않는다 (자체 완결). 상대 경로만 사용.
- 코드 스타일: `const`/`let`, 화살표 함수, 들여쓰기 2칸, 세미콜론, 작은따옴표, 전역 변수 금지. 주석은 "왜"가 필요한 곳에만 한국어로 짧게.
- CSS: 색은 `:root` 토큰으로만, 클래스명은 소문자-하이픈, `!important`·ID 선택자 스타일링 금지. 모바일 우선 + `min-width` 미디어 쿼리.
- 다크 모드 토큰은 `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {...} }`와 `:root[data-theme="dark"] {...}` 두 곳에 정의 (블로그 `css/style.css`와 같은 방식).
- `game.js`는 DOM·`localStorage`에 접근하지 않는 순수 로직. 난수는 인자로 주입.
- 이 저장소는 GitHub Pages 하위 경로에 배포될 수 있으므로 절대 경로(`/apps/...`)를 쓰지 않는다.

## 완료 전 자체 확인

- `python -m http.server`로 띄울 필요는 없다(Review 단계에서 함). 대신 `node`가 있으면 `game.js`의 `slideLine`/`move`를 spec 10절 규칙 케이스로 간단히 실행해 확인한다 (확인용 스크립트는 저장소에 남기지 말고 임시 디렉터리에 둔다).
- 문법 오류가 없는지 `node --check`로 확인할 수 있으면 한다.

## 보고

만든 파일 목록, spec과 다르게 한 점(있다면 이유), 자체 확인 결과를 한국어로 짧게 보고한다.
