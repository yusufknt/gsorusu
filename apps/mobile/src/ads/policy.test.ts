/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { freshLedger, installDayNo, interstitialDecision, recordInterstitial, recordTabSwitch, rollover } from './policy';

const MIN = 60_000;
const T0 = Date.parse('2026-11-05T10:00:00Z');

test('ilk 2 gün geçiş reklamı yok, 3. gün başlar', () => {
  const l = freshLedger('2026-11-01');
  assert.deepEqual(interstitialDecision(l, 'after_result', T0, '2026-11-01'), { ok: false, reason: 'grace_period' });
  assert.deepEqual(interstitialDecision(l, 'after_result', T0, '2026-11-02'), { ok: false, reason: 'grace_period' });
  assert.deepEqual(interstitialDecision(l, 'after_result', T0, '2026-11-03'), { ok: true });
  assert.equal(installDayNo(l, '2026-11-03'), 3);
});

test('günde en fazla 2 geçiş reklamı, sonuç sonrası günde 1', () => {
  const today = '2026-11-05';
  let l = freshLedger('2026-11-01');
  l = recordInterstitial(l, 'after_result', T0, today);
  assert.deepEqual(interstitialDecision(l, 'after_result', T0 + 10 * MIN, today), { ok: false, reason: 'placement_cap' });
  assert.deepEqual(interstitialDecision(l, 'after_archive', T0 + 10 * MIN, today), { ok: true });
  l = recordInterstitial(l, 'after_archive', T0 + 10 * MIN, today);
  assert.deepEqual(interstitialDecision(l, 'after_archive', T0 + 30 * MIN, today), { ok: false, reason: 'daily_cap' });
  // Ertesi gün sayaçlar sıfırlanır.
  assert.deepEqual(interstitialDecision(l, 'after_result', T0 + 24 * 60 * MIN, '2026-11-06'), { ok: true });
});

test('iki reklam arasında en az 3 dakika', () => {
  const today = '2026-11-05';
  const l = recordInterstitial(freshLedger('2026-11-01'), 'after_result', T0, today);
  assert.deepEqual(interstitialDecision(l, 'after_archive', T0 + 2 * MIN, today), { ok: false, reason: 'too_soon' });
  assert.deepEqual(interstitialDecision(l, 'after_archive', T0 + 3 * MIN, today), { ok: true });
});

test('sekme geçişi reklamı ancak 4 geçişten sonra', () => {
  const today = '2026-11-05';
  let l = freshLedger('2026-11-01');
  for (let i = 0; i < 3; i++) l = recordTabSwitch(l, today);
  assert.deepEqual(interstitialDecision(l, 'tab_switch', T0, today), { ok: false, reason: 'not_enough_switches' });
  l = recordTabSwitch(l, today);
  assert.deepEqual(interstitialDecision(l, 'tab_switch', T0, today), { ok: true });
  // Gösterim sayacı sıfırlar.
  l = recordInterstitial(l, 'tab_switch', T0, today);
  assert.equal(l.tabSwitches, 0);
});

test('gün dönünce sayaçlar sıfırlanır, kurulum günü korunur', () => {
  let l = recordTabSwitch(recordInterstitial(freshLedger('2026-11-01'), 'after_result', T0, '2026-11-05'), '2026-11-05');
  l = rollover(l, '2026-11-06');
  assert.equal(l.shown.length, 0);
  assert.equal(l.tabSwitches, 0);
  assert.equal(l.installDay, '2026-11-01');
  assert.equal(l.lastShownAt, T0);
});
