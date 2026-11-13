import {
  SIZE,
  createPixels,
  toIndex,
  getPixel,
  setPixel,
  drawLine,
  floodFill,
  clearPixels,
  isEmpty,
  pointToCell,
} from './editor.js';
import { createHistory, commit, undo, redo, canUndo, canRedo } from './history.js';
import { PALETTE, DEFAULT_COLOR, normalizeColor, colorName } from './palette.js';
import { createPngBlob, makeFileName, downloadBlob } from './exporter.js';
import { loadSaved, saveState } from './storage.js';

const TOOLS = ['pencil', 'eraser', 'fill', 'picker'];
const TOOL_NAMES = { pencil: '연필', eraser: '지우개', fill: '채우기', picker: '스포이드' };
const ARROWS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

const ctx = {
  els: {},
  cells: [],
  rendered: [],
  history: null,
  tool: 'pencil',
  prevTool: 'pencil',
  color: DEFAULT_COLOR,
  customColor: null,
  showGrid: true,
  scale: 16,
  cursor: { x: 8, y: 8 },
  hover: null,
  stroke: null,
  keyStroke: null,
  draft: null,
  saving: false,
  cursorTimer: 0,
};

const present = () => ctx.history.present;
const visiblePixels = () => ctx.draft || present();

const persist = () => {
  saveState({
    pixels: present(),
    color: ctx.color,
    customColor: ctx.customColor,
    tool: ctx.tool,
    showGrid: ctx.showGrid,
    scale: ctx.scale,
  });
};

const announce = (text) => {
  const el = ctx.els.status;
  // 같은 문구도 다시 읽히도록 비웠다가 채운다
  el.textContent = '';
  requestAnimationFrame(() => {
    el.textContent = text;
  });
};

const describeCell = (x, y) => {
  const value = getPixel(visiblePixels(), x, y);
  return `${y + 1}행 ${x + 1}열, ${value ? colorName(value) : '투명'}`;
};

const announceCursor = () => {
  clearTimeout(ctx.cursorTimer);
  // 빠르게 이동할 때 마지막 위치만 읽히도록 짧게 지연
  ctx.cursorTimer = setTimeout(() => {
    ctx.els.cursorStatus.textContent = describeCell(ctx.cursor.x, ctx.cursor.y);
  }, 150);
};

/* ===== 렌더링 ===== */
const renderCells = () => {
  const pixels = visiblePixels();
  pixels.forEach((value, index) => {
    if (ctx.rendered[index] === value) return;
    ctx.rendered[index] = value;
    const cell = ctx.cells[index];
    if (value) {
      cell.style.backgroundColor = value;
      delete cell.dataset.empty;
    } else {
      cell.style.backgroundColor = '';
      cell.dataset.empty = '';
    }
  });
};

const renderMarkers = () => {
  ctx.cells.forEach((cell) => {
    cell.classList.remove('is-cursor', 'is-hover');
  });
  ctx.cells[toIndex(ctx.cursor.x, ctx.cursor.y)].classList.add('is-cursor');
  if (ctx.hover && !ctx.stroke) ctx.cells[toIndex(ctx.hover.x, ctx.hover.y)].classList.add('is-hover');
};

const renderControls = () => {
  const { els } = ctx;
  els.toolButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.tool === ctx.tool));
  });

  const inPalette = PALETTE.some((entry) => entry.value === ctx.color);
  els.swatches.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.color === ctx.color));
  });
  els.customSwatch.classList.toggle('is-selected', !inPalette && ctx.customColor === ctx.color);
  if (ctx.customColor) {
    els.customSwatch.style.setProperty('--swatch', ctx.customColor);
    els.customSwatch.dataset.hasColor = '';
    els.customInput.value = ctx.customColor;
  } else {
    els.customSwatch.style.removeProperty('--swatch');
    delete els.customSwatch.dataset.hasColor;
  }

  if (ctx.tool === 'eraser') {
    els.currentSwatch.dataset.empty = '';
    els.currentSwatch.style.removeProperty('--swatch');
    els.currentName.textContent = '투명';
  } else {
    delete els.currentSwatch.dataset.empty;
    els.currentSwatch.style.setProperty('--swatch', ctx.color);
    els.currentName.textContent = colorName(ctx.color);
  }

  els.undo.disabled = !canUndo(ctx.history);
  els.redo.disabled = !canRedo(ctx.history);
  els.clear.disabled = isEmpty(present());
  els.gridToggle.setAttribute('aria-pressed', String(ctx.showGrid));
  els.canvas.classList.toggle('show-grid', ctx.showGrid);
  els.scale.value = String(ctx.scale);
};

