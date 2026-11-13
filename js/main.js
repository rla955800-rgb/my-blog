import { markdownToHtml, escapeHtml } from './markdown.js';
import { parseFrontMatter, toTags } from './frontmatter.js';
import { initTheme } from './theme.js';

const SITE_TITLE = '나의 블로그';
const POSTS_DIR = 'posts/';
const APPS_DIR = 'apps/';
const SLUG_PATTERN = /^[\w-]+$/;

const app = document.getElementById('app');
let postsCache = null;
let lastRenderId = 0;
let isFirstRender = true;

// ===== 데이터 =====

const loadPosts = async () => {
  if (postsCache) return postsCache;
  const response = await fetch(`${POSTS_DIR}index.json`);
  if (!response.ok) throw new Error(`글 목록을 불러오지 못했습니다 (${response.status})`);
  const posts = await response.json();
  postsCache = posts
    .filter((post) => SLUG_PATTERN.test(post.slug || ''))
    .map((post) => ({ ...post, tags: toTags(post.tags) }))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return postsCache;
};

// 웹앱 목록이 없거나 깨져도 글 목록은 보여야 하므로 실패하면 빈 배열로 둔다
const loadApps = async () => {
  try {
    const response = await fetch(`${APPS_DIR}index.json`);
    if (!response.ok) return [];
    const apps = await response.json();
    return apps.filter((item) => SLUG_PATTERN.test(item.slug || ''));
  } catch {
    return [];
  }
};

// ===== 화면 조각 =====

// 'YYYY-MM-DD'를 직접 나눠 읽어 시간대 때문에 날짜가 하루 밀리는 일을 막는다
const formatDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  if (!match) return value || '';
  return `${Number(match[1])}년 ${Number(match[2])}월 ${Number(match[3])}일`;
};

const postHref = (slug) => `#/post/${encodeURIComponent(slug)}`;

const tagsHtml = (tags) => {
  if (!tags.length) return '';
  const items = tags
    .map((tag) => `<li><a class="tag" href="#/tag/${encodeURIComponent(tag)}">#${escapeHtml(tag)}</a></li>`)
    .join('');
  return `<ul class="tag-list" aria-label="태그">${items}</ul>`;
};

const metaHtml = (meta) => {
  const date = meta.date
    ? `<time datetime="${escapeHtml(meta.date)}">${escapeHtml(formatDate(meta.date))}</time>`
    : '';
  return `<div class="post-meta">${date}${tagsHtml(meta.tags)}</div>`;
};

const postItemHtml = (post) => `
  <li class="post-item">
    <article>
      <h2 class="post-item-title"><a href="${postHref(post.slug)}">${escapeHtml(post.title || post.slug)}</a></h2>
      ${post.description ? `<p class="post-item-desc">${escapeHtml(post.description)}</p>` : ''}
      ${metaHtml(post)}
    </article>
  </li>`;

const appCardHtml = (item) => {
  const href = `${APPS_DIR}${item.slug}/`;
  const title = escapeHtml(item.title || item.slug);
  return `
  <li class="app-card">
    <article>
      <h3 class="app-card-title"><a href="${href}">${title}</a></h3>
      ${item.description ? `<p class="app-card-desc">${escapeHtml(item.description)}</p>` : ''}
      <iframe class="app-card-frame" src="${href}" title="${title} 미리보기" loading="lazy"></iframe>
    </article>
  </li>`;
};

const appsSectionHtml = (apps) => {
  if (!apps.length) return '';
  return `
    <section class="app-section" aria-labelledby="apps-heading">
      <h2 class="section-title" id="apps-heading">미니 웹앱</h2>
      <ul class="app-list">${apps.map(appCardHtml).join('')}</ul>
    </section>
    <h2 class="section-title">글</h2>`;
};

const navLinkHtml = (post, label, className) => `
  <a class="post-nav-link ${className}" href="${postHref(post.slug)}">
    <span class="post-nav-label">${label}</span>
    <span class="post-nav-title">${escapeHtml(post.title || post.slug)}</span>
  </a>`;

const messageView = (title, text) => ({
  title,
  html: `
    <section class="message">
      <h1 class="message-title">${escapeHtml(title)}</h1>
      <p>${escapeHtml(text)}</p>
      <p><a href="#/">목록으로 돌아가기</a></p>
    </section>`,
});

const notFoundView = () => messageView('글을 찾을 수 없어요', '주소가 바뀌었거나 삭제된 글일 수 있습니다.');

// ===== 화면 =====

const listView = async (tag) => {
  const [posts, apps] = await Promise.all([loadPosts(), tag ? [] : loadApps()]);
  const filtered = tag ? posts.filter((post) => post.tags.includes(tag)) : posts;
  const header = tag
    ? `<header class="page-header">
        <h1 class="page-title">#${escapeHtml(tag)}</h1>
        <p class="page-desc">${filtered.length}개의 글 · <a href="#/">전체 글 보기</a></p>
      </header>`
    : `<h1 class="visually-hidden">전체 글</h1>${appsSectionHtml(apps)}`;
  const body = filtered.length
    ? `<ul class="post-list">${filtered.map(postItemHtml).join('')}</ul>`
    : '<p class="message">아직 글이 없어요.</p>';
  return { title: tag ? `#${tag}` : '', html: header + body };
};

