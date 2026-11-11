import { normalizeColor } from './palette.js';

const STORAGE_KEY = 'pixel-editor:v1';
const PIXEL_COUNT = 256;
const TOOLS = ['pencil', 'eraser', 'fill', 'picker'];
const SCALES = [1, 8, 16, 32];

const isHex = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/.test(value);

const validPixels = (pixels) =>
  Array.isArray(pixels) &&
  pixels.length === PIXEL_COUNT &&
  pixels.every((value) => value === null || isHex(value));

export const loadSaved = () => {
  let data;
  try {
    data = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (e) {
    return {};
  }
  if (!data || typeof data !== 'object' || data.version !== 1) return {};

  const result = {};
  if (validPixels(data.pixels)) result.pixels = data.pixels.slice();
  const color = normalizeColor(data.color);
  if (color) result.color = color;
  if (data.customColor === null) result.customColor = null;
  else if (normalizeColor(data.customColor)) result.customColor = normalizeColor(data.customColor);
  if (TOOLS.includes(data.tool)) result.tool = data.tool;
  if (typeof data.showGrid === 'boolean') result.showGrid = data.showGrid;
  if (SCALES.includes(data.scale)) result.scale = data.scale;
  return result;
};

export const saveState = (state) => {
  try {
    const value = {
      version: 1,
      size: 16,
      pixels: state.pixels,
      color: state.color,
      customColor: state.customColor,
      tool: state.tool,
      showGrid: state.showGrid,
      scale: state.scale,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (e) {
    // 저장소가 막혀 있으면 메모리에서만 동작한다
  }
};