const render = () => {
  renderCells();
  renderMarkers();
  renderControls();
};

/* ===== 상태 변경 ===== */
const commitPixels = (pixels) => {
  const next = commit(ctx.history, pixels);
  if (next === ctx.history) return false;
  ctx.history = next;
  return true;
};

const finishStroke = () => {
  if (!ctx.stroke && !ctx.keyStroke) return;
  const changed = commitPixels(ctx.draft);
  ctx.stroke = null;
  ctx.keyStroke = null;
  ctx.draft = null;
  render();
  if (changed) persist();
};

const setTool = (tool) => {
  if (!TOOLS.includes(tool) || tool === ctx.tool) return;
  finishStroke();
  // 스포이드는 한 번 찍은 뒤 연필/채우기로 돌아간다
  if (tool === 'picker') ctx.prevTool = ctx.tool === 'fill' ? 'fill' : 'pencil';
  ctx.tool = tool;
  render();
  persist();
};

const setColor = (color) => {
  const value = normalizeColor(color);
  if (!value) return;
  ctx.color = value;
  // 지우개 상태에서 색을 고르면 바로 칠할 수 있게 연필로 바꾼다
  if (ctx.tool === 'eraser') ctx.tool = 'pencil';
  render();
  persist();
};

const toggleGrid = () => {
  ctx.showGrid = !ctx.showGrid;
  render();
  persist();
};

const doUndo = () => {
  finishStroke();
  const next = undo(ctx.history);
  if (next === ctx.history) return;
  ctx.history = next;
  render();
  persist();
  announce('되돌렸어요');
};

const doRedo = () => {
  finishStroke();
  const next = redo(ctx.history);
  if (next === ctx.history) return;
  ctx.history = next;
  render();
  persist();
  announce('다시 했어요');
};

const strokeColor = (erase) => (erase || ctx.tool === 'eraser' ? null : ctx.color);

const pickAt = (x, y) => {
  const value = getPixel(present(), x, y);
  if (value) {
    ctx.color = value;
    ctx.tool = ctx.prevTool;
    announce(`${colorName(value)} 색을 골랐어요`);
  } else {
    ctx.tool = 'eraser';
    announce('투명 칸이라 지우개로 바꿨어요');
  }
  render();
  persist();
};

// 현재 도구를 한 칸에 한 번 적용 (키보드·포인터 공용)
const applyAt = (x, y, { erase = false } = {}) => {
  if (ctx.tool === 'picker') {
    if (!erase) pickAt(x, y);
    return;
  }
  const color = strokeColor(erase);
  const next = ctx.tool === 'fill'
    ? floodFill(present(), x, y, color)
    : setPixel(present(), x, y, color);
  if (commitPixels(next)) {
    render();
    persist();
  }
};

const clearAll = () => {
  finishStroke();
  if (commitPixels(clearPixels(present()))) {
    render();
    persist();
    announce('그림을 모두 지웠어요');
  }
};

/* ===== 포인터 ===== */
const cellFromEvent = (event) =>
  pointToCell(event.clientX, event.clientY, ctx.els.canvas.getBoundingClientRect(), SIZE);

const sameCell = (a, b) => a.x === b.x && a.y === b.y;

