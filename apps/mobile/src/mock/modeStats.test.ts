import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bucketOf, MODE_BUCKETS, modeStats, type PlayRecord } from './modeStats';

const play = (p: Partial<PlayRecord> & Pick<PlayRecord, 'mode'>): PlayRecord => ({ finishedAt: 0, score: 0, solved: false, attempts: 0, correctRounds: 0, ...p });

test('kovalar: Kaç? 1–7 ve X, ünlü 1–10 ve X, pahalı 0–5', () => {
  assert.deepEqual(MODE_BUCKETS.kac, ['1', '2', '3', '4', '5', '6', '7', 'X']);
  assert.equal(MODE_BUCKETS.unlu.length, 11);
  assert.deepEqual(MODE_BUCKETS.pahali, ['0', '1', '2', '3', '4', '5']);
});

test('oyunun kovası', () => {
  assert.equal(bucketOf(play({ mode: 'kac', solved: true, attempts: 3 })), 2);
  assert.equal(bucketOf(play({ mode: 'kac', solved: false, attempts: 6 })), 7);
  assert.equal(bucketOf(play({ mode: 'unlu', solved: true, attempts: 10 })), 9);
  assert.equal(bucketOf(play({ mode: 'pahali', correctRounds: 4 })), 4);
  assert.equal(bucketOf(play({ mode: 'yapar', score: 95 })), 0);
  assert.equal(bucketOf(play({ mode: 'yapar', score: 10 })), 3);
  // Puanı bekleyen anket grafiğe girmez.
  assert.equal(bucketOf(play({ mode: 'yapar', score: null })), null);
});

test('mod sayıları, dağılım ve son oyunun kovası', () => {
  const stats = modeStats([
    play({ mode: 'kac', finishedAt: 1, solved: true, attempts: 2, score: 80 }),
    play({ mode: 'kac', finishedAt: 3, solved: false, attempts: 6, score: 10 }),
    play({ mode: 'kac', finishedAt: 2, solved: true, attempts: 2, score: 70 }),
    play({ mode: 'yapar', finishedAt: 9, score: null }),
  ]);
  const kac = stats.find((s) => s.mode === 'kac')!;
  assert.equal(kac.played, 3);
  assert.equal(kac.solved, 2);
  assert.equal(kac.avgScore, 53.3);
  assert.equal(kac.distribution[1].count, 2);
  assert.equal(kac.distribution[7].count, 1);
  assert.equal(kac.lastBucket, 7);

  const yapar = stats.find((s) => s.mode === 'yapar')!;
  assert.equal(yapar.played, 1);
  assert.equal(yapar.avgScore, null);
  assert.equal(yapar.pending, 1);
  assert.equal(yapar.lastBucket, null);
  assert.ok(yapar.distribution.every((d) => d.count === 0));

  assert.equal(stats.find((s) => s.mode === 'unlu')!.played, 0);
});
