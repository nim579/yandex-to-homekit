import { createHash } from 'crypto';

export const uuidToMac = (uuid: string) => {
  const cleanUuid = uuid.replace(/-/g, '');

  let hash = 0;
  for (let i = 0; i < cleanUuid.length; i++) {
    const char = cleanUuid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  // Преобразование хеша в строку в шестнадцатеричном формате
  const hexHash = Math.abs(hash).toString(16).padStart(12, '0');

  return hexHash.match(/.{1,2}/g)?.join(':').toUpperCase() ?? '';
};

export const textToPin = (text: string) => {
  const hash = createHash('sha1').update(text, 'utf-8').digest('hex');
  const hashAsNumber = BigInt('0x' + hash) % 100000000n;
  return hashAsNumber.toString().padStart(8, '0').replace(/(\d{3})(\d{2})(\d{3})/, '$1-$2-$3');
};

export const sleep = (time = 1000) => {
  return new Promise(resolve => setTimeout(resolve, time));
};

export const scaleRange = (value: number, fromScale: Range, toScale: Range) => {
  const proportion = (value - fromScale.min) / (fromScale.max - fromScale.min);
  return toScale.min + proportion * (toScale.max - toScale.min);
};

export const hsToRGB = (h: number, s: number): number => {
  const v = 1;

  const c = v * (s / 100);
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return (r << 16) + (g << 8) + b;
};

export const rgbToHS = (rgb: number): { hue: number, saturation: number } => {
  const r = (rgb >> 16) & 0xFF;
  const g = (rgb >> 8) & 0xFF;
  const b = rgb & 0xFF;

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta === 0) {
    h = 0;
  } else if (max === rNorm) {
    h = 60 * (((gNorm - bNorm) / delta) % 6);
  } else if (max === gNorm) {
    h = 60 * (((bNorm - rNorm) / delta) + 2);
  } else if (max === bNorm) {
    h = 60 * (((rNorm - gNorm) / delta) + 4);
  }

  h = (h + 360) % 360;

  const s = (max === 0 ? 0 : delta / max) * 100;

  return { hue: h, saturation: s };
};

export const hsvToHs = (h: number, s: number, v: number): { hue: number, saturation: number; } => {
  return {
    hue: h,
    saturation: s * (v / 100)
  };
};

export const hsToHSV = (h: number, s: number): { h: number, s: number; v: number; } => {
  return { h, s, v: 100 };
};
