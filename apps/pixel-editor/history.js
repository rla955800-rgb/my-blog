export const createHistory = (pixels, limit = 50) => ({
  past: [],
  present: pixels,
  future: [],
  limit,
});

export const commit = (history, pixels) => {
  if (pixels === history.present) return history;
  const past = [...history.past, history.present];
  if (past.length > history.limit) past.splice(0, past.length - history.limit);
  return { ...history, past, present: pixels, future: [] };
};

export const canUndo = (history) => history.past.length > 0;

export const canRedo = (history) => history.future.length > 0;

export const undo = (history) => {
  if (!canUndo(history)) return history;
  const past = history.past.slice(0, -1);
  const previous = history.past[history.past.length - 1];
  return { ...history, past, present: previous, future: [history.present, ...history.future] };
};

export const redo = (history) => {
  if (!canRedo(history)) return history;
  const [next, ...future] = history.future;
  return { ...history, past: [...history.past, history.present], present: next, future };
};
