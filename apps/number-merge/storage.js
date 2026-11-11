const BEST_KEY = 'number-merge:best';

export const loadBest = () => {
  try {
    const value = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch (e) {
    return 0;
  }
};

export const saveBest = (score) => {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch (e) {
    // 저장소가 막혀 있으면 세션 동안 메모리 값만 쓴다
  }
};
