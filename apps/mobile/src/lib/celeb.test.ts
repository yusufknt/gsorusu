/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { publicProfiles } from '../mock/celebs';
import { CELEB, CELEB_ATTRS, celebScore, compareCeleb, decadeLabel, findIn, initial, namePattern, possibleCelebs } from './celeb';

const people = publicProfiles();
const get = (name: string) => {
  const c = findIn(people, name);
  assert.ok(c, `listede yok: ${name}`);
  return c;
};
const cellOf = (g: ReturnType<typeof compareCeleb>, attr: string) => g.cells.find((c) => c.attr === attr)!;

test('aynı ünlü: 8 kutunun hepsi yeşil, ok yok', () => {
  const g = compareCeleb(get('Tarkan'), get('Tarkan'));
  assert.equal(g.correct, true);
  assert.deepEqual(
    g.cells.map((c) => c.attr),
    [...CELEB_ATTRS],
  );
  assert.ok(g.cells.every((c) => c.status === 'correct' && c.arrow === null));
});

test('tür: aynı tür yeşil, aynı alanda farklı tür turuncu, farklı alan kırmızı', () => {
  assert.equal(cellOf(compareCeleb(get('Sezen Aksu'), get('Tarkan')), 'tur').status, 'correct');
  assert.equal(cellOf(compareCeleb(get('Teoman'), get('Tarkan')), 'tur').status, 'partial');
  assert.equal(cellOf(compareCeleb(get('Arda Güler'), get('Tarkan')), 'tur').status, 'wrong');
});

test('yakınlık ve oklar: ±5 yıl turuncu, aynı bölge turuncu, doğru yön', () => {
  const g = compareCeleb(get('Sezen Aksu'), get('Haluk Bilginer'));
  assert.equal(cellOf(g, 'dogumYili').status, 'correct');
  assert.equal(cellOf(g, 'dogumYeri').status, 'partial');
  assert.equal(cellOf(g, 'donem').arrow, 'up');
  const h = compareCeleb(get('Tarkan'), get('Arda Güler'));
  assert.equal(cellOf(h, 'dogumYili').arrow, 'up');
  assert.equal(cellOf(h, 'basHarf').arrow, 'down');
});

test('olası ünlüler: cevap her zaman içinde kalır ve tahminle daralır', () => {
  const answer = get('Sueda Uluca');
  const guesses = ['Tarkan', 'Aleyna Tilki', 'Zeynep Bastık'].map((n) => compareCeleb(get(n), answer));
  let before = people.length;
  for (let i = 1; i <= guesses.length; i++) {
    const left = possibleCelebs(people, guesses.slice(0, i));
    assert.ok(left.some((c) => c.name === answer.name), 'cevap elenmemeli');
    // Önceden elenmiş biri tahmin edilirse yeni bilgi gelmeyebilir; liste hiç büyümez.
    assert.ok(left.length <= before, 'liste büyümemeli');
    before = left.length;
  }
  assert.ok(before < people.length / 4, `3 tahminde aday sayısı belirgin azalmalı (${before})`);
  assert.deepEqual(
    possibleCelebs(people, [compareCeleb(answer, answer)]).map((c) => c.name),
    [answer.name],
  );
});

test('ipucu kalıbı, etiketler ve puan', () => {
  assert.equal(namePattern('Sezen Aksu'), 'S•••• A•••');
  assert.equal(decadeLabel(2010), '2010’lar');
  assert.equal(decadeLabel(1970), '1970’ler');
  assert.equal(initial('Âşık Veysel'), 'A');
  assert.equal(celebScore(1, true), 100);
  assert.equal(celebScore(CELEB.maxGuesses, true), 10);
  assert.equal(celebScore(CELEB.maxGuesses, false), 0);
});
