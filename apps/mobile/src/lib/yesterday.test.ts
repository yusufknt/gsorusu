/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ArchiveItem, Crowd } from '../api/types';
import { yesterdaySummary } from './yesterday';

const item = (patch: Partial<ArchiveItem>): ArchiveItem => ({
  day: '2026-11-01',
  no: 32,
  format: 'price',
  prompt: 'Soru',
  cancelled: false,
  started: true,
  finished: true,
  score: 85,
  playedFromArchive: false,
  ...patch,
});

const crowd = (avgScore: number | null, solvedPct: number | null = 62): Crowd => ({
  questionId: 1,
  plays: avgScore == null ? 0 : 4000,
  avgScore,
  histogram: [],
  solvedPct,
  underPct: null,
  overPct: null,
  optionPcts: null,
  final: true,
  updatedAt: null,
});

test('dün oynandıysa puan ve ortalamayla karşılaştırma', () => {
  const s = yesterdaySummary(item({}), crowd(64.4));
  assert.equal(s?.title, 'Dün #32: 85 puan');
  assert.equal(s?.subtitle, 'Türkiye ortalaması 64,4 · 21 puan öndesin 👏');
  assert.equal(s?.tone, 'good');

  const low = yesterdaySummary(item({ score: 40 }), crowd(64.4, null));
  assert.equal(low?.subtitle, 'Türkiye ortalaması 64,4 · 24 puan geridesin');
  assert.equal(low?.tone, 'neutral');
});

test('anket: "sonuçlandı" başlığı', () => {
  const s = yesterdaySummary(item({ format: 'poll', score: 70 }), crowd(70));
  assert.equal(s?.title, 'Dünkü anket sonuçlandı: 70 puan');
  assert.equal(s?.subtitle, 'Türkiye ortalaması 70 · tam ortalamadasın');
});

test('kaçırılan ve yarım kalan gün arşive çağırır', () => {
  const missed = yesterdaySummary(item({ started: false, finished: false, score: null }), crowd(55));
  assert.equal(missed?.title, 'Dün #32: kaçırdın');
  assert.equal(missed?.tone, 'call');
  assert.equal(missed?.actionLabel, 'Oyna');

  const half = yesterdaySummary(item({ finished: false, score: null }), null);
  assert.equal(half?.title, 'Dün #32: yarım kaldı');
  assert.equal(half?.actionLabel, 'Devam et');
});

test('iptal edilen gün ya da dünün sorusu yoksa şerit çıkmaz', () => {
  assert.equal(yesterdaySummary(item({ cancelled: true }), null), null);
  assert.equal(yesterdaySummary(undefined, null), null);
});

test('dağılım henüz yoksa ortalama yazılmaz', () => {
  assert.equal(yesterdaySummary(item({}), crowd(null))?.subtitle, 'Sonuçlara ve doğru cevaba bak.');
});
