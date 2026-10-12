import { createLapMotion } from './car-motion.js';

export const CIRCUIT = { length: 4927, laps: 62, turns: 19 };

export async function loadArchive() {
  const response = await fetch(`${import.meta.env.BASE_URL}data/singapore-2026.json`);
  if (!response.ok) throw new Error(`Historical archive returned ${response.status}`);
  const archive = await response.json();
  if (archive.year !== 2026 || archive.sessionKey !== 11388 || archive.drivers.length !== archive.driverCount || archive.driverCount !== 22 || !(archive.duration > 0)) throw new Error('Invalid Singapore race archive');
  return archive;
}

function precedingIndex(items, time, getTime = item => item[0]) {
  let low = 0, high = items.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (getTime(items[mid]) <= time) low = mid + 1;
    else high = mid;
  }
  return low - 1;
}

export function telemetryAt(driver, elapsed) {
  const index = precedingIndex(driver.telemetry, elapsed);
  if (index < 0) return null;
  const sample = driver.telemetry[index];
  if (elapsed - sample[0] > 2.5) return null;
  const after = driver.telemetry[index + 1];
  const blend = after && after[0] - sample[0] <= 2.5 && Number.isFinite(sample[1]) && Number.isFinite(after[1])
    ? (elapsed - sample[0]) / (after[0] - sample[0]) : 0;
  const speed = blend ? sample[1] + (after[1] - sample[1]) * blend : sample[1];
  return { at: sample[0], speed, gear: sample[2], throttle: sample[3], brake: sample[4], drs: sample[5] == null ? null : [10, 12, 14].includes(sample[5]) };
}

export function createRace(archive) {
  const drivers = archive.drivers;
  let elapsed = drivers[0].laps.find(lap => lap.number === 18)?.start || 0;
  let playing = !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let rate = 8;
  let selected = drivers[0].code;
  const lapCharts = new Map();
  const motions = new Map(drivers.map(driver => [driver.code, driver.laps.map((lap, index) => {
    const end = driver.laps[index + 1]?.start ?? (lap.duration ? lap.start + lap.duration : driver.retiredAt ?? archive.duration);
    return createLapMotion(driver.telemetry, lap.start, end, CIRCUIT.length, !(driver.result.dnf && !lap.duration));
  })]));

  function carState(driver) {
    const index = Math.max(0, precedingIndex(driver.laps, elapsed, lap => lap.start));
    const lap = driver.laps[index];
    const next = driver.laps[index + 1];
    const end = next?.start ?? (lap.duration ? lap.start + lap.duration : driver.retiredAt ?? archive.duration);
    const motion = motions.get(driver.code)[index];
    const fraction = motion.fractionAt(elapsed);
    const finished = index === driver.laps.length - 1 && elapsed >= end;
    const retired = Boolean(driver.result.dnf && elapsed >= driver.retiredAt);
    const distance = lap.number - 1 + fraction;
    const positionRecord = driver.positions[precedingIndex(driver.positions, elapsed)];
    const gapRecord = driver.intervals[precedingIndex(driver.intervals, elapsed)];
    const stint = driver.stints.find(item => item.start <= lap.number && item.end >= lap.number);
    return {
      ...driver, distance, fraction: finished && !retired ? 0 : fraction, lap: lap.number,
      lapRecord: lap, finished, retired, motionCorrection: motion.correction,
      position: elapsed >= archive.duration ? driver.result.position : positionRecord?.[1] ?? null,
      gap: retired ? 'DNF' : elapsed >= archive.duration ? driver.result.gap_to_leader : gapRecord?.[1] ?? null,
      tyre: stint?.compound?.[0] || '—',
      compound: stint?.compound || 'Unavailable',
    };
  }

  function snapshot() {
    const cars = drivers.map(carState).sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
    const driver = cars.find(car => car.code === selected);
    const lap = driver.lapRecord;
    const key = `${driver.code}:${lap.number}`;
    if (!lapCharts.has(key)) {
      const end = lap.start + (lap.duration || 0);
      const from = Math.max(0, precedingIndex(driver.telemetry, lap.start));
      const to = precedingIndex(driver.telemetry, end) + 1;
      lapCharts.set(key, lap.duration ? driver.telemetry.slice(from, to).filter(sample => sample[0] >= lap.start && sample[1] !== null).map(sample => ({ at: sample[0], fraction: (sample[0] - lap.start) / lap.duration, speed: sample[1], gear: sample[2] })) : []);
    }
    return {
      elapsed, playing, rate, progress: elapsed / archive.duration,
      lap: cars[0].lap, cars, selected: driver,
      telemetry: driver.finished ? null : telemetryAt(driver, elapsed),
      lapSamples: lapCharts.get(key),
      finished: elapsed >= archive.duration,
      events: archive.events.filter(event => event.at <= elapsed).slice(-5).reverse(),
    };
  }

  return {
    archive, drivers, snapshot,
    advance(seconds) {
      if (playing) elapsed = Math.min(archive.duration, elapsed + Math.max(0, seconds) * rate);
      if (elapsed >= archive.duration) playing = false;
      return snapshot();
    },
    toggle() {
      if (elapsed >= archive.duration) elapsed = 0;
      playing = !playing;
      return snapshot();
    },
    setRate(next) { if ([1, 4, 8, 16].includes(next)) rate = next; },
    select(code) { if (drivers.some(driver => driver.code === code)) selected = code; },
    seek(progress) {
      elapsed = Math.max(0, Math.min(1, progress)) * archive.duration;
      if (elapsed >= archive.duration) playing = false;
      return snapshot();
    },
    restart() { elapsed = 0; playing = true; return snapshot(); },
  };
}

export function formatElapsed(seconds) {
  const s = Math.floor(seconds);
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':');
}

export function formatLap(seconds) {
  if (seconds === null || seconds === undefined) return '—';
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(3).padStart(6, '0')}`;
}

export function formatGap(gap, position) {
  if (position === 1) return 'LEADER';
  if (typeof gap === 'number') return `+${gap.toFixed(3)}`;
  return gap === null ? '—' : gap;
}
