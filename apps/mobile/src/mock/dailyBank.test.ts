/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isValidStory, STORY_OPTIONS } from '../lib/story';
import { MODE_BANK } from './dailyBank';
import { MEDIA_CREDITS } from './mediaCredits';
import { COMPARE_ROUNDS } from './rules';

/** "~1.100 $" → { n: 1100, unit: "$" }; "~0,40 €" → { n: 0.4, unit: "€" }. */
function parse(v: string): { n: number; unit: string } {
  const m = v
    .replace('~', '')
    .trim()
    .match(/^([\d.,]+)\s*(.*)$/);
  assert.ok(m, `değer okunamadı: ${v}`);
  return { n: Number(m[1].replace(/\./g, '').replace(',', '.')), unit: m[2] };
}

test('"Hangisi pahalı?" turlarında doğru taraf gerçekten daha pahalı', () => {
  for (const q of MODE_BANK.pahali) {
    assert.equal(q.rounds?.length, COMPARE_ROUNDS, q.prompt);
    for (const r of q.rounds ?? []) {
      const a = parse(r.valueA);
      const b = parse(r.valueB);
      assert.equal(a.unit, b.unit, `${r.a} / ${r.b}: birimler farklı`);
      const pricier = a.n > b.n ? 0 : 1;
      assert.equal(r.correct, pricier, `${r.a} (${r.valueA}) mı, ${r.b} (${r.valueB}) mı?`);
    }
  }
});

test('"Yapar mıydın?" soruları geçerli hikâye, iki seçenek ve oy ağırlığı taşır', () => {
  for (const q of MODE_BANK.yapar) {
    assert.equal(q.format, 'poll');
    assert.ok(q.story && isValidStory(q.story), q.prompt);
    assert.equal(q.prompt, q.story!.question);
    assert.deepEqual(q.options, [...STORY_OPTIONS]);
    assert.equal(q.pollWeights?.reduce((x, y) => x + y, 0), 100);
  }
});

test('"Kaç?" soruları sayısal ve cevaplı', () => {
  assert.ok(MODE_BANK.kac.length >= 7);
  for (const q of MODE_BANK.kac) {
    assert.ok(q.format === 'price' || q.format === 'number', q.prompt);
    assert.ok((q.answer ?? 0) > 0, q.prompt);
  }
});

test('soru görselleri tanımlı ve yalnız CC0 / kamu malı', () => {
  const keys = Object.keys(MEDIA_CREDITS);
  const used = Object.values(MODE_BANK)
    .flat()
    .flatMap((q) => [q.media, ...(q.rounds ?? []).flatMap((r) => [r.mediaA, r.mediaB])])
    .filter((k): k is NonNullable<typeof k> => !!k);
  assert.ok(used.length > 0);
  for (const k of used) assert.ok(keys.includes(k), `tanımsız görsel: ${k}`);
  for (const credit of Object.values(MEDIA_CREDITS)) assert.match(credit, /CC0|Kamu malı/);
  // "Hangisi pahalı?" turunda görsel ya iki tarafta da var ya hiç yok.
  for (const r of MODE_BANK.pahali.flatMap((q) => q.rounds ?? [])) assert.equal(!!r.mediaA, !!r.mediaB, r.a);
});

test('"Hangisi pahalı?" her turda iki görsel taşır ve turlar zincirlidir (sağdaki sonraki turun solu)', () => {
  for (const q of MODE_BANK.pahali) {
    const rounds = q.rounds ?? [];
    for (const [i, r] of rounds.entries()) {
      assert.ok(r.mediaA && r.mediaB, `${r.a} / ${r.b}: iki görsel de olmalı`);
      const next = rounds[i + 1];
      if (next) {
        assert.equal(next.a, r.b, `zincir kopuk: ${r.b} → ${next.a}`);
        assert.equal(next.mediaA, r.mediaB);
        assert.equal(next.valueA, r.valueB);
      }
    }
  }
});
