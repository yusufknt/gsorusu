/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { completesPuzzle, PUZZLE_SIZE, puzzlePieces } from '../mock/rules';
import { piecePath, PIECE_ORDER, PUZZLE_COLS, PUZZLE_ROWS } from './puzzle';
import { artFor, PUZZLE_ART } from './puzzleArt';

test('yapboz 15 parça (3 × 5) ve her parça bir kez kazanılır', () => {
  assert.equal(PUZZLE_SIZE, 15);
  assert.equal(PIECE_ORDER.length, PUZZLE_COLS * PUZZLE_ROWS);
  assert.equal(new Set(PIECE_ORDER.map((p) => `${p.r}-${p.c}`)).size, PUZZLE_SIZE);
});

test('parçalar alttan açılır; resmin üst satırı en sona kalır', () => {
  assert.equal(PIECE_ORDER[0].r, PUZZLE_ROWS - 1);
  assert.equal(PIECE_ORDER[PIECE_ORDER.length - 1].r, 0);
});

test('seriden parça sayısı: 15’in katında yapboz dolu, ertesi gün yenisi başlar', () => {
  assert.equal(puzzlePieces(0), 0);
  assert.equal(puzzlePieces(1), 1);
  assert.equal(puzzlePieces(14), 14);
  assert.equal(puzzlePieces(15), 15);
  assert.equal(puzzlePieces(16), 1);
  assert.equal(puzzlePieces(30), 15);
  assert.ok(completesPuzzle(15) && completesPuzzle(30));
  assert.ok(!completesPuzzle(0) && !completesPuzzle(14) && !completesPuzzle(16));
});

test('kenar parçalar düz, komşu iki parça aynı dili/yuvayı paylaşır', () => {
  const left = piecePath(0, 0);
  const right = piecePath(0, 1);
  assert.match(left, /^M0 0 /);
  assert.match(left, / Z$/);
  const points = (d: string) => new Set(d.match(/-?[\d.]+ -?[\d.]+/g));
  const a = points(left);
  const shared = [...points(right)].filter((p) => a.has(p));
  // Ortak noktalar köşelerden fazladır: dikey iç kenarın eğrisi iki parçada da aynı.
  assert.ok(shared.length > 2, `ortak nokta: ${shared.length}`);
});

test('her yapbozun ayrı resmi var, sıra sabit ve başa döner', () => {
  assert.equal(new Set(PUZZLE_ART.map((a) => a.id)).size, PUZZLE_ART.length);
  assert.equal(artFor(0).id, 'istanbul');
  assert.equal(artFor(1).id, PUZZLE_ART[1].id);
  assert.equal(artFor(PUZZLE_ART.length).id, 'istanbul');
  assert.ok(PUZZLE_ART.every((a) => a.credit.length > 0));
});
