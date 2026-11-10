/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FIELD_LABEL } from '../lib/celeb';
import { CELEBS, findCeleb, publicProfiles } from './celebs';
import { MODE_BANK } from './dailyBank';

test('ünlü listesi tutarlı: tekil adlar, geçerli tarih, alan ve tür dolu', () => {
  assert.ok(CELEBS.length >= 120, `en az 120 ünlü olmalı (${CELEBS.length})`);
  assert.equal(new Set(CELEBS.map((c) => c.name)).size, CELEBS.length);
  for (const c of CELEBS) {
    assert.match(c.birth, /^\d{4}-\d{2}-\d{2}$/, c.name);
    assert.ok(c.fields.length > 0 && c.fields.every((f) => f in FIELD_LABEL), c.name);
    assert.ok(c.genre.length > 1, c.name);
    assert.ok(c.decade % 10 === 0 && c.decade >= Number(c.birth.slice(0, 4)), `${c.name}: ünlendiği on yıl doğumdan önce olamaz`);
    assert.ok(c.fact.length > 10, c.name);
  }
});

test('istenen güncel adlar listede', () => {
  for (const name of ['Sueda Uluca', 'Aleyna Tilki', 'Alperen Şengün', 'Enes Batur', 'Çağatay Ulusoy']) assert.ok(findCeleb(name), name);
});

test('istemciye giden bilgilerde ipucu cümlesi yok', () => {
  assert.ok(publicProfiles().every((p) => !('fact' in p)));
});

test('"Hangi ünlü?" günlük stoğu her ünlüyü bir kez içerir', () => {
  const names = MODE_BANK.unlu.map((q) => q.celeb);
  assert.equal(names.length, CELEBS.length);
  assert.deepEqual([...names].sort(), CELEBS.map((c) => c.name).sort());
});
