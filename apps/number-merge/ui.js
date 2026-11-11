import { SIZE, createGame, move, continueGame } from './game.js';
import { loadBest, saveBest } from './storage.js';

const SWIPE_MIN = 30;

const KEY_DIRECTIONS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// 이 모듈 안에서만 쓰는 화면 상태
const ctx = {
  els: {},
  state: null,
  best: 0,
  overlay: null,
  tileEls: new Map(),
  leaving: new Set(),
};

const formatNumber = (value) => value.toLocaleString('ko-KR');

const announce = (message) => {
  // 같은 문구가 연달아 와도 다시 읽히도록 비운 뒤 넣는다
  ctx.els.status.textContent = '';
  window.setTimeout(() => {
    ctx.els.status.textContent = message;
  }, 50);
};

const tileValueAttr = (value) => (value > 2048 ? 'super' : String(value));

const placeTile = (el, tile) => {
  el.style.setProperty('--row', tile.row);
  el.style.setProperty('--col', tile.col);
};

const createTileEl = (tile) => {
  const el = document.createElement('div');
  el.className = 'tile';
  const inner = document.createElement('span');
  inner.className = 'tile-inner';
  inner.textContent = String(tile.value);
  el.append(inner);
  el.dataset.value = tileValueAttr(tile.value);
  el.dataset.len = String(Math.min(5, String(tile.value).length));
  if (tile.isNew) el.classList.add('is-new');
  if (tile.mergedFrom) el.classList.add('is-merged');
  placeTile(el, tile);
  return el;
};

const flushLeaving = () => {
  ctx.leaving.forEach((el) => el.remove());
  ctx.leaving.clear();
};

const renderCells = (size) => {
  const { cells, board } = ctx.els;
  board.style.setProperty('--size', size);
  if (cells.childElementCount === size * size) return;
  cells.replaceChildren(...Array.from({ length: size * size }, () => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    return cell;
  }));
};

export const render = (state, prevState) => {
  // 연타 시 이전 이동의 사라질 타일이 남지 않도록 먼저 정리한다
  flushLeaving();
  renderCells(state.size);

  const nextIds = new Set(state.tiles.map((tile) => tile.id));
  const mergeTargets = new Map();
  state.tiles.forEach((tile) => {
    if (tile.mergedFrom) tile.mergedFrom.forEach((id) => mergeTargets.set(id, tile));
  });

  ctx.tileEls.forEach((el, id) => {
    if (nextIds.has(id)) return;
    ctx.tileEls.delete(id);
    const target = prevState && mergeTargets.get(id);
    if (!target || reducedMotion.matches) {
      el.remove();
      return;
    }
    // 합쳐질 타일은 목적지까지 미끄러진 뒤 제거
    placeTile(el, target);
    ctx.leaving.add(el);
    window.setTimeout(() => {
      if (ctx.leaving.delete(el)) el.remove();
    }, 110);
  });

  state.tiles.forEach((tile) => {
    const existing = ctx.tileEls.get(tile.id);
    if (existing) {
      existing.classList.remove('is-new', 'is-merged');
      placeTile(existing, tile);
      return;
    }
    const el = createTileEl(tile);
    ctx.tileEls.set(tile.id, el);
    ctx.els.tiles.append(el);
  });
};

const showScoreGain = (gained) => {
  if (gained <= 0 || reducedMotion.matches) return;
  const add = document.createElement('span');
  add.className = 'score-add';
  add.setAttribute('aria-hidden', 'true');
  add.textContent = `+${formatNumber(gained)}`;
  add.addEventListener('animationend', () => add.remove());
  ctx.els.score.parentElement.append(add);
};

export const updateScore = (score, gained = 0) => {
  ctx.els.score.textContent = formatNumber(score);
  showScoreGain(gained);
  if (score > ctx.best) {
    ctx.best = score;
    saveBest(score);
  }
  ctx.els.best.textContent = formatNumber(ctx.best);
};

