/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  archiveAccess,
  awaitingExtraGuess,
  numericMaxAttempts,
  buildHint,
  canRepair,
  compareScore,
  EMPTY_STREAK,
  effectiveStreak,
  evaluateGuess,
  niceStep,
  numericScore,
  pollPercentages,
  pollScore,
  recordPlay,
  repair,
  triviaScore,
} from './rules';

// Beklenen değerler sunucudaki GununSorusu.Domain.Tests ile aynı.

test('sayısal değerlendirme', () => {
  assert.deepEqual(evaluateGuess(104, 100), { direction: 'correct', close: true });
  assert.deepEqual(evaluateGuess(92, 100), { direction: 'higher', close: true });
  assert.deepEqual(evaluateGuess(50, 100), { direction: 'higher', close: false });
  assert.deepEqual(evaluateGuess(120, 100), { direction: 'lower', close: false });
});

test('sayısal puan', () => {
  assert.equal(numericScore(1, true, 100, 100, false), 100);
  assert.equal(numericScore(3, true, 100, 100, false), 70);
  assert.equal(numericScore(4, true, 100, 100, true), 45);
  assert.equal(numericScore(6, false, 60, 100, false), 5);
  assert.equal(numericScore(6, false, 95, 100, false), 20);
  assert.equal(numericScore(6, false, 10, 100, true), 0);
});

test('ödüllü ek tahmin', () => {
  assert.equal(numericMaxAttempts(false), 6);
  assert.equal(numericMaxAttempts(true), 7);
  // Yalnızca 6 hak bitip bilinemediyse ve daha önce alınmadıysa sunulur.
  assert.equal(awaitingExtraGuess(6, false, false, false), true);
  assert.equal(awaitingExtraGuess(5, false, false, false), false);
  assert.equal(awaitingExtraGuess(6, true, false, false), false);
  assert.equal(awaitingExtraGuess(6, false, true, false), false);
  assert.equal(awaitingExtraGuess(7, false, false, true), false);
  // 7. hakta bulmak: 100 − 6×15 = 10; ipucuyla 0.
  assert.equal(numericScore(7, true, 100, 100, false), 10);
  assert.equal(numericScore(7, true, 100, 100, true), 0);
});

test('arşiv: günde 1 ücretsiz, sonrası reklamla', () => {
  assert.equal(archiveAccess(false, false, 0), 'free');
  assert.equal(archiveAccess(false, false, 1), 'locked');
  assert.equal(archiveAccess(true, false, 1), 'open');
  assert.equal(archiveAccess(false, true, 1), 'open');
});

test('ipucu cevabı içerir ve herkese aynıdır', () => {
  const a = buildHint(250, 7, []);
  assert.ok(a.min <= 250 && 250 <= a.max);
  assert.deepEqual(a, buildHint(250, 7, []));
  assert.equal(niceStep(87.5), 1);
  assert.equal(niceStep(1250), 10);
  assert.equal(niceStep(20), 0.1);
});

test('bilgi puanı', () => {
  assert.equal(triviaScore(true, 5000), 95);
  assert.equal(triviaScore(true, 500), 100);
  assert.equal(triviaScore(false, 1000), 0);
  assert.equal(triviaScore(true, 31_001), 0);
});

test('hangisi daha ve anket', () => {
  assert.equal(compareScore([true, true, false, true, true]), 80);
  assert.equal(pollScore(60, 66.7), 87);
  assert.equal(pollScore(0, 100), 0);
  assert.deepEqual(pollPercentages([2, 1, 0]), [66.7, 33.3, 0]);
});

test('seri', () => {
  let s = recordPlay(EMPTY_STREAK, '2026-12-10');
  s = recordPlay(s, '2026-12-11');
  assert.equal(s.current, 2);
  assert.equal(effectiveStreak(s, '2026-12-12'), 2);
  assert.equal(effectiveStreak(s, '2026-12-13'), 0);
  assert.ok(canRepair(s, '2026-12-13'));
  const r = repair(s, '2026-12-13');
  assert.equal(recordPlay(r, '2026-12-13').current, 3);
  assert.ok(!canRepair(recordPlay(r, '2026-12-13'), '2026-12-15'));
  // Mazeretli gün seriyi bozmaz.
  assert.equal(recordPlay(s, '2026-12-13', (d) => d === '2026-12-12').current, 3);
});
