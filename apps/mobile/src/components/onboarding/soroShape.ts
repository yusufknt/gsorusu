/**
 * Soro (maskot) geometrisi: marka/maskot.svg ile birebir aynı, 80×80 birimlik çizim alanı.
 * SVG değişirse bu dosya da güncellenmeli. Parçalar SVG'deki çizim sırasıyla durur;
 * canlandırılan parçalar (sağ kol, gözler, "?" kıvrımı) ayrı alanlarda.
 */

export const SORO_VIEWBOX = 80;

const INK = '#080504';
const DARK = '#16120C';
const EYE = '#19140E';
const LIMB = '#F89F2A';
const BODY = '#E85113';

export type SoroPath = { d: string; fill: string; stroke?: string; strokeWidth?: number };
export type SoroOval = { cx: number; cy: number; rx: number; ry: number; fill: string; rotate?: number };

/** Kollar ve ayaklar (gövdenin arkasında). Sağ üst kol ayrı: el sallarken döner. */
export const LIMBS: SoroPath[] = [
  {
    d: 'm25.8 62.09c-0.66 0.39-0.96 1.27-1.15 2.03-0.35 1.47-0.91 3.57-0.98 4.85-0.1 1.41 0.93 1.91 2.03 1.61 1.27-0.36 4.76-2.27 5.95-2.87-2.14-1.74-4.11-3.62-5.85-5.62z',
    fill: LIMB,
    stroke: INK,
    strokeWidth: 1.044,
  },
  {
    d: 'm54.75 62.31c0.24 0.66 1.17 4.35 1.5 6.31 0.36 1.77-0.75 2.29-1.93 1.99-1.35-0.4-4.73-2.23-5.84-2.78 2.09-1.92 4.22-3.78 6.27-5.52z',
    fill: LIMB,
    stroke: INK,
    strokeWidth: 1.044,
  },
  {
    d: 'm17.9 47.41c-0.78-0.1-1.46 0.11-2.02 0.71-1.2 1.34-2.81 3.21-3.73 4.47-1.24 1.71-0.22 2.93 1.63 3.03 1.54 0.09 3.72 0.09 5.14 0.09 0.9 0 1.64-0.42 1.98-1.09-0.82-2.64-1.83-4.97-3-7.21z',
    fill: LIMB,
    stroke: INK,
    strokeWidth: 1.044,
  },
  {
    d: 'm61.65 47.52c0.86-0.16 1.61-0.04 2.18 0.6 1.23 1.4 2.89 3.34 3.86 4.59 1.17 1.56 0.32 2.74-1.44 2.88-1.16 0.1-2.5 0.15-3.32 0.15-1.18-1.55-2.35-2.7-3.09-3.65 0.49-1.68 1.11-3.21 1.81-4.57z',
    fill: LIMB,
    stroke: INK,
    strokeWidth: 1.044,
  },
  {
    d: 'm19.5 32.68c-0.66-0.47-1.39-0.57-2.2-0.44l-5.22 0.93c-2.54 0.44-2.65 2.13-1.3 3.42l4.19 3.71c0.87 0.76 1.8 0.89 2.58 0.64 0.67-2.9 1.29-5.68 1.95-8.26z',
    fill: LIMB,
    stroke: INK,
    strokeWidth: 1.044,
  },
];

/** Sağ üst kol; el sallarken `WAVE_PIVOT` etrafında döner. */
export const WAVE_ARM: SoroPath = {
  d: 'm60.17 32.97c0.57-0.61 1.28-0.82 2.1-0.71l5.58 0.95c2.45 0.41 2.6 2.05 1.26 3.34l-4.34 3.91c-0.97 0.85-2.07 0.86-2.86 0.4-0.47-3.07-1.03-5.71-1.74-7.89z',
  fill: LIMB,
  stroke: INK,
  strokeWidth: 1.044,
};
export const WAVE_PIVOT = { x: 60.6, y: 37.5 };

