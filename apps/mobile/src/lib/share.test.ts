/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PlayState } from '../api/types';
import { shareText } from './share';

const base: PlayState = {
  questionId: 1,
  no: 31,
  day: '2026-12-31',
  format: 'price',
  started: true,
  archive: false,
  cancelled: false,
  finished: true,
  score: 55,
  scorePending: false,
  solved: true,
  numeric: null,
  trivia: null,
  compare: null,
  poll: null,
  reveal: { answer: 45, unit: 'TL', correctOption: null, factText: null, priceHistory: null, sourceText: null, sourceUrl: null, sourceDate: null },
};

test('fiyat kartı planla aynı ve cevabı içermez', () => {
  const text = shareText(
    {
      ...base,
      numeric: {
        attemptsUsed: 4,
        maxAttempts: 6,
        hintUsed: false,
        canUseHint: false,
        hintAfterAttempts: 3,
        hint: null,
        guesses: [
          { value: 20, direction: 'higher', close: false },
          { value: 80, direction: 'lower', close: false },
          { value: 49, direction: 'lower', close: true },
          { value: 45, direction: 'correct', close: true },
        ],
      },
    },
    17,
  );
  assert.equal(text, 'Günün Sorusu ? #31\nFiyatı Ne? · 4/6 · 55 puan\n🟧🟦🟥🟩\nSeri: 17 gün\ngununsorusu.app/31');
  assert.ok(!text.includes('45 TL'));
});

test('bulunamayan sayısal oyun X/6, ipucu 💡', () => {
  const text = shareText(
    {
      ...base,
      format: 'number',
      solved: false,
      score: 5,
      numeric: {
        attemptsUsed: 6,
        maxAttempts: 6,
        hintUsed: true,
        canUseHint: false,
        hintAfterAttempts: 3,
        hint: { min: 1, max: 2 },
        guesses: Array.from({ length: 6 }, () => ({ value: 1, direction: 'higher' as const, close: false })),
      },
    },
    0,
  );
  assert.match(text, /Sayı Tahmini · X\/6 · 5 puan/);
  assert.match(text, /🟧{6} 💡/u);
  assert.ok(!text.includes('Seri'));
});

test('anket puanı beklemedeyse "puan yarın"', () => {
  const text = shareText({ ...base, format: 'poll', score: null, scorePending: true }, 3);
  assert.match(text, /Türkiye ne diyor\? · puan yarın/);
});

test('arşiv oyununda seri yazılmaz', () => {
  const text = shareText(
    {
      ...base,
      archive: true,
      format: 'compare',
      score: 60,
      compare: {
        rounds: 5,
        answered: [true, true, false, true, false].map((c, i) => ({ round: i, choice: 0, correct: c, correctChoice: 0, valueA: null, valueB: null })),
      },
    },
    9,
  );
  assert.equal(text, 'Günün Sorusu ? #31 (arşiv)\nHangisi daha…? · 3/5 · 60 puan\n🟩🟩⬛🟩⬛\ngununsorusu.app/31');
});

test('bilgi: süre ve sonuç', () => {
  const t = { options: [], timeLimitSec: 30, startedAt: '', deadline: '', chosenOption: 2, elapsedMs: 7240, timedOut: false };
  assert.match(shareText({ ...base, format: 'trivia', score: 92, trivia: t }, 1), /Bilgi · ✅ 7,2 sn · 92 puan/);
  assert.match(
    shareText({ ...base, format: 'trivia', solved: false, score: 0, trivia: { ...t, chosenOption: null, timedOut: true } }, 1),
    /⏱️ süre doldu/,
  );
});
