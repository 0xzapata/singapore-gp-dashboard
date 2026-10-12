import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLapMotion } from './car-motion.js';
import { createCircuitPath } from './circuit-path.js';
import { CIRCUIT, createRace, telemetryAt } from './race.js';

const archive = JSON.parse(readFileSync(new URL('../public/data/singapore-2025.json', import.meta.url)));
const coordinates = JSON.parse(readFileSync(new URL('../public/data/singapore.geojson', import.meta.url))).features[0].geometry.coordinates;
const { curve } = createCircuitPath(coordinates);

test('cars follow the actual anti-clockwise racing direction from the start line', () => {
  const start = curve.getPointAt(0), after = curve.getPointAt(.01);
  assert.ok(after.z < start.z, 'Cars must travel north up the start/finish straight');
});

test('motion accelerates and brakes with telemetry, with continuous sample boundaries', () => {
  const motion = createLapMotion([[0, 36], [1, 72], [2, 36], [3, 36]], 0, 3, 40);
  assert.equal(motion.correction, 1);
  assert.equal(motion.fractionAt(0), 0);
  assert.equal(motion.fractionAt(1), 15 / 40);
  assert.equal(motion.fractionAt(2), 30 / 40);
  assert.equal(motion.fractionAt(3), 1);
  const speedAt = time => (motion.fractionAt(time + .0001) - motion.fractionAt(time - .0001)) * 40 / .0002;
  assert.ok(Math.abs(speedAt(.5) - 15) < 1e-7);
  assert.ok(Math.abs(speedAt(1) - 20) < .001);
  assert.ok(Math.abs(speedAt(1.5) - 15) < 1e-7);
});

test('only recorded stops stop the car, missing telemetry uses lap timing', () => {
  const stopped = createLapMotion([[0, 36], [1, 0], [2, 0], [3, 36]], 0, 3, 10);
  assert.equal(stopped.fractionAt(1.2), stopped.fractionAt(1.8));
  const missing = createLapMotion([], 10, 20, 100);
  assert.equal(missing.fractionAt(15), .5);
  const gap = createLapMotion([[0, 0], [10, 0]], 0, 10, 100);
  assert.equal(gap.fractionAt(5), .5);
});

test('constant speed crosses real circuit corners without artificial pauses or bursts', () => {
  const step = (60 / 3.6 / 60) / CIRCUIT.length;
  for (let i = 0; i < 20000; i++) {
    const fraction = i / 20000;
    const travelled = curve.getPointAt(fraction).distanceTo(curve.getPointAt((fraction + step) % 1));
    const ratio = travelled / (curve.getLength() * step);
    assert.ok(ratio > .98 && ratio < 1.02, `Artificial speed change at ${fraction}: ${ratio}`);
  }
});

test('at 1x the rendered Russell car follows the speedometer through the entire lap', () => {
  const race = createRace(archive);
  race.setRate(1);
  const initial = race.snapshot(), start = initial.elapsed;
  const lapEnd = initial.selected.laps[18].start;
  let previous = initial;
  for (let time = start + 1 / 60; time < lapEnd; time += 1 / 60) {
    const state = race.advance(1 / 60);
    const distance = (state.selected.distance - previous.selected.distance) * CIRCUIT.length;
    const observed = distance / (1 / 60) * 3.6;
    const expected = telemetryAt(state.selected, (state.elapsed + previous.elapsed) / 2).speed * state.selected.motionCorrection;
    assert.ok(Math.abs(observed - expected) < .5, `${state.elapsed}: ${observed} vs ${expected}`);
    const travelled = curve.getPointAt(previous.selected.fraction).distanceTo(curve.getPointAt(state.selected.fraction));
    const renderedSpeed = travelled / curve.getLength() * CIRCUIT.length * 60 * 3.6;
    assert.ok(Math.abs(renderedSpeed - expected) < 1, `Rendered speed ${renderedSpeed} vs telemetry ${expected}`);
    previous = state;
  }
  assert.ok(Math.abs(initial.selected.motionCorrection - 1) < .02);
});

test('seeking and playback rates produce the same telemetry-based car position', () => {
  const realTime = createRace(archive), accelerated = createRace(archive);
  realTime.setRate(1);accelerated.setRate(8);
  realTime.advance(16);accelerated.advance(2);
  const state = realTime.snapshot();
  assert.equal(state.selected.distance, accelerated.snapshot().selected.distance);
  const sought = realTime.seek(state.elapsed / archive.duration);
  assert.ok(Math.abs(sought.selected.distance - state.selected.distance) < 1e-10);
  realTime.toggle();
  assert.equal(realTime.advance(1).selected.distance, sought.selected.distance);
});
