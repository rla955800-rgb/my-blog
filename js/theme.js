// 다크/라이트 모드 전환. 사용자가 고르기 전까지는 OS 설정을 따른다.

const STORAGE_KEY = 'theme';
const root = document.documentElement;
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

const currentTheme = () => root.dataset.theme || (darkQuery.matches ? 'dark' : 'light');

const saveTheme = (theme) => {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // 저장소가 막힌 환경에서도 전환 자체는 동작하게 둔다
  }
};

export const initTheme = (button) => {
  const syncLabel = () => {
    const label = currentTheme() === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환';
    button.setAttribute('aria-label', label);
    button.title = label;
  };

  button.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    saveTheme(next);
    syncLabel();
  });

  darkQuery.addEventListener('change', syncLabel);
  syncLabel();
};