export const showOverlay = (kind) => {
  const { overlay, overlayTitle, overlayDetail, continueBtn, overlayNewBtn, retryBtn } = ctx.els;
  const isWin = kind === 'win';
  overlayTitle.textContent = isWin ? '2048을 만들었어요!' : '더 이상 움직일 수 없어요';
  overlayDetail.textContent = isWin ? '' : `최종 점수 ${formatNumber(ctx.state.score)}`;
  continueBtn.hidden = !isWin;
  overlayNewBtn.hidden = !isWin;
  retryBtn.hidden = isWin;
  overlay.hidden = false;
  ctx.overlay = kind;
  (isWin ? continueBtn : retryBtn).focus();
  announce(isWin
    ? `점수 ${formatNumber(ctx.state.score)}. 2048 달성`
    : `게임 종료. 최종 점수 ${formatNumber(ctx.state.score)}`);
};

export const hideOverlay = () => {
  ctx.els.overlay.hidden = true;
  ctx.overlay = null;
  ctx.els.board.focus();
};

const newGame = () => {
  const prev = ctx.state;
  ctx.state = createGame(SIZE);
  render(ctx.state, null);
  updateScore(0);
  if (ctx.overlay) hideOverlay();
  if (prev) announce('새 게임을 시작했어요');
};

export const handleDirection = (direction) => {
  if (ctx.overlay || !ctx.state) return;
  const prev = ctx.state;
  const result = move(prev, direction);
  if (!result.moved) return;
  ctx.state = result.state;
  render(ctx.state, prev);
  updateScore(ctx.state.score, result.gained);

  if (!prev.won && ctx.state.won && !ctx.state.keepPlaying) {
    showOverlay('win');
  } else if (ctx.state.over) {
    showOverlay('lose');
  }
};

const continuePlaying = () => {
  ctx.state = continueGame(ctx.state);
  hideOverlay();
  // 승리와 동시에 막힌 경우
  if (ctx.state.over) showOverlay('lose');
};

export const bindKeyboard = () => {
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    // 한글 입력 상태에서도 WASD가 동작하도록 물리 키(code)를 함께 본다
    const direction = KEY_DIRECTIONS[event.key] || KEY_DIRECTIONS[event.code];
    if (!direction) return;
    event.preventDefault();
    handleDirection(direction);
  });
};

export const bindSwipe = (boardEl) => {
  let start = null;

  boardEl.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary) return;
    start = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });

  boardEl.addEventListener('pointerup', (event) => {
    if (!start || event.pointerId !== start.id) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      handleDirection(dx > 0 ? 'right' : 'left');
    } else {
      handleDirection(dy > 0 ? 'down' : 'up');
    }
  });

  boardEl.addEventListener('pointercancel', () => {
    start = null;
  });
};

const bindThemeSync = () => {
  // 블로그(같은 출처)에서 테마를 바꾸면 iframe 안에도 반영
  window.addEventListener('storage', (event) => {
    if (event.key !== 'theme' && event.key !== null) return;
    let theme = null;
    try {
      theme = localStorage.getItem('theme');
    } catch (e) {
      return;
    }
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.dataset.theme = theme;
    } else {
      delete document.documentElement.dataset.theme;
    }
  });
};

export const init = () => {
  const byId = (id) => document.getElementById(id);
  ctx.els = {
    board: byId('board'),
    cells: byId('cells'),
    tiles: byId('tiles'),
    score: byId('score'),
    best: byId('best'),
    status: byId('status'),
    overlay: byId('overlay'),
    overlayTitle: byId('overlay-title'),
    overlayDetail: byId('overlay-detail'),
    continueBtn: byId('continue'),
    overlayNewBtn: byId('overlay-new-game'),
    retryBtn: byId('retry'),
  };
  ctx.best = loadBest();

  byId('new-game').addEventListener('click', newGame);
  ctx.els.overlayNewBtn.addEventListener('click', newGame);
  ctx.els.retryBtn.addEventListener('click', newGame);
  ctx.els.continueBtn.addEventListener('click', continuePlaying);

  bindKeyboard();
  bindSwipe(ctx.els.board);
  bindThemeSync();
  newGame();
};

init();
