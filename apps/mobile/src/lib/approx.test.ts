/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatApprox, parseApprox } from './approx';

test('yaklaşık değer okunur ve aynı biçimde yazılır', () => {
  const a = parseApprox('~1.100 TL')!;
  assert.deepEqual(a, { prefix: '~', n: 1100, decimals: 0, unit: 'TL' });
  assert.equal(formatApprox(a), '~1.100 TL');
  assert.equal(formatApprox(a, 0.5), '~550 TL');
  assert.equal(formatApprox(parseApprox('~0,40 €')!), '~0,40 €');
  assert.equal(formatApprox(parseApprox('~20.000 TL')!, 0), '~0 TL');
  assert.equal(parseApprox('çok pahalı'), null);
});
