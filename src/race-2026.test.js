import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRace, telemetryAt } from './race.js';
import { createLapMotion } from './car-motion.js';
import { DRIVER_BIOGRAPHIES, driverAgeAt } from './driver-biographies.js';

const archive = JSON.parse(readFileSync(new URL('../public/data/singapore-2026.json', import.meta.url)));

test('2026 replay matches the published classification for all 22 drivers', () => {
  const state = createRace(archive).seek(1);
  assert.equal(archive.sessionKey, 11388);
  assert.equal(archive.date, '2026-10-11');
  assert.equal(state.cars.length, 22);
  assert.deepEqual(state.cars.map(car => car.code), ['VER', 'LEC', 'ANT', 'NOR', 'PIA', 'HAM', 'LAW', 'HUL', 'RUS', 'HAD', 'GAS', 'BEA', 'OCO', 'SAI', 'LIN', 'ALO', 'PER', 'ALB', 'BOT', 'STR', 'COL', 'BOR']);
  assert.equal(state.cars[0].result.duration, 6120.785);
  assert.equal(state.cars[1].gap, 7.335);
  assert.equal(state.cars[2].gap, 24.573);
  assert.equal(state.cars[10].gap, '+1 LAP');
  assert.equal(state.cars[16].gap, '+2 LAPS');
  assert.equal(state.cars[17].gap, 'DNF');
  assert.equal(state.cars[18].gap, '+3 LAPS');
});

test('new 2026 drivers and teams have recorded telemetry and complete profiles', () => {
  const race = createRace(archive);
  for (const [code, team, age] of [['LIN', 'Racing Bulls', 19], ['PER', 'Cadillac', 36], ['BOT', 'Cadillac', 37], ['HUL', 'Audi', 39]]) {
    race.select(code);
    const state = race.snapshot();
    assert.equal(state.selected.team, team);
    assert.ok(state.telemetry);
    assert.equal(driverAgeAt(DRIVER_BIOGRAPHIES[code].born, archive.date), age);
    assert.ok(DRIVER_BIOGRAPHIES[code].description.length > 30);
  }
});

test('retirements stop at recorded moving telemetry and restore when seeking backward', () => {
  const race = createRace(archive);
  for (const driver of archive.drivers.filter(driver => driver.result.dnf)) {
    race.select(driver.code);
    const seek = time => race.seek(time / archive.duration);
    const before = seek(driver.retiredAt - 1);
    assert.equal(before.selected.retired, false);
    assert.ok(before.telemetry);
    const stopped = seek(driver.retiredAt + 1);
    assert.equal(stopped.selected.retired, true);
    assert.equal(stopped.selected.gap, 'DNF');
    assert.equal(stopped.telemetry, null);
    const later = seek(driver.retiredAt + 60);
    assert.equal(later.selected.distance, stopped.selected.distance);
    assert.equal(later.selected.fraction, stopped.selected.fraction);
    assert.equal(seek(driver.retiredAt - 1).selected.retired, false);
  }
});

test('an incomplete retirement lap keeps the actual integrated distance', () => {
  const motion = createLapMotion([[0, 36], [1, 36], [2, 0]], 0, 2, 100, false);
  assert.equal(motion.correction, 1);
  assert.equal(motion.fractionAt(1), .1);
  assert.equal(motion.fractionAt(2), .15);
  assert.equal(motion.fractionAt(100), .15);
});

test('missing 2026 DRS records remain unavailable rather than implying a closed wing', () => {
  const driver = archive.drivers[0];
  const sample = driver.telemetry.find(sample => sample[1] > 100 && sample[5] === null);
  assert.equal(telemetryAt(driver, sample[0]).drs, null);
});

test('2026 replay runs at 1x and seeking reproduces its telemetry-based position', () => {
  const race = createRace(archive);
  race.setRate(1);
  const before = race.snapshot();
  const after = race.advance(10);
  assert.equal(after.elapsed - before.elapsed, 10);
  const sought = race.seek(after.elapsed / archive.duration);
  assert.ok(Math.abs(sought.selected.distance - after.selected.distance) < 1e-10);
  assert.deepEqual(sought.telemetry, after.telemetry);
});
