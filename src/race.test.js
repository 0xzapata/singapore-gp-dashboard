import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRace, telemetryAt, formatGap, formatLap } from './race.js';

const archive = JSON.parse(readFileSync(new URL('../public/data/singapore-2025.json', import.meta.url)));
const russell = archive.drivers.find(driver => driver.code === 'RUS');
const at = (race, seconds) => race.seek(seconds / archive.duration);

test('playback advances at the selected rate and stays still while paused', () => {
  const race = createRace(archive);
  const before = race.snapshot().elapsed;
  race.advance(2);
  assert.equal(race.snapshot().elapsed, before + 16);
  race.toggle();race.advance(20);
  assert.equal(race.snapshot().elapsed, before + 16);
  race.setRate(16);race.toggle();race.advance(2);
  assert.equal(race.snapshot().elapsed, before + 48);
  race.setRate(1);race.advance(2);
  assert.equal(race.snapshot().rate, 1);
  assert.equal(race.snapshot().elapsed, before + 50);
  race.toggle();race.advance(20);
  assert.equal(race.snapshot().elapsed, before + 50);
});

test('seeking updates the full grid and clamps the start and finish', () => {
  const race = createRace(archive);
  race.seek(-1);
  assert.ok(race.snapshot().cars.every(car => car.distance === 0 && car.lap === 1));
  race.seek(.5);
  assert.equal(race.snapshot().elapsed, archive.duration / 2);
  race.seek(2);
  assert.equal(race.snapshot().lap, 62);
  assert.equal(race.snapshot().playing, false);
  assert.equal(race.snapshot().finished, true);
  race.restart();
  assert.equal(race.snapshot().elapsed, 0);
  assert.equal(race.snapshot().playing, true);
});

test('the replay ends with the actual 2025 classification and lapped finishes', () => {
  const state = createRace(archive).seek(1);
  assert.equal(state.cars.length, 20);
  assert.deepEqual(state.cars.slice(0, 10).map(car => car.code), ['RUS', 'VER', 'NOR', 'PIA', 'ANT', 'LEC', 'ALO', 'HAM', 'BEA', 'SAI']);
  assert.equal(state.cars[0].result.duration, 6022.367);
  assert.equal(state.cars[1].gap, 5.43);
  assert.equal(state.cars[2].gap, 6.066);
  assert.equal(state.cars[9].lap, 61);
  assert.equal(state.cars[9].gap, '+1 LAP');
  assert.ok(state.cars.every(car => car.finished));
  assert.equal(state.telemetry, null);
});

test('selection uses the selected driver recorded telemetry and 2025 team', () => {
  const race = createRace(archive);
  const time = race.snapshot().elapsed;
  race.select('HAD');
  const state = race.snapshot();
  assert.equal(state.selected.team, 'Racing Bulls');
  assert.equal(state.elapsed, time);
  assert.deepEqual(state.telemetry, telemetryAt(state.selected, time));
  assert.ok(state.telemetry);
  race.select('INVALID');
  assert.equal(race.snapshot().selected.code, 'HAD');
});

test('lap 18 shows the recorded sectors and speed samples', () => {
  const state = createRace(archive).snapshot();
  assert.equal(state.selected.code, 'RUS');
  assert.equal(state.selected.lap, 18);
  assert.equal(state.selected.lapRecord.duration, 97.039);
  assert.deepEqual(state.selected.lapRecord.sectors, [28.773, 41.001, 27.265]);
  const sample = russell.telemetry.find(item => item[0] >= state.elapsed);
  const observed = at(createRace(archive), sample[0]);
  assert.ok(Math.abs(observed.telemetry.speed - sample[1]) < 1e-9);
  assert.equal(observed.telemetry.gear, sample[2]);
  assert.equal(observed.telemetry.throttle, sample[3]);
  assert.equal(observed.telemetry.brake, sample[4]);
  assert.ok(observed.lapSamples.some(item => item.at === sample[0] && item.speed === sample[1]));
});

test('tyre changes follow recorded stints rather than a fixed driver tyre', () => {
  const race = createRace(archive);
  const lap26 = russell.laps.find(lap => lap.number === 26);
  assert.equal(at(race, lap26.start - 1).selected.compound, 'MEDIUM');
  assert.equal(at(race, lap26.start + 1).selected.compound, 'HARD');
  race.select('HAM');
  const lap47 = archive.drivers.find(driver => driver.code === 'HAM').laps.find(lap => lap.number === 47);
  assert.equal(at(race, lap47.start + 1).selected.compound, 'SOFT');
});

test('standings change at recorded position updates', () => {
  const race = createRace(archive);
  const record = russell.positions.find(item => item[0] > 0 && item[1] === 3);
  assert.equal(at(race, record[0] - .1).selected.position, 2);
  assert.equal(at(race, record[0] + .1).selected.position, 3);
});

test('seeking restores source race-control events without fabricated log entries', () => {
  const race = createRace(archive);
  const first = at(race, 3000).events;
  race.seek(.9);
  const restored = at(race, 3000).events;
  assert.deepEqual(restored, first);
  assert.deepEqual(restored, archive.events.filter(event => event.at <= 3000).slice(-5).reverse());
});

test('missing and stale telemetry is unavailable and recorded values stay intact', () => {
  const driver = { telemetry: [[10, 0, 0, 104, 100, 14]] };
  assert.equal(telemetryAt(driver, 9), null);
  assert.equal(telemetryAt(driver, 13), null);
  assert.deepEqual(telemetryAt(driver, 10), { at: 10, speed: 0, gear: 0, throttle: 104, brake: 100, drs: true });
  assert.equal(formatLap(null), '—');
  assert.equal(formatGap(null, 2), '—');
  assert.equal(formatGap('+1 LAP', 10), '+1 LAP');
  assert.equal(formatGap(5.43, 2), '+5.430');
});
