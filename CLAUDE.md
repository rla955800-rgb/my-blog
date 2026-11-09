# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code에게 프로젝트 맥락과 규칙을 알려줍니다.

## 프로젝트 개요

마크다운(`.md`) 파일로 작성한 글을 읽어 블로그 웹사이트로 보여주는 정적 사이트입니다.

- **프레임워크·빌드 도구 없음**: 순수 HTML, CSS, JavaScript(ES 모듈)만 사용합니다.
  React/Vue/Svelte, Tailwind, 번들러(Vite, Webpack 등), TypeScript를 도입하지 않습니다.
- **외부 라이브러리 없음**: 마크다운 파서도 직접 구현합니다. 새 의존성이 꼭 필요해 보이면 추가하기 전에 먼저 사용자에게 물어봅니다.
- **브라우저에서 렌더링**: 페이지가 `.md` 파일을 `fetch`로 불러와 JavaScript로 HTML로 변환합니다.

## 디렉터리 구조

```
my-blog/
├── index.html          # 단일 진입점 (글 목록 + 글 상세를 모두 이 페이지에서 렌더링)
├── css/
│   └── style.css       # 전체 스타일, 색상 토큰, 다크 모드, 반응형
├── js/
│   ├── main.js         # 초기화, 해시 라우팅, 화면 렌더링
│   ├── markdown.js     # 마크다운 → HTML 변환기
│   ├── frontmatter.js  # 글 상단 메타데이터 파싱
│   └── theme.js        # 다크/라이트 모드 전환 및 저장
└── posts/
    ├── index.json      # 글 목록(매니페스트)
    ├── images/         # 글에 넣을 이미지 (글에서는 images/파일명 으로 참조)
    └── *.md            # 글 본문
```

구조를 바꿀 때는 이 문서도 함께 갱신합니다.

## 글 작성 방식

### 파일과 매니페스트

정적 호스팅에서는 폴더 안의 파일 목록을 읽을 수 없으므로 `posts/index.json`에 글을 등록합니다.

```json
[
  { "slug": "hello-world", "title": "첫 번째 글", "date": "2026-11-09", "tags": ["일상"] }
]
```

- `slug`는 파일 이름과 같아야 합니다 (`posts/hello-world.md`).
- 목록은 `date` 기준 최신순으로 정렬해서 보여줍니다(정렬은 JS에서 처리).

### Front matter

각 `.md` 파일 맨 위에 `---`로 감싼 메타데이터를 둡니다. 간단한 `key: value` 형식만 지원합니다.

```markdown
---
title: 첫 번째 글
date: 2026-11-09
tags: 일상, 개발
description: 목록에 보일 한 줄 요약
---

본문 시작...
```

front matter와 `index.json`의 값이 다르면 front matter를 우선합니다.

## 마크다운 파서 (`js/markdown.js`)

지원 범위:

- 제목 `#` ~ `######` (제목에는 `id`를 붙여 앵커 링크 가능하게)
- 문단, 줄바꿈
- **굵게**, *기울임*, ~~취소선~~, `인라인 코드`
- 링크 `[텍스트](url)`, 이미지 `![alt](src)`
- 순서 있는/없는 목록 (한 단계 중첩)
- 인용문 `>`
- 코드 블록 ```` ``` ```` (언어 이름은 `class="language-xxx"`로만 남기고 문법 강조는 하지 않음)
- 수평선 `---`
- 표 (GFM 파이프 표)

규칙:

- **보안**: 변환 전에 원문의 `<`, `>`, `&`를 이스케이프해 원시 HTML을 허용하지 않습니다. 링크의 `javascript:` URL은 막습니다. 결과는 `innerHTML`로 넣으므로 이 처리를 빼먹지 않습니다.
- 코드 블록·인라인 코드 내부는 다른 마크다운 문법을 적용하지 않습니다.
- 블록 단위 처리 → 인라인 처리 순서로 구현하고, 함수는 작게 나눕니다.
- 파서를 수정하면 `posts/`에 있는 샘플 글로 모든 문법이 정상 렌더링되는지 확인합니다.

## 라우팅

해시 기반 라우팅을 사용합니다 (서버 설정 없이 동작).

- `#/` 또는 빈 해시 → 글 목록
- `#/post/<slug>` → 글 상세
- `#/tag/<tag>` → 태그별 목록