const bindPointer = (canvasEl) => {
  canvasEl.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  canvasEl.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary) return;
    if (event.button !== 0 && event.button !== 2) return;
    event.preventDefault();
    canvasEl.focus({ preventScroll: true });
    finishStroke();

    const erase = event.button === 2;
    const cell = cellFromEvent(event);
    ctx.cursor = cell;

    if (ctx.tool === 'fill' || ctx.tool === 'picker') {
      applyAt(cell.x, cell.y, { erase });
      return;
    }

    try {
      canvasEl.setPointerCapture(event.pointerId);
    } catch (e) {
      // 캡처가 안 되는 환경이어도 그리기는 계속한다
    }
    ctx.stroke = { pointerId: event.pointerId, last: cell, erase };
    ctx.draft = setPixel(present(), cell.x, cell.y, strokeColor(erase));
    render();
  });

  canvasEl.addEventListener('pointermove', (event) => {
    const { stroke } = ctx;
    if (!stroke) {
      if (event.pointerType === 'mouse') {
        const cell = cellFromEvent(event);
        if (!ctx.hover || !sameCell(ctx.hover, cell)) {
          ctx.hover = cell;
          renderMarkers();
        }
      }
      return;
    }
    if (event.pointerId !== stroke.pointerId) return;

    const events = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
    const list = events.length ? events : [event];
    const color = strokeColor(stroke.erase);
    let changed = false;
    list.forEach((item) => {
      const cell = cellFromEvent(item);
      if (sameCell(cell, stroke.last)) return;
      // 빠르게 그어도 끊기지 않게 사이 칸을 직선으로 잇는다
      ctx.draft = drawLine(ctx.draft, stroke.last.x, stroke.last.y, cell.x, cell.y, color);
      stroke.last = cell;
      changed = true;
    });
    if (changed) {
      ctx.cursor = stroke.last;
      renderCells();
      renderMarkers();
    }
  });

  const endStroke = (event) => {
    if (!ctx.stroke || event.pointerId !== ctx.stroke.pointerId) return;
    finishStroke();
  };

  // 시스템 제스처 등으로 취소된 획은 기록에 남기지 않고 버린다
  const cancelStroke = (event) => {
    if (!ctx.stroke || event.pointerId !== ctx.stroke.pointerId) return;
    ctx.stroke = null;
    ctx.draft = null;
    render();
  };

  canvasEl.addEventListener('pointerup', endStroke);
  canvasEl.addEventListener('pointercancel', cancelStroke);
  canvasEl.addEventListener('lostpointercapture', endStroke);

  canvasEl.addEventListener('pointerleave', () => {
    if (!ctx.hover) return;
    ctx.hover = null;
    renderMarkers();
  });
};

/* ===== 키보드 ===== */
const paintKeyStroke = (x, y) => {
  const color = strokeColor(false);
  ctx.draft = setPixel(ctx.draft, x, y, color);
};

const bindKeyboard = (canvasEl) => {
  canvasEl.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const { cursor } = ctx;

    if (ARROWS[event.key]) {
      event.preventDefault();
      const [dx, dy] = ARROWS[event.key];
      const x = Math.min(SIZE - 1, Math.max(0, cursor.x + dx));
      const y = Math.min(SIZE - 1, Math.max(0, cursor.y + dy));
      const painting = event.shiftKey && (ctx.tool === 'pencil' || ctx.tool === 'eraser') && !ctx.stroke;
      if (painting) {
        // Shift를 누르고 있는 동안의 칠하기는 한 단계로 묶는다
        if (!ctx.keyStroke) {
          ctx.keyStroke = true;
          ctx.draft = present();
          paintKeyStroke(cursor.x, cursor.y);
        }
        paintKeyStroke(x, y);
      }
      ctx.cursor = { x, y };
      renderCells();
      renderMarkers();
      announceCursor();
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      ctx.cursor = { x: event.key === 'Home' ? 0 : SIZE - 1, y: cursor.y };
      renderMarkers();
      announceCursor();
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (event.repeat && ctx.tool === 'picker') return;
      finishStroke();
      applyAt(cursor.x, cursor.y);
      announceCursor();
    }
  });

  canvasEl.addEventListener('keyup', (event) => {
    if (event.key === 'Shift' && ctx.keyStroke) finishStroke();
  });

  canvasEl.addEventListener('blur', () => {
    if (ctx.keyStroke) finishStroke();
  });
};

const isTypingTarget = (target) =>
  target instanceof HTMLElement && target.closest('input, select, textarea') !== null;

const bindShortcuts = () => {
  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) return;
    if (ctx.els.dialog.open || isTypingTarget(event.target)) return;
    const mod = event.ctrlKey || event.metaKey;

    if (mod && !event.altKey) {
      if (event.code === 'KeyZ') {
        event.preventDefault();
        if (event.shiftKey) doRedo();
        else doUndo();
      } else if (event.code === 'KeyY' && event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        doRedo();
      }
      return;
    }
    if (event.altKey || event.shiftKey || event.repeat) return;

    // 한글 자판에서도 동작하도록 key 대신 code를 본다
    const toolByCode = { KeyP: 'pencil', KeyE: 'eraser', KeyF: 'fill', KeyI: 'picker' };
    if (toolByCode[event.code]) {
      event.preventDefault();
      setTool(toolByCode[event.code]);
      announce(`${TOOL_NAMES[ctx.tool]} 도구`);
    } else if (event.code === 'KeyG') {
      event.preventDefault();
      toggleGrid();
      announce(ctx.showGrid ? '격자선 켬' : '격자선 끔');
    }
  });
};

