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
  generateLeagueCode,
  normalizeLeagueCode,
  rankStandings,
  weekStart,
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

test('lig haftası Pazartesi başlar', () => {
  assert.equal(weekStart('2026-12-07'), '2026-12-07');
  assert.equal(weekStart('2026-12-09'), '2026-12-07');
  assert.equal(weekStart('2026-12-13'), '2026-12-07');
  assert.equal(weekStart('2026-12-14'), '2026-12-14');
  assert.equal(weekStart('2027-01-01'), '2026-12-28');
});

test('lig kodu', () => {
  assert.equal(normalizeLeagueCode('K7P2QX'), 'K7P2QX');
  assert.equal(normalizeLeagueCode(' k7p-2qx '), 'K7P2QX');
  assert.equal(normalizeLeagueCode('K7P 2QX'), 'K7P2QX');
  for (const bad of ['şehir1', 'K7P2Q', 'K7P2QXA', 'K0P2QX', '', 'abcdeı', 'abcdei', 'ABCDEİ', null]) {
    assert.equal(normalizeLeagueCode(bad), null, String(bad));
  }
  for (let i = 0; i < 200; i++) {
    const code = generateLeagueCode();
    assert.equal(normalizeLeagueCode(code), code);
  }
});

test('lig sıralaması: eşitlik aynı sıra, sonraki atlanır', () => {
  const ranked = rankStandings([
    { key: 'a', name: 'Ayşe', total: 250, played: 3 },
    { key: 'b', name: 'Bora', total: 300, played: 3 },
    { key: 'c', name: 'Cem', total: 250, played: 3 },
    { key: 'd', name: 'Deniz', total: 100, played: 1 },
  ]);
  assert.deepEqual(ranked.map((r) => r.key), ['b', 'a', 'c', 'd']);
  assert.deepEqual(ranked.map((r) => r.rank), [1, 2, 2, 4]);

  const tied = rankStandings([
    { key: 'z', name: 'Zeynep', total: 0, played: 0 },
    { key: 'c', name: 'Çağla', total: 0, played: 0 },
    { key: 'can', name: 'Can', total: 0, played: 0 },
    { key: 'p', name: 'Pelin', total: 0, played: 1 },
  ]);
  assert.deepEqual(tied.map((r) => r.key), ['p', 'can', 'c', 'z']);
  assert.ok(tied.every((r) => r.rank === 1));
});