/** Kulaklar, gövde ve karın. Gövdenin sağ belindeki el SVG'de gövde çizgisinin parçası; burada `HIP_HAND` olarak ayrıldı. */
export const BODY_PARTS: SoroPath[] = [
  {
    d: 'm30.07 22.21c-0.02-0.87-0.34-1.59-1.02-2.1l-4.66-3.58c-2.23-1.72-3.83-0.89-3.62 1.41 0.19 2.02 0.63 4.75 0.94 6.41 0.25 1.39 1.2 2.12 2.18 2.15 2.2-1.49 4.32-2.99 6.18-4.29z',
    fill: LIMB,
    stroke: INK,
    strokeWidth: 1.044,
  },
  {
    d: 'm49.91 22.26c-0.06-0.94 0.28-1.65 1-2.22l4.48-3.53c2.35-1.82 4-1.02 3.72 1.42-0.24 2.16-0.69 4.82-0.97 6.41-0.26 1.43-1.31 2.14-2.4 2.09-2.08-1.61-4.03-3.04-5.83-4.17z',
    fill: LIMB,
    stroke: INK,
    strokeWidth: 1.044,
  },
  {
    d: 'M41.74 20.21 C41.61 20.22 41.48 20.25 41.36 20.27 C41.94 20.8 42.21 21.44 42.21 22.19 C42.21 24.02 40.62 25.31 38.87 25.31 C36.83 25.31 35.35 23.77 35.35 21.69 C35.35 21.28 35.37 20.84 35.42 20.5 C25.42 22.29 17.44 31.06 17.44 42.34 C17.44 49.51 20.7 56.38 25.34 60.08 C25.97 63.62 29.31 66.62 32.43 68.02 L32.1 71.13 C31.13 71.61 30.57 72.28 30.57 73.09 C30.57 74.26 31.71 74.59 32.95 74.59 C34.77 74.59 36.44 74.45 36.75 72.74 L37.45 69.29 C39.31 69.48 41.09 69.48 42.72 69.31 L43.28 72.62 C43.57 74.33 44.98 74.59 46.8 74.59 C48.41 74.59 49.45 74.26 49.45 73.13 C49.45 72.22 48.8 71.52 48.03 71.14 L47.75 68.12 C50.82 66.76 53.85 64.41 54.89 61.38 C55.62 59.26 58.88 54.24 59.99 51.97 C61.38 49.13 62.06 45.97 62.06 42.55 C62.06 30.31 53.19 20.69 41.74 20.21Z',
    fill: BODY,
    stroke: INK,
    strokeWidth: 1.083,
  },
];

/** Sağ beldeki el: SVG'de gövde çizgisinin çıkıntısı, kaldırılabilsin diye ayrıldı. Gövdenin arkasında çizilir; duruşta görünüm SVG ile aynı. */
export const HIP_HAND: SoroPath = {
  d: 'M54.89 61.38 C55.21 62.78 56.41 63.59 57.47 63.59 C58.67 63.59 59.55 62.86 59.55 61.95 C59.55 61.54 59.38 61.23 58.9 61.15 C61.41 60.23 63.08 58.58 63.08 56.52 C63.08 54.59 61.46 52.99 59.99 51.97 C58.88 54.24 55.62 59.26 54.89 61.38Z',
  fill: BODY,
  stroke: INK,
  strokeWidth: 1.083,
};
/** Beldeki elin gövdeye bağlandığı nokta; kalkarken bunun etrafında döner. */
export const HIP_PIVOT = { x: 57.6, y: 57 };

export const BELLY: SoroOval = { cx: 40.38, cy: 59.62, rx: 10.38, ry: 8.34, fill: LIMB };

