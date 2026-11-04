/**
 * Saf yardımcılar (React Native'e bağımlı değil; `npm test` ile Node'da test edilir).
 * Türkiye her zaman UTC+3 (2016'dan beri yaz saati yok); oyun günü İstanbul saatine göredir.
 */
import type { GuessDirection, QuestionFormat } from '../api/types';

export const FORMAT_LABEL: Record<QuestionFormat, string> = {
  price: 'Fiyatı Ne?',
  number: 'Sayı Tahmini',
  poll: 'Türkiye ne diyor?',
  trivia: 'Bilgi',
  compare: 'Hangisi daha…?',
};

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(day: string, n: number): string {
  const date = parseDay(day);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

/** "2026-12-10" → "10 Aralık Perşembe" */
export function formatDay(day: string): string {
  const d = parseDay(day);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${WEEKDAYS[d.getUTCDay()]}`;
}

/** "2025-11-01" → "Kasım 2025" */
export function formatMonthYear(day: string): string {
  const d = parseDay(day);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Lig haftası: "7–13 Aralık", ay değişirse "28 Aralık – 3 Ocak". */
export function formatWeekRange(start: string, end: string): string {
  const a = parseDay(start);
  const b = parseDay(end);
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`
    : `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
}

/** Verilen andaki İstanbul günü ("2026-12-10"). */
export function istanbulDay(ms: number): string {
  return new Date(ms + 3 * 3_600_000).toISOString().slice(0, 10);
}

const SHORT_WEEKDAYS = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

/** "2026-12-10" → "Pe" */
export function shortWeekday(day: string): string {
  return SHORT_WEEKDAYS[parseDay(day).getUTCDay()];
}

/** Bir sonraki sorunun açılacağı an (ms): verilen günün ertesi günü 00:00, İstanbul. */
export function nextResetMs(day: string): number {
  return Date.parse(`${addDays(day, 1)}T00:00:00+03:00`);
}

/** 30.521 sn → "08:41:12" */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/**
 * Türkçe sayı girişi: "1.250" = bin iki yüz elli, "45,5" = kırk beş buçuk, "1.250,75" de geçerli.
 * Nokta yalnızca ardından tam üç rakam geliyorsa binlik ayırıcı sayılır ("45.5" → 45,5).
 */
export function parseTrNumber(input: string): number | null {
  const s = input.replace(/\s/g, '');
  if (!s) return null;

  let normalized: string;
  if (s.includes(',')) {
    if (!/^\d{1,3}(\.\d{3})*,\d+$|^\d+,\d+$/.test(s)) return null;
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    normalized = s.replace(/\./g, '');
  } else if (/^\d+(\.\d+)?$/.test(s)) {
    normalized = s;
  } else {
    return null;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** 1250.5 → "1.250,5" (Intl'e güvenmeden; Hermes'te yerel ayar verisi eksik olabilir). */
export function formatTrNumber(n: number, maxFraction = 2): string {
  const fixed = n.toFixed(maxFraction).replace(/\.?0+$/, '');
  const [int, frac] = fixed.split('.');
  const withDots = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return frac ? `${withDots},${frac}` : withDots;
}

export function formatAmount(n: number, unit: string | null): string {
  return unit ? `${formatTrNumber(n)} ${unit}` : formatTrNumber(n);
}

/** Tahmin satırındaki yön metni; fiyat sorularında "pahalı/ucuz", diğerlerinde "fazla/az". */
export function directionLabel(direction: GuessDirection, format: QuestionFormat): string {
  if (direction === 'correct') return 'Buldun!';
  if (format === 'price') return direction === 'higher' ? 'Daha pahalı' : 'Daha ucuz';
  return direction === 'higher' ? 'Daha fazla' : 'Daha az';
}

/** Türkçe büyük harf: "senin cevabın" → "SENİN CEVABIN" (i→İ, ı→I); yerel ayar verisine bağlı değil. */
export function trUpper(s: string): string {
  return s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
}

/** "%62" — Türkçede yüzde işareti başta. */
export function pct(n: number): string {
  return `%${formatTrNumber(n, 1)}`;
}

// İyelik eki sayının okunuşundaki son kelimeye göre: bir'i, iki'si, üç'ü, altı'sı, on'u, kırk'ı, yüz'ü…
const ONES_SUFFIX = ['ı', 'i', 'si', 'ü', 'ü', 'i', 'sı', 'si', 'i', 'u'];
const TENS_SUFFIX = ['', 'u', 'si', 'u', 'ı', 'si', 'ı', 'i', 'i', 'ı'];

/** Bir sayının yazılı hâline gelecek iyelik eki: 62 → "si", 40 → "ı", 66,7 → "si". */
export function possessiveSuffix(digits: string): string {
  const d = digits.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (d === '0' || d === '') return ONES_SUFFIX[0];
  const ones = Number(d.at(-1));
  if (ones !== 0) return ONES_SUFFIX[ones];
  const tens = d.length > 1 ? Number(d.at(-2)) : 0;
  if (tens !== 0) return TENS_SUFFIX[tens];
  if (d.length >= 3 && d.at(-3) !== '0') return 'ü'; // yüz
  if (d.length >= 4) return 'i'; // bin (milyon "u" alır ama yüzdede çıkmaz)
  return ONES_SUFFIX[0];
}

/** "%62'si", "%40'ı", "%66,7'si" — "Oyuncuların %62'si ucuz sandı." */
export function pctOf(n: number): string {
  const text = formatTrNumber(n, 1);
  const [int, frac] = text.split(',');
  return `%${text}'${possessiveSuffix(frac ?? int)}`;
}
