const SIZE = 16;

export const renderPixels = (ctx, pixels, scale, size = SIZE) => {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, size * scale, size * scale);
  pixels.forEach((color, index) => {
    if (!color) return;
    const x = index % size;
    const y = Math.floor(index / size);
    ctx.fillStyle = color;
    ctx.fillRect(x * scale, y * scale, scale, scale);
  });
};

const dataUrlToBlob = (dataUrl) => {
  const [header, base64] = dataUrl.split(',');
  const mime = (header.match(/data:([^;]+)/) || [])[1] || 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

export const createPngBlob = (pixels, scale, size = SIZE) => {
  const canvas = document.createElement('canvas');
  canvas.width = size * scale;
  canvas.height = size * scale;
  renderPixels(canvas.getContext('2d'), pixels, scale, size);
  const fallback = () => dataUrlToBlob(canvas.toDataURL('image/png'));
  if (typeof canvas.toBlob !== 'function') return Promise.resolve(fallback());
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob || fallback()), 'image/png');
  });
};

const pad = (value) => String(value).padStart(2, '0');

export const makeFileName = (date, px) => {
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `pixel-art-${day}-${time}-${px}px.png`;
};

export const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // 바로 해제하면 일부 브라우저에서 다운로드가 취소되므로 잠시 뒤 해제
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
