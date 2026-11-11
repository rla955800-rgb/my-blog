export const PALETTE = [
  { name: '검정', value: '#000000' },
  { name: '진회색', value: '#5c5f66' },
  { name: '회색', value: '#a3a7ad' },
  { name: '흰색', value: '#ffffff' },
  { name: '고동', value: '#7a3e1f' },
  { name: '빨강', value: '#d93636' },
  { name: '주황', value: '#f08a24' },
  { name: '노랑', value: '#f5d33b' },
  { name: '연두', value: '#8fd14f' },
  { name: '초록', value: '#2e9e4f' },
  { name: '청록', value: '#1f7a8c' },
  { name: '하늘', value: '#4aa8e8' },
  { name: '파랑', value: '#2f4fd1' },
  { name: '보라', value: '#7b3fc4' },
  { name: '분홍', value: '#e46aa8' },
  { name: '살구', value: '#f2c6a0' },
];

export const DEFAULT_COLOR = '#000000';

export const normalizeColor = (value) => {
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(text)) return text;
  if (/^#[0-9a-f]{3}$/.test(text)) {
    return `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`;
  }
  return null;
};

export const colorName = (color) => {
  const found = PALETTE.find((entry) => entry.value === color);
  return found ? found.name : color;
};