const postView = async (slug) => {
  if (!SLUG_PATTERN.test(slug)) return notFoundView();

  const [posts, response] = await Promise.all([
    loadPosts().catch(() => []),
    fetch(`${POSTS_DIR}${slug}.md`),
  ]);
  if (!response.ok) return notFoundView();

  const { data, body } = parseFrontMatter(await response.text());
  const index = posts.findIndex((post) => post.slug === slug);
  const entry = posts[index] || {};
  const meta = { ...entry, ...data, tags: data.tags || entry.tags || [] };
  const title = meta.title || slug;

  // 목록이 최신순이라 앞쪽이 더 최근 글이다
  const newer = index > 0 ? posts[index - 1] : null;
  const older = index >= 0 ? posts[index + 1] : null;
  const nav = newer || older
    ? `<nav class="post-nav" aria-label="이전 글과 다음 글">
        ${older ? navLinkHtml(older, '이전 글', 'post-nav-prev') : ''}
        ${newer ? navLinkHtml(newer, '다음 글', 'post-nav-next') : ''}
      </nav>`
    : '';

  return {
    title,
    html: `
      <article class="post">
        <header class="post-header">
          <h1 class="post-title">${escapeHtml(title)}</h1>
          ${metaHtml(meta)}
        </header>
        <div class="prose">${markdownToHtml(body, { imageBase: POSTS_DIR })}</div>
        ${nav}
      </article>
      <p class="back-link"><a href="#/">← 목록으로</a></p>`,
  };
};

// ===== 웹앱 iframe 높이 =====

// 앱 문서의 실제 콘텐츠 높이. body의 min-height는 iframe 높이를 따라가므로 자식 요소의 아래 끝으로 잰다
const contentHeight = (doc) => {
  const view = doc.defaultView;
  const bodyStyle = view.getComputedStyle(doc.body);
  let bottom = 0;
  for (const el of doc.body.children) {
    const rect = el.getBoundingClientRect();
    if (!rect.height) continue;
    bottom = Math.max(bottom, rect.bottom + (parseFloat(view.getComputedStyle(el).marginBottom) || 0));
  }
  return Math.ceil(bottom + view.scrollY + (parseFloat(bodyStyle.paddingBottom) || 0));
};

// 같은 출처 앱이라 문서를 직접 읽어 높이를 맞춘다. 읽지 못하면 CSS 기본 높이를 그대로 둔다
const fitFrame = (frame) => {
  let stopFitting = () => {};
  frame.addEventListener('load', () => {
    // iframe 문서가 다시 로드되면 이전 문서에 걸어 둔 관찰을 먼저 끊는다
    stopFitting();
    stopFitting = () => {};
    try {
      const doc = frame.contentDocument;
      // 높이를 맞추기 전 잠깐 생기는 세로 스크롤바가 폭을 줄여 높이 계산을 흔들지 않게 한다
      doc.documentElement.style.overflowY = 'hidden';
      const fit = () => {
        const height = contentHeight(doc);
        // iframe 테두리만큼 더해야 안쪽 영역이 콘텐츠 높이와 같아진다
        const border = frame.offsetHeight - frame.clientHeight;
        if (height > 0) frame.style.height = `${height + border}px`;
      };
      const observer = new frame.contentWindow.ResizeObserver(fit);
      for (const el of doc.body.children) observer.observe(el);
      const view = frame.contentWindow;
      view.addEventListener('resize', fit);
      stopFitting = () => {
        observer.disconnect();
        view.removeEventListener('resize', fit);
      };
      fit();
    } catch (error) {
      console.warn('웹앱 높이를 맞추지 못했어요', error);
    }
  });
};

// ===== 라우팅 =====

const parseRoute = () => {
  const [name, ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  let param = '';
  try {
    param = decodeURIComponent(rest.join('/'));
  } catch {
    param = '';
  }
  if (name === 'post' && param) return { name: 'post', slug: param };
  if (name === 'tag' && param) return { name: 'tag', tag: param };
  return { name: 'home' };
};

const render = async () => {
  // 빠르게 이동할 때 늦게 끝난 이전 요청이 화면을 덮어쓰지 않게 한다
  const renderId = ++lastRenderId;
  const route = parseRoute();
  app.setAttribute('aria-busy', 'true');

  let view;
  try {
    if (route.name === 'post') view = await postView(route.slug);
    else if (route.name === 'tag') view = await listView(route.tag);
    else view = await listView();
  } catch (error) {
    console.error(error);
    view = messageView('글을 불러오지 못했어요', '네트워크 상태를 확인한 뒤 다시 시도해 주세요.');
  }

  if (renderId !== lastRenderId) return;

  app.innerHTML = view.html;
  app.querySelectorAll('.app-card-frame').forEach(fitFrame);
  app.removeAttribute('aria-busy');
  document.title = view.title ? `${view.title} · ${SITE_TITLE}` : SITE_TITLE;
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (!isFirstRender) app.focus({ preventScroll: true });
  isFirstRender = false;
};

// 본문 안의 #제목 링크·건너뛰기 링크는 라우팅 대신 해당 위치로 스크롤한다
const handleInPageLink = (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (href.startsWith('#/')) return;

  event.preventDefault();
  if (href === '#') {
    window.scrollTo({ top: 0 });
    return;
  }

  let id;
  try {
    id = decodeURIComponent(href.slice(1));
  } catch {
    return;
  }
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView();
  target.focus({ preventScroll: true });
};

initTheme(document.getElementById('theme-toggle'));
document.addEventListener('click', handleInPageLink);
window.addEventListener('hashchange', render);
render();
