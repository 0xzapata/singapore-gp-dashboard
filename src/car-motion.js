const MAX_SAMPLE_GAP = 2.5;

function precedingIndex(samples, time) {
  let low = 0, high = samples.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (samples[middle][0] <= time) low = middle + 1;
    else high = middle;
  }
  return low - 1;
}

export function createLapMotion(telemetry, start, end, circuitLength, complete = true) {
  const duration = end - start;
  if (!(duration > 0)) return { fractionAt: () => 0, correction: 1 };
  const fallbackSpeed = complete ? circuitLength / duration : 0;
  const segments = [];
  let time = start, distance = 0;
  let index = precedingIndex(telemetry, start);
  while (time < end) {
    const before = telemetry[index], after = telemetry[index + 1];
    const until = Math.min(end, after?.[0] ?? end);
    const valid = before && after && after[0] - before[0] <= MAX_SAMPLE_GAP
      && Number.isFinite(before[1]) && Number.isFinite(after[1]);
    let speed = fallbackSpeed, acceleration = 0;
    if (valid) {
      acceleration = (after[1] - before[1]) / (after[0] - before[0]) / 3.6;
      speed = before[1] / 3.6 + acceleration * (time - before[0]);
    } else if (!before && after && after[0] - start <= MAX_SAMPLE_GAP && Number.isFinite(after[1])) {
      speed = after[1] / 3.6;
    } else if (!after && before && end - before[0] <= MAX_SAMPLE_GAP && Number.isFinite(before[1])) {
      speed = before[1] / 3.6;
    }
    const seconds = until - time;
    segments.push({ start: time, end: until, distance, speed, acceleration });
    distance += speed * seconds + acceleration * seconds * seconds / 2;
    time = until;
    index++;
  }
  if (!(distance > 0)) return { fractionAt: time => complete ? Math.max(0, Math.min(1, (time - start) / duration)) : 0, correction: 1 };
  const total = complete ? distance : circuitLength;
  return {
    correction: complete ? circuitLength / distance : 1,
    fractionAt(time) {
      if (time <= start) return 0;
      if (time >= end) return Math.min(1, distance / total);
      let low = 0, high = segments.length;
      while (low < high) {
        const middle = (low + high) >> 1;
        if (segments[middle].start <= time) low = middle + 1;
        else high = middle;
      }
      const segment = segments[low - 1], seconds = time - segment.start;
      return Math.min(1, (segment.distance + segment.speed * seconds + segment.acceleration * seconds * seconds / 2) / total);
    },
  };
}
