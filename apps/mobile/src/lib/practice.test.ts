import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MODE_BANK } from '../mock/dailyBank';
import { mulberry32 } from '../mock/rules';
import { practiceChain, practicePool, PRACTICE, type SourceRound } from './practice';

const ROUNDS = MODE_BANK.pahali.flatMap((q) => q.rounds ?? []);

test('havuz her şeyi bir kez alır ve fiyatını okur', () => {
  const pool = practicePool(ROUNDS);
  const labels = pool.map((x) => x.label);
  assert.equal(new Set(labels).size, labels.length);
  const coffee = pool.find((x) => x.label === '1 kg Türk kahvesi');
  assert.deepEqual(coffee && { n: coffee.n, unit: coffee.unit }, { n: 900, unit: 'TL' });
});

test('görseli ya da okunur fiyatı olmayan şey havuza girmez', () => {
  const rounds: SourceRound<string>[] = [{ a: 'A', b: 'B', valueA: 'bilinmiyor', valueB: '~10 TL', mediaB: 'b' }, { a: 'C', b: 'D', valueA: '~5 TL', valueB: '~7 TL', mediaA: 'c' }];
  assert.deepEqual(
    practicePool(rounds).map((x) => x.label),
    ['B', 'C'],
  );
});

test('zincir: tek birim, sağdaki sonraki turda sola geçer, doğru taraf fiyata göre', () => {
  const pool = practicePool(ROUNDS);
  for (let seed = 1; seed <= 50; seed++) {
    const chain = practiceChain(pool, mulberry32(seed));
    assert.equal(chain.length, PRACTICE.rounds);
    assert.equal(new Set(chain.flatMap((r) => [r.a.unit, r.b.unit])).size, 1, `seed ${seed}`);
    chain.forEach((r, i) => {
      assert.notEqual(r.a.n, r.b.n);
      assert.equal(r.correct, r.b.n > r.a.n ? 1 : 0);
      if (i > 0) assert.equal(r.a.label, chain[i - 1].b.label);
    });
  }
});

test('aynı tohum aynı seti verir', () => {
  const pool = practicePool(ROUNDS);
  const labels = (seed: number) => practiceChain(pool, mulberry32(seed)).map((r) => r.b.label);
  assert.deepEqual(labels(7), labels(7));
  assert.notDeepEqual(labels(7), labels(8));
});

test('küçük havuzda da tur sayısı tamamlanır', () => {
  const pool = practicePool<string>([{ a: 'A', b: 'B', valueA: '~1 TL', valueB: '~2 TL', mediaA: 'a', mediaB: 'b' }]);
  const chain = practiceChain(pool, mulberry32(3), 6);
  assert.equal(chain.length, 6);
  assert.ok(chain.every((r) => r.a.n !== r.b.n));
});
