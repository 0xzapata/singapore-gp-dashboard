export function speedChartCursor(samples, elapsed, lap, finished = false) {
  const fraction = lap.duration > 0 ? Math.max(0, Math.min(1, (elapsed - lap.start) / lap.duration)) : 0;
  if (finished || !lap.duration) return { fraction, speed: null };
  let low = 0, high = samples.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (samples[mid].at <= elapsed) low = mid + 1;
    else high = mid;
  }
  const before = samples[low - 1], after = samples[low];
  if (before?.at === elapsed) return { fraction, speed: before.speed };
  if (!before || !after || after.at - before.at > 2.5) return { fraction, speed: null };
  const blend = (elapsed - before.at) / (after.at - before.at);
  return { fraction, speed: before.speed + (after.speed - before.speed) * blend };
}

export function gearChanges(samples) {
  const changes = [];
  const knownGear = sample => Number.isInteger(sample.gear) && sample.gear >= 0 && sample.gear <= 8;
  for (let i = 1; i < samples.length; i++) {
    const before = samples[i - 1], after = samples[i];
    if (knownGear(before) && knownGear(after) && before.gear !== after.gear && after.at - before.at <= 2.5) {
      changes.push({ ...after, fromGear: before.gear });
    }
  }
  return changes;
}
