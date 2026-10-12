import * as THREE from 'three';

export function createTrackScanField(routeSamples, bounds) {
  const size = 512;
  const segments = [];
  for (let i = 0; i < routeSamples.length - 1; i += 4) {
    const a = routeSamples[i], b = routeSamples[Math.min(i + 4, routeSamples.length - 1)];
    const dx = b.x - a.x, dz = b.z - a.z;
    const lengthSquared = dx * dx + dz * dz;
    if (lengthSquared > 0) segments.push({ x: a.x, z: a.z, dx, dz, inverseLength: 1 / lengthSquared });
  }
  const width = bounds.max.x - bounds.min.x, depth = bounds.max.z - bounds.min.z;
  const distances = new Float32Array(size * size);
  let maxDistance = 0;
  // Bake distance to the whole circuit once. Equal-distance contours expand its shape.
  for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) {
    const x = bounds.min.x + (column + .5) / size * width;
    const z = bounds.min.z + (row + .5) / size * depth;
    let nearestSquared = Infinity;
    for (const segment of segments) {
      const px = x - segment.x, pz = z - segment.z;
      const t = Math.max(0, Math.min(1, (px * segment.dx + pz * segment.dz) * segment.inverseLength));
      const dx = px - t * segment.dx, dz = pz - t * segment.dz;
      nearestSquared = Math.min(nearestSquared, dx * dx + dz * dz);
    }
    const distance = Math.sqrt(nearestSquared);
    distances[row * size + column] = distance;
    maxDistance = Math.max(maxDistance, distance);
  }
  const pixels = Uint8Array.from(distances, distance => Math.round(distance / maxDistance * 255));
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RedFormat);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return {
    uCityTrackDistance: { value: texture },
    uCityTrackBounds: { value: new THREE.Vector4(bounds.min.x, bounds.min.z, width, depth) },
    uCityScanExtent: { value: maxDistance },
  };
}
