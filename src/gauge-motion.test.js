import test from 'node:test';
import assert from 'node:assert/strict';
import { createGaugeMotion } from './gauge-motion.js';

test('readings ease between samples and settle without overshooting', () => {
  const motion = createGaugeMotion();
  assert.equal(motion.step(0, 0), 0);
  let previous = 0;
  for (let i = 0; i < 60; i++) {
    const value = motion.step(100, 1 / 60);
    assert.ok(value >= previous && value <= 100);
    if (i === 0) assert.ok(value > 0 && value < 100);
    previous = value;
  }
  assert.equal(previous, 100);
  const down = motion.step(0, 1 / 60);
  assert.ok(down > 0 && down < 100);
});

test('retargeting continues from the current reading without a jump', () => {
  const motion = createGaugeMotion();
  motion.step(200, 0);
  const before = motion.step(300, .05);
  assert.equal(motion.step(100, 0), before);
  const after = motion.step(100, 1 / 60);
  assert.ok(after < before && after > 100);
});

test('gauge easing takes the same time at different frame rates', () => {
  const slow = createGaugeMotion(), fast = createGaugeMotion();
  slow.step(0, 0);fast.step(0, 0);
  let a, b;
  for (let i = 0; i < 15; i++) a = slow.step(100, 1 / 30);
  for (let i = 0; i < 30; i++) b = fast.step(100, 1 / 60);
  assert.ok(Math.abs(a - b) < 1e-10);
});

test('missing samples clear immediately and reduced motion shows the target directly', () => {
  const motion = createGaugeMotion();
  motion.step(200, 0);
  assert.equal(motion.step(null, .1), null);
  assert.equal(motion.step(50, 0), 50);
  assert.equal(motion.step(100, 1 / 60, true), 100);
});
