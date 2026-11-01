/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { applyKey, displayInput, inputValue } from './keypad';

const type = (keys: string) => [...keys].reduce(applyKey, '');

test('tuş takımı girişi', () => {
  assert.equal(type('1250'), '1250');
  assert.equal(type('45,5'), '45,5');
  assert.equal(type(',5'), '0,5');
  assert.equal(type('1,,2'), '1,2');
  assert.equal(type('1,234'), '1,23');
  assert.equal(type('007'), '7');
  assert.equal(type('12⌫'), '1');
  assert.equal(type('12345678901'), '1234567890');
});

test('giriş görünümü ve değeri', () => {
  assert.equal(displayInput('1250000'), '1.250.000');
  assert.equal(displayInput('1250,5'), '1.250,5');
  assert.equal(inputValue('1250,5'), 1250.5);
  assert.equal(inputValue('45,'), 45);
  assert.equal(inputValue(''), null);
  assert.equal(inputValue('0'), null);
});
