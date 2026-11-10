/**
 * Seri yapbozunun geometrisi (saf; testte de kullanılır). Görsel 3 sütun × 5 satır = 15 parçaya
 * bölünür; iç kenarlarda klasik yapboz dili/yuvası vardır. Komşu iki parça aynı kenarı paylaşır:
 * birinin dili diğerinin yuvasına oturur.
 */

export const PUZZLE_COLS = 3;
export const PUZZLE_ROWS = 5;
/** Yapboz resimlerinin boyu (assets/puzzles/*.jpg, 720×1200, 3:5). */
export const PUZZLE_W = 720;
export const PUZZLE_H = 1200;

type Pt = { x: number; y: number };

/** Yatay iç kenarın (satır r ile r+1 arası, sütun c) dili aşağı mı (+1) yukarı mı (−1)? */
const hSign = (r: number, c: number) => ((r + c) % 2 === 0 ? 1 : -1);
/** Dikey iç kenarın (sütun c ile c+1 arası, satır r) dili sağa mı (+1) sola mı (−1)? */
const vSign = (r: number, c: number) => ((r + c) % 2 === 0 ? -1 : 1);

const f = (n: number) => Math.round(n * 10) / 10;

/**
 * p0'dan p1'e giden kenar; t = 0 düz, ±1 gidiş yönünün sağ normali (−) / sol normali (+) yönünde dil.
 * Dil boyu ve genişliği parçanın kısa kenarına göre (dar parçada taşmasın).
 */
function edge(p0: Pt, p1: Pt, t: number, tab: number): string {
  if (t === 0) return `L${f(p1.x)} ${f(p1.y)}`;
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy);
  const u = { x: dx / len, y: dy / len };
  const n = { x: -u.y, y: u.x };
  // a: kenar boyunca (0–1 oran), b: normal yönünde (mutlak, dil boyuna göre).
  const at = (a: number, b: number) => {
    const ax = len / 2 + (a - 0.5) * tab * 2.6;
    return `${f(p0.x + u.x * ax + n.x * b * t)} ${f(p0.y + u.y * ax + n.y * b * t)}`;
  };
  return [
    `L${at(0.32, 0)}`,
    `C${at(0.36, 0.25 * tab)} ${at(0.18, 0.95 * tab)} ${at(0.5, 0.95 * tab)}`,
    `C${at(0.82, 0.95 * tab)} ${at(0.64, 0.25 * tab)} ${at(0.68, 0)}`,
    `L${f(p1.x)} ${f(p1.y)}`,
  ].join(' ');
}

/** Satır r, sütun c'deki parçanın SVG yolu (PUZZLE_W × PUZZLE_H koordinatlarında). */
export function piecePath(r: number, c: number): string {
  const w = PUZZLE_W / PUZZLE_COLS;
  const h = PUZZLE_H / PUZZLE_ROWS;
  const tab = Math.min(w, h) * 0.24;
  const x0 = c * w;
  const y0 = r * h;
  const x1 = x0 + w;
  const y1 = y0 + h;
  const tl = { x: x0, y: y0 };
  const tr = { x: x1, y: y0 };
  const br = { x: x1, y: y1 };
  const bl = { x: x0, y: y1 };
  const top = r === 0 ? 0 : hSign(r - 1, c);
  const right = c === PUZZLE_COLS - 1 ? 0 : -vSign(r, c);
  const bottom = r === PUZZLE_ROWS - 1 ? 0 : -hSign(r, c);
  const left = c === 0 ? 0 : vSign(r, c - 1);
  return [`M${f(x0)} ${f(y0)}`, edge(tl, tr, top, tab), edge(tr, br, right, tab), edge(br, bl, bottom, tab), edge(bl, tl, left, tab), 'Z'].join(' ');
}

/**
 * Parçaların kazanılma sırası: alttan yukarı doğru, satır satır kaydırmalı.
 * Resmin üst kısmı (İstanbul resminde doğan Soro, ötekilerde yapının tepesi) en sona kalır.
 */
export const PIECE_ORDER: readonly { r: number; c: number }[] = Array.from({ length: PUZZLE_ROWS * PUZZLE_COLS }, (_, i) => {
  const r = PUZZLE_ROWS - 1 - Math.floor(i / PUZZLE_COLS);
  const c = (Math.floor(i / PUZZLE_COLS) + i) % PUZZLE_COLS;
  return { r, c };
});
