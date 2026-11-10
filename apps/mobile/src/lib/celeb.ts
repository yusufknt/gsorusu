/**
 * "Hangi ünlü?" kuralları (saf; test sunucusu ve uygulama birlikte kullanır, testte de çalışır).
 * Oyuncu bir ünlü yazar, 8 kutu doğru ünlüyle karşılaştırılır: yeşil aynı, turuncu yakın, kırmızı farklı;
 * sayısal ve sıralı kutularda ok doğru yönü gösterir.
 */
import type { CelebAttr, CelebCell, CelebField, CelebGuess, CelebProfile, CelebStatus } from '../api/types';
import { foldName } from './search';

export const CELEB = {
  maxGuesses: 10,
  yearClose: 5,
  letterClose: 2,
  /** Bu kadar tahminden sonra ünlünün bilinen işi açılır. */
  hintFactAfter: 3,
  /** Bu kadar tahminden sonra adın kalıbı ("S•••• U••••") açılır. */
  hintPatternAfter: 6,
  scoreStep: 10,
} as const;

export const CELEB_ATTRS: readonly CelebAttr[] = ['alan', 'tur', 'cinsiyet', 'dogumYili', 'dogumYeri', 'donem', 'hayatta', 'basHarf'];

export const FIELD_LABEL: Record<CelebField, string> = {
  muzik: 'Müzik',
  oyunculuk: 'Oyunculuk',
  spor: 'Spor',
  edebiyat: 'Edebiyat',
  televizyon: 'Televizyon',
  internet: 'İnternet',
};

// --- Baş harf (Türk alfabesi; şapkalı harf şapkasız sayılır) ---

const ALPHABET = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
const PLAIN: Record<string, string> = { Â: 'A', Î: 'İ', Û: 'U' };

export function initial(name: string): string {
  const ch = name.charAt(0).toLocaleUpperCase('tr');
  return PLAIN[ch] ?? ch;
}

const letterIndex = (name: string) => ALPHABET.indexOf(initial(name));

// --- Görünen değerler ---

/** 1990 → "1990’lar"; okunuşa göre ek (yirmi → ler, otuz → lar). */
export function decadeLabel(decade: number): string {
  const back = [10, 30, 40, 60, 90].includes(decade % 100);
  return `${decade}’${back ? 'lar' : 'ler'}`;
}

export const fieldsLabel = (c: CelebProfile): string => c.fields.map((f) => FIELD_LABEL[f]).join(' · ');
const placeLabel = (c: CelebProfile) => (c.region === 'Yurt dışı' ? c.place : `${c.place} · ${c.region}`);
export const birthYear = (c: CelebProfile): number => Number(c.birth.slice(0, 4));

// --- Karşılaştırma ---

const arrow = (guess: number, answer: number) => (answer > guess ? 'up' : answer < guess ? 'down' : null);

function cell(attr: CelebAttr, value: string, status: CelebStatus, dir: 'up' | 'down' | null = null): CelebCell {
  return { attr, value, status, arrow: status === 'correct' ? null : dir };
}

function near(guess: number, answer: number, closeWithin: number): CelebStatus {
  const d = Math.abs(guess - answer);
  return d === 0 ? 'correct' : d <= closeWithin ? 'partial' : 'wrong';
}

/** Tahmin edilen ünlünün 8 kutusu, doğru ünlüye göre renklenmiş. */
export function compareCeleb(guess: CelebProfile, answer: CelebProfile): CelebGuess {
  const sameFields = guess.fields.length === answer.fields.length && guess.fields.every((f) => answer.fields.includes(f));
  const overlap = guess.fields.some((f) => answer.fields.includes(f));
  const gi = letterIndex(guess.name);
  const ai = letterIndex(answer.name);

  const cells: CelebCell[] = [
    cell('alan', fieldsLabel(guess), sameFields ? 'correct' : overlap ? 'partial' : 'wrong'),
    // Tür: aynı tür yeşil; tür farklı ama alan ortaksa turuncu (ör. Pop ↔ Rock).
    cell('tur', guess.genre, guess.genre === answer.genre ? 'correct' : overlap ? 'partial' : 'wrong'),
    cell('cinsiyet', guess.sex === 'k' ? 'Kadın' : 'Erkek', guess.sex === answer.sex ? 'correct' : 'wrong'),
    cell('dogumYili', String(birthYear(guess)), near(birthYear(guess), birthYear(answer), CELEB.yearClose), arrow(birthYear(guess), birthYear(answer))),
    cell('dogumYeri', placeLabel(guess), guess.place === answer.place ? 'correct' : guess.region === answer.region ? 'partial' : 'wrong'),
    cell('donem', decadeLabel(guess.decade), near(guess.decade, answer.decade, 10), arrow(guess.decade, answer.decade)),
    cell('hayatta', guess.alive ? 'Hayatta' : 'Hayatta değil', guess.alive === answer.alive ? 'correct' : 'wrong'),
    cell('basHarf', initial(guess.name), near(gi, ai, CELEB.letterClose), arrow(gi, ai)),
  ];
  return { name: guess.name, correct: guess.name === answer.name, cells };
}

/** Büyük/küçük harf ve Türkçe karakter farkı gözetmeden ada göre bulur. */
export function findIn<T extends { name: string }>(people: readonly T[], name: string): T | undefined {
  const key = foldName(name);
  return people.find((c) => foldName(c.name) === key);
}

/**
 * Şimdiye kadarki kutularla hâlâ uyuşan ünlüler (cevap bunlardan biri). Bir aday, her tahmin ona göre
 * karşılaştırıldığında aynı renkleri ve okları veriyorsa olasıdır. Denenmiş ve yanlış çıkanlar elenir.
 */
export function possibleCelebs(people: readonly CelebProfile[], guesses: readonly CelebGuess[]): CelebProfile[] {
  return people.filter((candidate) =>
    guesses.every((g) => {
      if (g.correct) return candidate.name === g.name;
      if (candidate.name === g.name) return false;
      const guessed = findIn(people, g.name);
      if (!guessed) return true;
      const expect = compareCeleb(guessed, candidate).cells;
      return g.cells.every((c, i) => expect[i].status === c.status && expect[i].arrow === c.arrow);
    }),
  );
}

/** Adın kalıbı: her kelimenin baş harfi açık, kalanı nokta ("Sezen Aksu" → "S•••• A•••"). */
export function namePattern(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0) + '•'.repeat(Math.max(0, w.length - 1)))
    .join(' ');
}

/** 1. tahminde 100, sonraki her tahminde −10; bulunamazsa 0. */
export function celebScore(guesses: number, solved: boolean): number {
  return solved ? Math.max(0, 100 - CELEB.scoreStep * (guesses - 1)) : 0;
}