/* ===== 대화상자·저장 ===== */
const openClearDialog = () => {
  if (isEmpty(present())) return;
  finishStroke();
  const { dialog } = ctx.els;
  dialog.returnValue = '';
  dialog.showModal();
};

const bindDialog = () => {
  const { dialog, clear, canvas } = ctx.els;
  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'confirm') clearAll();
    // 지운 뒤에는 버튼이 비활성이 되므로 캔버스로 포커스를 옮긴다
    if (clear.disabled) canvas.focus({ preventScroll: true });
    else clear.focus({ preventScroll: true });
  });
};

const handleSave = async () => {
  if (ctx.saving) return;
  ctx.saving = true;
  finishStroke();
  const px = SIZE * ctx.scale;
  try {
    const blob = await createPngBlob(present(), ctx.scale, SIZE);
    downloadBlob(blob, makeFileName(new Date(), px));
    announce(`${px}×${px} PNG로 저장했어요`);
  } catch (e) {
    announce('PNG로 저장하지 못했어요');
  } finally {
    ctx.saving = false;
  }
};

/* ===== 테마 ===== */
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

/* ===== 초기화 ===== */
const buildCells = () => {
  const fragment = document.createDocumentFragment();
  ctx.cells = Array.from({ length: SIZE * SIZE }, () => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.empty = '';
    fragment.append(cell);
    return cell;
  });
  ctx.rendered = new Array(SIZE * SIZE).fill(null);
  ctx.els.canvas.append(fragment);
};

const buildPalette = () => {
  const { palette, customSwatch } = ctx.els;
  ctx.els.swatches = PALETTE.map(({ name, value }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch';
    button.dataset.color = value;
    button.style.setProperty('--swatch', value);
    button.setAttribute('aria-label', name);
    button.setAttribute('aria-pressed', 'false');
    button.title = name;
    button.addEventListener('click', () => setColor(value));
    palette.insertBefore(button, customSwatch);
    return button;
  });
};

const restore = () => {
  const saved = loadSaved();
  ctx.history = createHistory(saved.pixels || createPixels(SIZE), 50);
  if (saved.color) ctx.color = saved.color;
  if (saved.customColor !== undefined) ctx.customColor = saved.customColor;
  if (saved.tool) ctx.tool = saved.tool;
  if (typeof saved.showGrid === 'boolean') ctx.showGrid = saved.showGrid;
  if (saved.scale) ctx.scale = saved.scale;
};

export const init = () => {
  const byId = (id) => document.getElementById(id);
  ctx.els = {
    canvas: byId('canvas'),
    palette: byId('palette'),
    customSwatch: byId('custom-swatch'),
    customInput: byId('custom-color'),
    currentSwatch: byId('current-swatch'),
    currentName: byId('current-name'),
    undo: byId('undo'),
    redo: byId('redo'),
    gridToggle: byId('grid-toggle'),
    clear: byId('clear'),
    scale: byId('scale'),
    save: byId('save'),
    dialog: byId('clear-dialog'),
    status: byId('status'),
    cursorStatus: byId('cursor-status'),
    toolButtons: [...document.querySelectorAll('[data-tool]')],
  };

  restore();
  buildCells();
  buildPalette();

  ctx.els.toolButtons.forEach((button) => {
    button.addEventListener('click', () => setTool(button.dataset.tool));
  });
  ctx.els.undo.addEventListener('click', doUndo);
  ctx.els.redo.addEventListener('click', doRedo);
  ctx.els.gridToggle.addEventListener('click', toggleGrid);
  ctx.els.clear.addEventListener('click', openClearDialog);
  ctx.els.save.addEventListener('click', handleSave);
  ctx.els.scale.addEventListener('change', () => {
    const value = Number(ctx.els.scale.value);
    if ([1, 8, 16, 32].includes(value)) ctx.scale = value;
    persist();
  });

  const { customInput } = ctx.els;
  customInput.addEventListener('input', () => {
    const value = normalizeColor(customInput.value);
    if (!value) return;
    ctx.customColor = value;
    setColor(value);
  });
  customInput.addEventListener('click', () => {
    // 이미 고른 사용자 색이 있으면 누르는 것만으로 다시 선택
    if (ctx.customColor) setColor(ctx.customColor);
  });

  bindPointer(ctx.els.canvas);
  bindKeyboard(ctx.els.canvas);
  bindShortcuts();
  bindDialog();
  bindThemeSync();
  render();
};

init();
