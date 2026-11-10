import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Story } from '../api/types';
import { BEAT_MAX_CHARS, isValidStory, predictionPrompt, STORY_OPTIONS } from './story';

const beat = (text: string) => ({ text, mood: 'happy' as const });
const story = (n: number, question = 'Yapar mıydın?'): Story => ({ beats: Array.from({ length: n }, (_, i) => beat(`Adım ${i + 1}`)), question });

test('hikâye 3–5 adım ve soru işaretiyle biten soru', () => {
  assert.ok(isValidStory(story(4)));
  assert.ok(!isValidStory(story(2)));
  assert.ok(!isValidStory(story(6)));
  assert.ok(!isValidStory(story(4, 'Yapar mıydın')));
  assert.ok(!isValidStory({ beats: [beat('a'), beat('x'.repeat(BEAT_MAX_CHARS + 1)), beat('c')], question: 'Olur mu?' }));
});

test('iki seçenek ve tahmin sorusu', () => {
  assert.equal(STORY_OPTIONS.length, 2);
  assert.match(predictionPrompt(0), /evet/);
  assert.match(predictionPrompt(1), /hayır/);
});
