import assert from 'node:assert/strict';
import { test } from 'node:test';

import { overallPercentile, percentileOf } from './rank';

test('yüzdelik: alttaki kovalar + kendi kovanın yarısı', () => {
  const h = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
  assert.equal(percentileOf(h, 55), 55);
  assert.equal(percentileOf(h, 0), 5);
  // 100 son kovaya düşer.
  assert.equal(percentileOf(h, 100), 95);
});

test('yüzdelik 1–99 arasında kalır', () => {
  assert.equal(percentileOf([0, 0, 0, 0, 0, 0, 0, 0, 0, 50], 100), 50);
  assert.equal(percentileOf([100, 0, 0, 0, 0, 0, 0, 0, 0, 0], 95), 99);
  assert.equal(percentileOf([0, 0, 0, 0, 0, 0, 0, 0, 0, 100], 0), 1);
});

test('boş ya da geçersiz dağılımda yüzdelik yok', () => {
  assert.equal(percentileOf([], 50), null);
  assert.equal(percentileOf([0, 0], 50), null);
  assert.equal(percentileOf([1, 1], Number.NaN), null);
});

test('genel: hazır olanların ortalaması', () => {
  assert.equal(overallPercentile([80, null, 60]), 70);
  assert.equal(overallPercentile([null, null]), null);
});
