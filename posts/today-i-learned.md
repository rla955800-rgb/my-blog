---
title: 오늘 배운 것
date: 2026-11-09
tags: 공부, 개발
description: 클로드 코드로 블로그를 만들면서 알게 된 HTML, CSS, JavaScript의 역할을 정리했습니다.
---

오늘은 클로드 코드와 함께 이 블로그를 처음부터 만들어 봤습니다.
프레임워크 없이 HTML, CSS, JavaScript만 썼더니 세 가지가 각자 어떤 일을 맡는지 또렷하게 보였어요.

한 문장으로 줄이면 이렇습니다.

> HTML은 **뼈대**, CSS는 **옷**, JavaScript는 **움직임**이다.

## HTML: 무엇이 있는지 정한다

HTML은 페이지에 **어떤 내용이 어떤 순서로** 들어가는지를 적습니다.
이 블로그의 `index.html`도 생각보다 짧았어요. 머리말, 본문 자리, 꼬리말이 거의 전부입니다.

```html
<header class="site-header">...</header>
<main id="app"></main>
<footer class="site-footer">...</footer>
```

배운 점:

- `<header>`, `<main>`, `<article>`, `<footer>`처럼 **뜻이 담긴 태그**를 쓰면 화면 낭독기나 검색 엔진도 구조를 이해할 수 있다.
- `<html lang="ko">`처럼 작은 설정 하나가 접근성에 영향을 준다.
- 글 본문은 HTML에 직접 쓰지 않고, 비워 둔 `<main>` 자리에 JavaScript가 채워 넣는다.

## CSS: 어떻게 보일지 정한다

CSS는 HTML로 만든 뼈대에 **색, 글꼴, 여백, 배치**를 입힙니다.
같은 HTML이라도 CSS에 따라 전혀 다른 사이트처럼 보일 수 있어요.

가장 인상 깊었던 건 **색을 변수로 관리하는 방법**이었습니다.

```css
:root {
  --bg: #ffffff;
  --text: #1f2328;
}

:root[data-theme="dark"] {
  --bg: #111317;
  --text: #e6e8eb;
}

body {
  background: var(--bg);
  color: var(--text);
}
```

색을 직접 쓰지 않고 변수로만 쓰니까, 다크 모드는 **변수 값만 바꾸면** 끝났어요.

배운 점:

- `max-width`로 본문 폭을 제한하면 긴 글도 눈이 덜 피곤하다.
- `@media (min-width: 768px)`처럼 화면 크기에 따라 스타일을 바꿀 수 있다. 작은 화면부터 맞추고 넓은 화면을 덧붙이는 방식을 **모바일 우선**이라고 한다.
- `word-break: keep-all`을 주면 한글이 단어 중간에서 끊기지 않는다.
- `prefers-color-scheme`으로 운영체제의 다크 모드 설정을 알 수 있다.

## JavaScript: 무엇을 할지 정한다

JavaScript는 페이지가 **사용자의 행동에 반응하고, 내용을 바꾸게** 해 줍니다.
이 블로그에서 JavaScript가 하는 일은 크게 세 가지예요.

1. **글 불러오기**: `fetch`로 `posts` 폴더의 마크다운 파일을 읽는다.
2. **마크다운을 HTML로 바꾸기**: `**굵게**` 같은 문법을 `<strong>굵게</strong>`로 변환한다.
3. **화면 전환**: 주소의 `#/post/...` 부분을 보고 목록을 보여줄지 글을 보여줄지 정한다.

다크 모드 버튼도 JavaScript로 만들었습니다. 버튼을 누르면 `<html>`에 `data-theme="dark"`를 붙이고, 그러면 CSS 변수가 바뀌어 색이 한꺼번에 달라져요.

```js
button.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
});
```

배운 점:

- `localStorage`에 값을 저장하면 페이지를 다시 열어도 사용자의 선택을 기억할 수 있다.
- 사용자가 쓴 글을 그대로 HTML로 넣으면 위험하다. `<script>` 같은 코드가 실행될 수 있어서, 먼저 `<`와 `>`를 글자로 바꿔야(이스케이프) 한다.
- `index.html`을 파일로 바로 열면 `fetch`가 막힌다. 그래서 `python -m http.server`로 **로컬 서버**를 띄워야 했다.

## 세 가지가 함께 일하는 방식

| 역할 | 담당 | 이 블로그에서는 |
| :--- | :--- | :--- |
| 구조 | HTML | 머리말, 본문 자리, 꼬리말 |
| 모양 | CSS | 글꼴과 여백, 다크 모드 색, 모바일 레이아웃 |
| 동작 | JavaScript | 글 불러오기, 마크다운 변환, 화면 전환, 테마 전환 |

세 가지를 **섞지 않고 나눠 두는 것**이 중요하다는 걸 느꼈어요.
색을 바꾸고 싶으면 CSS만, 화면 동작을 바꾸고 싶으면 JavaScript만 열면 되니까 수정할 곳을 찾기가 쉬웠습니다.

## 덤: 오늘 처음 써 본 것들

- **git 커밋**: 작업한 상태를 기록으로 남기는 것. 나중에 망가져도 되돌릴 수 있다.
- **CLAUDE.md**: 클로드 코드에게 프로젝트 규칙을 알려주는 파일. 미리 규칙을 정해 두니 결과물이 처음 생각한 방향에서 벗어나지 않았다.

다음에는 글 검색 기능을 붙여 보고 싶어요.
