/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { foldName, searchNames } from './search';

const NAMES = ['Arda Güler', 'Arda Turan', 'Ajda Pekkan', 'Barış Manço', 'Şener Şen', 'Tarkan'];

test('foldName Türkçe harfleri sadeleştirir', () => {
  assert.equal(foldName('Şener ŞEN'), 'sener sen');
  assert.equal(foldName('Barış  Manço'), 'baris manco');
});

test('searchNames: kelime başı eşleşmeleri önce, denenenler hariç', () => {
  assert.deepEqual(searchNames(NAMES, 'ar'), ['Arda Güler', 'Arda Turan', 'Barış Manço', 'Tarkan']);
  assert.deepEqual(searchNames(NAMES, 'gul'), ['Arda Güler']);
  assert.deepEqual(searchNames(NAMES, 'arda', ['Arda Güler']), ['Arda Turan']);
  assert.deepEqual(searchNames(NAMES, 'sen'), ['Şener Şen']);
  assert.deepEqual(searchNames(NAMES, '  '), []);
});