/** Karındaki el çizgisi, ağız, dil ve sağ kaş. */
export const FACE_LINES: SoroPath[] = [
  {
    d: 'm36.55 48.44c0.75-0.54 1.11-1.1 1.11-1.7 0-0.77-0.62-1.25-1.43-1.25-1.82 0-4.4 1.9-5.08 4.06-2.01 0.83-4.19 2.33-4.19 2.99 1.25-1.09 3.13-2.28 4.29-2.77 0.79-2.34 3.36-4.07 4.96-4.07 0.68 0 1.15 0.35 1.15 0.95 0 0.71-0.65 1.39-1.24 1.82 0.83 0.65 1.37 1.38 1.37 2.33 0 1.47-1.13 2.4-2.25 2.62-1.2 2.96-4.02 4.96-6.89 4.74 0.34 0.29 0.86 0.41 1.32 0.41 2.28 0 4.87-2.45 5.67-5.02 1.46-0.32 2.41-1.36 2.41-2.77 0-1-0.51-1.84-1.2-2.34z',
    fill: DARK,
    stroke: DARK,
    strokeWidth: 0.4167,
  },
  {
    d: 'm43.43 39.94c-1.95 0.89-4.25 1.44-6.04 1.51-0.31 0.02-0.4 0.25-0.3 0.52 0.55 1.48 2 2.52 3.36 2.52 2 0 3.42-1.98 3.34-4.25 0.02-0.21-0.16-0.37-0.36-0.3z',
    fill: EYE,
    stroke: EYE,
    strokeWidth: 0.4167,
  },
  { d: 'm43.19 42.19c-1.6-0.81-3.96 0.04-4.49 1.43 1.61 1.27 3.88 0.5 4.49-1.43z', fill: '#F0733A', stroke: EYE, strokeWidth: 0.3125 },
  {
    d: 'm49.51 27.91c-1.74-0.1-4.06 1.24-4.88 2.83-0.24 0.57 0.42 0.8 0.7 0.41 1.01-1.51 2.65-2.54 4.24-2.67 0.37-0.02 0.33-0.55-0.06-0.57z',
    fill: DARK,
    stroke: DARK,
    strokeWidth: 0.6944,
  },
];

/** Gözler (bebek + parıltı). Kırpışma her gözün merkezinde dikey ölçekle yapılır. */
export const EYES: { ball: SoroOval; shine: { cx: number; cy: number; r: number } }[] = [
  { ball: { cx: 31.17, cy: 38.22, rx: 4.244, ry: 5.451, fill: EYE, rotate: 5.638 }, shine: { cx: 30.56, cy: 35.15, r: 1.284 } },
  { ball: { cx: 48.94, cy: 36.48, rx: 4.135, ry: 5.288, fill: EYE, rotate: 4.665 }, shine: { cx: 48.17, cy: 33.68, r: 1.236 } },
];

export const CHEEKS: SoroOval[] = [
  { cx: 25.87, cy: 43.91, rx: 2.735, ry: 1.607, fill: '#FBD9C4' },
  { cx: 53.51, cy: 42.96, rx: 2.735, ry: 1.607, fill: '#FBD9C4' },
];

/** Başın üstündeki "?" kıvrımı; `CURL_PIVOT` (alt ucu) etrafında hafifçe sallanır. */
export const CURL: SoroPath = {
  d: 'm40.7 3.74c-4.83 0-8.9 3.48-8.9 7 0 1.89 1.35 3.09 2.96 3.09 1.3 0 2.35-0.77 2.78-2.01 0.44-1.24 1.51-1.96 2.65-1.96 1.47 0 2.61 0.96 2.61 2.39 0 1.45-1.05 2.34-2.61 3.12-2.87 1.38-4.83 3.16-4.83 6.32 0 2.28 1.73 3.61 3.52 3.61 1.9 0 3.33-1.35 3.33-3.05 0-0.78-0.36-1.48-0.86-1.9 0.16-0.64 1.11-1.09 2.26-1.53 3.6-1.29 5.4-3.83 5.4-7.11 0-4.5-3.63-7.97-8.31-7.97z',
  fill: BODY,
  stroke: INK,
  strokeWidth: 1.083,
};
export const CURL_PIVOT = { x: 38.8, y: 24.5 };

/** Kuyruk ucu (gövdenin önünde, sağ altta). */
export const TAIL: SoroPath = {
  d: 'm57.37 55.86-1.98 2.88c-0.48 0.73-0.74 1.55-0.68 2.51l0.41 0.74c-0.38-2.23 1.44-3.9 3.31-4.91-0.69-0.38-0.87-0.83-1.06-1.22z',
  fill: INK,
  stroke: INK,
  strokeWidth: 0.4167,
};
