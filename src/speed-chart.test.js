import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRace } from './race.js';
import { speedChartCursor, gearChanges } from './speed-chart.js';

test('cursor sits on the line between recorded speed samples', () => {
  const lap = { start: 100, duration: 20 };
  const samples = [{ at: 104, fraction: .2, speed: 100 }, { at: 106, fraction: .3, speed: 200 }];
  assert.deepEqual(speedChartCursor(samples, 105, lap), { fraction: .25, speed: 150 });
  assert.deepEqual(speedChartCursor(samples, 106, lap), { fraction: .3, speed: 200 });
});

test('cursor does not invent a speed across gaps, lap boundaries, or the finish', () => {
  const lap = { start: 100, duration: 20 };
  const samples = [{ at: 104, fraction: .2, speed: 100 }, { at: 108, fraction: .4, speed: 200 }];
  for (const elapsed of [100, 106, 120]) assert.equal(speedChartCursor(samples, elapsed, lap).speed, null);
  assert.equal(speedChartCursor(samples, 104, lap, true).speed, null);
  assert.deepEqual(speedChartCursor([], 100, { start: 100, duration: null }), { fraction: 0, speed: null });
});

test('historical replay cursor uses the chart time axis and stays on its plotted segment', () => {
  const archive = JSON.parse(readFileSync(new URL('../public/data/singapore-2025.json', import.meta.url)));
  const race = createRace(archive);
  const initial = race.snapshot();
  const samples = initial.lapSamples;
  const before = samples.find((sample, i) => samples[i + 1] && samples[i + 1].at - sample.at <= 2.5);
  const after = samples[samples.indexOf(before) + 1];
  const elapsed = (before.at + after.at) / 2;
  const state = race.seek(elapsed / archive.duration);
  const cursor = speedChartCursor(state.lapSamples, state.elapsed, state.selected.lapRecord);
  assert.ok(Math.abs(cursor.fraction - (before.fraction + after.fraction) / 2) < 1e-10);
  assert.ok(Math.abs(cursor.speed - (before.speed + after.speed) / 2) < 1e-10);
  assert.ok(Math.abs(state.telemetry.speed - cursor.speed) < 1e-9);
});

test('gear markers identify observed changes without inventing intermediate gears', () => {
  const samples = [
    { at: 100, fraction: 0, speed: 240, gear: 7 },
    { at: 101, fraction: .1, speed: 230, gear: 7 },
    { at: 102, fraction: .2, speed: 180, gear: 5 },
    { at: 103, fraction: .3, speed: 150, gear: 4 },
  ];
  assert.deepEqual(gearChanges(samples), [
    { ...samples[2], fromGear: 7 },
    { ...samples[3], fromGear: 5 },
  ]);
});

test('gear markers omit changes across missing samples and unknown gears', () => {
  assert.deepEqual(gearChanges([
    { at: 100, gear: 7 }, { at: 104, gear: 5 },
    { at: 105, gear: null }, { at: 106, gear: 4 },
  ]), []);
  assert.deepEqual(gearChanges([{ at: 100, gear: 1 }, { at: 101, gear: 0 }]), [{ at: 101, gear: 0, fromGear: 1 }]);
});

test('historical gear markers match recorded telemetry timestamps, gears and speeds', () => {
  const archive = JSON.parse(readFileSync(new URL('../public/data/singapore-2025.json', import.meta.url)));
  const state = createRace(archive).snapshot();
  const changes = gearChanges(state.lapSamples);
  assert.ok(changes.length > 0);
  for (const change of changes) {
    const sample = state.selected.telemetry.find(sample => sample[0] === change.at);
    assert.equal(change.speed, sample[1]);
    assert.equal(change.gear, sample[2]);
    assert.notEqual(change.fromGear, change.gear);
    assert.ok(change.fraction >= 0 && change.fraction <= 1);
  }
});
