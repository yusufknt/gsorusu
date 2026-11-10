/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addDays, formatCountdown, formatDay, pctFrom, formatTrNumber, nextResetMs, parseTrNumber, pct, pctOf, possessiveSuffix, trUpper } from './format';

test('Türkçe sayı girişi', () => {
  assert.equal(parseTrNumber('45'), 45);
  assert.equal(parseTrNumber('45,5'), 45.5);
  assert.equal(parseTrNumber('45.5'), 45.5);
  assert.equal(parseTrNumber('1.250'), 1250);
  assert.equal(parseTrNumber('1.250.000'), 1250000);
  assert.equal(parseTrNumber('1.250,75'), 1250.75);
  assert.equal(parseTrNumber(' 1 250 '), 1250);
  assert.equal(parseTrNumber(''), null);
  assert.equal(parseTrNumber('abc'), null);
  assert.equal(parseTrNumber('1,2,3'), null);
  assert.equal(parseTrNumber('12.50,5'), null);
  assert.equal(parseTrNumber('-5'), null);
});

test('Türkçe sayı biçimi', () => {
  assert.equal(formatTrNumber(1250), '1.250');
  assert.equal(formatTrNumber(1250.5), '1.250,5');
  assert.equal(formatTrNumber(45.25), '45,25');
  assert.equal(formatTrNumber(1000000), '1.000.000');
  assert.equal(formatTrNumber(0.5), '0,5');
  assert.equal(pct(66.7), '%66,7');
});

test('yüzdeye doğru iyelik eki', () => {
  const cases: [number, string][] = [
    [62, "%62'si"],
    [40, "%40'ı"],
    [30, "%30'u"],
    [100, "%100'ü"],
    [6, "%6'sı"],
    [3, "%3'ü"],
    [1, "%1'i"],
    [9, "%9'u"],
    [50, "%50'si"],
    [0, "%0'ı"],
    [66.7, "%66,7'si"],
    [12.5, "%12,5'i"],
    [70, "%70'i"],
    [90, "%90'ı"],
  ];
  for (const [n, expected] of cases) assert.equal(pctOf(n), expected, String(n));
  assert.equal(possessiveSuffix('1000'), 'i');
});

test('gün yardımcıları', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(formatDay('2026-12-10'), '10 Aralık Perşembe');
  // 11 Aralık 00:00 İstanbul = 10 Aralık 21:00 UTC
  assert.equal(new Date(nextResetMs('2026-12-10')).toISOString(), '2026-12-10T21:00:00.000Z');
});

test('geri sayım', () => {
  assert.equal(formatCountdown(0), '00:00:00');
  assert.equal(formatCountdown(-5), '00:00:00');
  assert.equal(formatCountdown((8 * 3600 + 41 * 60 + 12) * 1000 + 999), '08:41:12');
});

test('Türkçe büyük harf', () => {
  assert.equal(trUpper('senin cevabın'), 'SENİN CEVABIN');
  assert.equal(trUpper('ığdır iğne'), 'IĞDIR İĞNE');
});


test('yüzdenin çıkma hâli', () => {
  assert.equal(pctFrom(72), "%72'sinden");
  assert.equal(pctFrom(60), "%60'ından");
  assert.equal(pctFrom(3), "%3'ünden");
  assert.equal(pctFrom(10), "%10'undan");
  assert.equal(pctFrom(50), "%50'sinden");
});
