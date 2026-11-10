import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cancel, PREMIUM, settle, subscribe } from './premium';

const DAY = 86_400_000;
const PERIOD = PREMIUM.periodDays * DAY;

test('abonelik bir dönem sürer ve yenilenir', () => {
  const sub = subscribe(0);
  assert.deepEqual(sub, { renewsAt: PERIOD, autoRenew: true });
  assert.equal(settle(sub, PERIOD - 1), sub);
  assert.equal(settle(sub, PERIOD)?.renewsAt, 2 * PERIOD);
  // Uygulama uzun süre açılmadıysa geçen dönemler kadar ileri alınır.
  assert.equal(settle(sub, 3 * PERIOD + DAY)?.renewsAt, 4 * PERIOD);
});

test('iptal edilen abonelik dönem sonuna kadar sürer, sonra biter', () => {
  const sub = cancel(subscribe(0));
  assert.equal(sub.autoRenew, false);
  assert.equal(settle(sub, PERIOD - 1), sub);
  assert.equal(settle(sub, PERIOD), null);
});

test('abonelik yoksa premium yok', () => {
  assert.equal(settle(null, 0), null);
});
