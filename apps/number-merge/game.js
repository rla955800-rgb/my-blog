// 순수 게임 로직: DOM·저장소에 접근하지 않고, 상태를 받아 새 상태를 돌려준다.

export const SIZE = 4;
export const WIN_VALUE = 2048;

const DIRECTIONS = ['up', 'down', 'left', 'right'];

const createState = (size) => ({
  size,
  tiles: [],
  score: 0,
  won: false,
  keepPlaying: false,
  over: false,
  nextId: 1,
});

export const toGrid = (state) => {
  const grid = Array.from({ length: state.size }, () => Array(state.size).fill(null));
  state.tiles.forEach((tile) => {
    grid[tile.row][tile.col] = tile;
  });
  return grid;
};

export const emptyCells = (state) => {
  const grid = toGrid(state);
  const cells = [];
  grid.forEach((cols, row) => {
    cols.forEach((tile, col) => {
      if (!tile) cells.push({ row, col });
    });
  });
  return cells;
};

export const addRandomTile = (state, random = Math.random) => {
  const cells = emptyCells(state);
  if (cells.length === 0) return state;
  const index = Math.min(cells.length - 1, Math.floor(random() * cells.length));
  const { row, col } = cells[index];
  const value = random() < 0.9 ? 2 : 4;
  const tile = { id: state.nextId, value, row, col, mergedFrom: null, isNew: true };
  return { ...state, tiles: [...state.tiles, tile], nextId: state.nextId + 1 };
};

export const createGame = (size = SIZE, random = Math.random) => {
  const first = addRandomTile(createState(size), random);
  return addRandomTile(first, random);
};

// 한 줄을 앞쪽(인덱스 0)으로 밀고 합친다.
// sources[k]: 결과 k번 칸을 만든 원래 인덱스들 (빈 칸이면 null)
export const slideLine = (values) => {
  const filled = [];
  values.forEach((value, index) => {
    if (value !== null && value !== undefined) filled.push({ value, index });
  });

  const line = [];
  const sources = [];
  const merges = [];
  let gained = 0;

  for (let i = 0; i < filled.length; i += 1) {
    const current = filled[i];
    const next = filled[i + 1];
    if (next && next.value === current.value) {
      const merged = current.value * 2;
      merges.push({ to: line.length, from: [current.index, next.index] });
      sources.push([current.index, next.index]);
      line.push(merged);
      gained += merged;
      // 합쳐진 타일은 이번 이동에서 다시 합치지 않도록 다음 것을 건너뛴다
      i += 1;
    } else {
      sources.push([current.index]);
      line.push(current.value);
    }
  }

  while (line.length < values.length) {
    line.push(null);
    sources.push(null);
  }

  return { line, gained, merges, sources };
};

// 이동 방향 기준 "앞 → 뒤" 순서의 칸 좌표
const lineCells = (size, direction, index) => Array.from({ length: size }, (_, step) => {
  const back = size - 1 - step;
  if (direction === 'left') return { row: index, col: step };
  if (direction === 'right') return { row: index, col: back };
  if (direction === 'up') return { row: step, col: index };
  return { row: back, col: index };
});

export const canMove = (state) => {
  if (state.tiles.length < state.size * state.size) return true;
  const grid = toGrid(state);
  for (let row = 0; row < state.size; row += 1) {
    for (let col = 0; col < state.size; col += 1) {
      const value = grid[row][col].value;
      if (col + 1 < state.size && grid[row][col + 1].value === value) return true;
      if (row + 1 < state.size && grid[row + 1][col].value === value) return true;
    }
  }
  return false;
};

export const hasWon = (state) => state.tiles.some((tile) => tile.value >= WIN_VALUE);

export const continueGame = (state) => ({ ...state, keepPlaying: true });

export const move = (state, direction, random = Math.random) => {
  if (!DIRECTIONS.includes(direction)) return { state, moved: false, gained: 0 };

  const grid = toGrid(state);
  const tiles = [];
  let nextId = state.nextId;
  let gained = 0;
  let moved = false;

  for (let index = 0; index < state.size; index += 1) {
    const cells = lineCells(state.size, direction, index);
    const lineTiles = cells.map(({ row, col }) => grid[row][col]);
    const result = slideLine(lineTiles.map((tile) => (tile ? tile.value : null)));
    gained += result.gained;

    result.sources.forEach((source, k) => {
      if (!source) return;
      const { row, col } = cells[k];
      if (source.length === 1) {
        const tile = lineTiles[source[0]];
        if (tile.row !== row || tile.col !== col) moved = true;
        tiles.push({ ...tile, row, col, mergedFrom: null, isNew: false });
        return;
      }
      moved = true;
      const [a, b] = source.map((i) => lineTiles[i]);
      tiles.push({
        id: nextId,
        value: result.line[k],
        row,
        col,
        mergedFrom: [a.id, b.id],
        isNew: false,
      });
      nextId += 1;
    });
  }

  if (!moved) return { state, moved: false, gained: 0 };

  const slid = { ...state, tiles, score: state.score + gained, nextId };
  const withTile = addRandomTile(slid, random);
  const next = {
    ...withTile,
    won: state.won || hasWon(withTile),
  };
  return { state: { ...next, over: !canMove(next) }, moved: true, gained };
};