글을 찾지 못하거나 `fetch`가 실패하면 친절한 안내 문구와 목록으로 돌아가는 링크를 보여줍니다.
화면이 바뀔 때마다 `document.title`을 갱신하고 맨 위로 스크롤합니다.

## 디자인 원칙

목표는 **깔끔하고 읽기 좋은** 블로그입니다. 장식보다 가독성을 우선합니다.

- **본문 폭**: 본문 영역 최대 너비 약 `680px`(대략 한 줄 35~40자 한글), 가운데 정렬
- **타이포그래피**: 시스템 폰트 스택 사용 (`-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif`), 본문 `17~18px`, `line-height: 1.75`, 한글 줄바꿈을 위해 `word-break: keep-all`
- **여백**: 제목·문단·목록 사이 간격을 넉넉하고 일관되게
- **색상**: 강조색은 하나만 사용, 텍스트와 배경 대비는 WCAG AA(4.5:1) 이상
- **코드 블록**: 고정폭 폰트, 은은한 배경, 길면 가로 스크롤(페이지 전체는 가로 스크롤 금지)
- **이미지**: `max-width: 100%`, `height: auto`
- 애니메이션은 테마 전환 등 최소한으로, `prefers-reduced-motion`을 존중

## 다크 모드

- 모든 색상은 `:root`의 CSS 변수(토큰)로 정의하고, 컴포넌트에서는 변수만 사용합니다. 색상 값을 직접 쓰지 않습니다.
  ```css
  :root { --bg: #ffffff; --text: #1f2328; --muted: #656d76; --accent: #2563eb; --border: #e5e7eb; --code-bg: #f6f8fa; }
  :root[data-theme="dark"] { --bg: #0f1115; --text: #e6e6e6; /* ... */ }
  ```
- 기본값은 OS 설정(`prefers-color-scheme`)을 따릅니다.
- 헤더의 토글 버튼으로 직접 바꿀 수 있고, 선택은 `localStorage`에 저장합니다 (`try/catch`로 감싸 저장소가 막혀도 동작하게).
- 페이지 로드 시 깜빡임(FOUC)을 막기 위해 `<head>` 안의 작은 인라인 스크립트에서 `data-theme`을 먼저 설정합니다.
- 토글 버튼에는 `aria-label`을 붙이고 현재 상태를 반영합니다.

## 반응형 / 모바일

- **모바일 우선**으로 작성하고 `min-width` 미디어 쿼리로 넓은 화면을 확장합니다.
- `<meta name="viewport" content="width=device-width, initial-scale=1">` 필수
- 모바일 좌우 여백 최소 `16px`, 어떤 화면에서도 가로 스크롤이 생기지 않아야 합니다.
- 터치 대상(버튼, 링크)은 최소 `44×44px`
- 표는 감싸는 요소에 `overflow-x: auto`를 줘서 표만 스크롤되게 합니다.
- 확인할 폭: 360px, 768px, 1280px

## 접근성

- 시맨틱 태그 사용: `<header>`, `<main>`, `<article>`, `<nav>`, `<footer>`, `<time datetime="...">`
- 이미지에는 `alt`, 키보드만으로 모든 기능 사용 가능, `:focus-visible` 스타일 유지
- `<html lang="ko">`

## 코드 스타일

- JavaScript: ES 모듈(`<script type="module">`), `const`/`let`, 화살표 함수, `async/await`. 전역 변수 금지.
- 들여쓰기 2칸, 세미콜론 사용, 작은따옴표.
- CSS: 클래스 이름은 소문자-하이픈(`post-list`, `post-meta`). `!important`와 ID 선택자 스타일링은 피합니다.
- 주석은 "왜"가 필요한 곳에만 한국어로 짧게.

## 로컬에서 실행하기

`file://`로 `index.html`을 직접 열면 `fetch`가 막히므로 로컬 정적 서버로 실행합니다.

```bash
python -m http.server 8000
```

또는 Node가 있다면:

```bash
npx serve .
```

그 뒤 브라우저에서 `http://localhost:8000`을 엽니다. 빌드 단계는 없습니다.

## 작업 시 확인 사항

변경 후에는 다음을 확인합니다.

1. 글 목록과 글 상세가 정상적으로 렌더링되는가
2. 라이트/다크 모드 모두에서 글자와 코드 블록이 잘 읽히는가
3. 모바일 폭(360px)에서 가로 스크롤 없이 보이는가
4. 브라우저 콘솔에 에러가 없는가
