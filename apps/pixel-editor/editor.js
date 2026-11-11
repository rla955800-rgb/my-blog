export const SIZE = 16;

export const createPixels = (size = SIZE) => new Array(size * size).fill(null);

export const toIndex = (x, y, size = SIZE) => y * size + x;

export const inBounds = (x, y, size = SIZE) =>
  Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < size && y < size;

export const getPixel = (pixels, x, y, size = SIZE) =>
  inBounds(x, y, size) ? pixels[toIndex(x, y, size)] : null;

export const setPixel = (pixels, x, y, color, size = SIZE) => {
  if (!inBounds(x, y, size)) return pixels;
  const index = toIndex(x, y, size);
  if (pixels[index] === color) return pixels;
  const next = pixels.slice();
  next[index] = color;
  return next;
};

export const lineCells = (x0, y0, x1, y1) => {
  const cells = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    cells.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return cells;
};

export const drawLine = (pixels, x0, y0, x1, y1, color, size = SIZE) => {
  let next = pixels;
  lineCells(x0, y0, x1, y1).forEach(({ x, y }) => {
    if (!inBounds(x, y, size)) return;
    const index = toIndex(x, y, size);
    if (next[index] === color) return;
    // 첫 변경 때만 복사해 변화가 없으면 원래 참조를 유지
    if (next === pixels) next = pixels.slice();
    next[index] = color;
  });
  return next;
};

export const floodFill = (pixels, x, y, color, size = SIZE) => {
  if (!inBounds(x, y, size)) return pixels;
  const target = pixels[toIndex(x, y, size)];
  if (target === color) return pixels;
  const next = pixels.slice();
  const queue = [[x, y]];
  next[toIndex(x, y, size)] = color;
  // 재귀 대신 큐(BFS)로 처리
  for (let head = 0; head < queue.length; head += 1) {
    const [cx, cy] = queue[head];
    const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
    neighbors.forEach(([nx, ny]) => {
      if (!inBounds(nx, ny, size)) return;
      const index = toIndex(nx, ny, size);
      if (next[index] !== target) return;
      next[index] = color;
      queue.push([nx, ny]);
    });
  }
  return next;
};

export const isEmpty = (pixels) => pixels.every((value) => value === null);

export const clearPixels = (pixels) => (isEmpty(pixels) ? pixels : createPixels(Math.sqrt(pixels.length)));

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const pointToCell = (clientX, clientY, rect, size = SIZE) => {
  const width = rect.width || 1;
  const height = rect.height || 1;
  const x = Math.floor(((clientX - rect.left) / width) * size);
  const y = Math.floor(((clientY - rect.top) / height) * size);
  return { x: clamp(x, 0, size - 1), y: clamp(y, 0, size - 1) };
};
