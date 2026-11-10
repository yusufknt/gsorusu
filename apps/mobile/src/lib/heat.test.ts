import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Guess } from '../api/types';
import { bounds, heatOf } from './heat';

const g = (value: number, direction: Guess['direction'], close = false): Guess => ({ value, direction, close });

test('aralık: en büyük "daha fazla" ve en küçük "daha az" tahmin', () => {
  assert.deepEqual(bounds([]), { low: null, high: null });
  assert.deepEqual(bounds([g(10, 'higher'), g(100, 'lower'), g(30, 'higher'), g(60, 'lower')]), { low: 30, high: 60 });
});

test('ısı: tahmin yoksa yok, tek yönden sınırda soğuk', () => {
  assert.equal(heatOf([]), 'none');
  assert.equal(heatOf([g(10, 'higher')]), 'cold');
  assert.equal(heatOf([g(10, 'higher'), g(20, 'higher')]), 'cold');
});

test('ısı aralık daraldıkça artar', () => {
  assert.equal(heatOf([g(10, 'higher'), g(100, 'lower')]), 'cold');
  assert.equal(heatOf([g(20, 'higher'), g(50, 'lower')]), 'warm');
  assert.equal(heatOf([g(40, 'higher'), g(50, 'lower')]), 'hot');
});

test('son tahmin çok yakınsa yanıyor, bulunduysa bulundu', () => {
  assert.equal(heatOf([g(10, 'higher'), g(19, 'higher', true)]), 'burning');
  assert.equal(heatOf([g(10, 'higher'), g(20, 'correct', true)]), 'found');
});
