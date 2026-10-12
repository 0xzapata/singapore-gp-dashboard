import * as THREE from 'three';

const METRE_SCALE = 3000 / 111320;
const DEFAULT_WIDTHS = { motorway: 12, trunk: 11, primary: 10, secondary: 9, tertiary: 8, residential: 6, unclassified: 6, living_street: 5, service: 4 };

export function createSegmentIndex(lines, cellSize = 2) {
  const cells = new Map();
  for (const { points, halfWidth = 0 } of lines) for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const segment = { a, b, halfWidth };
    const minX = Math.floor((Math.min(a.x, b.x) - halfWidth) / cellSize), maxX = Math.floor((Math.max(a.x, b.x) + halfWidth) / cellSize);
    const minZ = Math.floor((Math.min(a.z, b.z) - halfWidth) / cellSize), maxZ = Math.floor((Math.max(a.z, b.z) + halfWidth) / cellSize);
    for (let x = minX; x <= maxX; x++) for (let z = minZ; z <= maxZ; z++) {
      const key = `${x},${z}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(segment);
    }
  }
  return {
    near(x, z, radius) {
      for (let gx = Math.floor((x - radius) / cellSize); gx <= Math.floor((x + radius) / cellSize); gx++) {
        for (let gz = Math.floor((z - radius) / cellSize); gz <= Math.floor((z + radius) / cellSize); gz++) {
          for (const { a, b, halfWidth } of cells.get(`${gx},${gz}`) || []) {
            const dx = b.x - a.x, dz = b.z - a.z, squared = dx * dx + dz * dz;
            const blend = squared ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / squared)) : 0;
            if ((x - a.x - blend * dx) ** 2 + (z - a.z - blend * dz) ** 2 <= (radius + halfWidth) ** 2) return true;
          }
        }
      }
      return false;
    },
  };
}

function roadWidth(tags) {
  const width = Number.parseFloat(tags.width);
  if (width > 0) return Math.max(2, Math.min(30, width));
  const lanes = Number.parseInt(tags.lanes, 10);
  if (lanes > 0) return Math.min(30, lanes * 3.2 + 1.2);
  return DEFAULT_WIDTHS[tags.highway?.replace(/_link$/, '')] || 6;
}

export function createStreets(data, project, routeSamples) {
  const lines = data.features.map(feature => ({
    points: feature.geometry.coordinates.map(point => project(point, .018)),
    halfWidth: roadWidth(feature.properties) * METRE_SCALE / 2,
  }));
  const streetIndex = createSegmentIndex(lines);
  const circuitIndex = createSegmentIndex([{ points: routeSamples, halfWidth: .46 }]);
  const positions = [];
  for (const { points, halfWidth } of lines) {
    const normals = points.map((point, index) => {
      const before = points[Math.max(0, index - 1)], after = points[Math.min(points.length - 1, index + 1)];
      return new THREE.Vector3(-(after.z - before.z), 0, after.x - before.x).normalize();
    });
    for (const side of [-1, 1]) for (let i = 1; i < points.length; i++) {
      const a = points[i - 1].clone().addScaledVector(normals[i - 1], halfWidth * side);
      const b = points[i].clone().addScaledVector(normals[i], halfWidth * side);
      const count = Math.max(1, Math.ceil(a.distanceTo(b) / .1));
      for (let part = 0; part < count; part++) {
        const from = a.clone().lerp(b, part / count), to = a.clone().lerp(b, (part + 1) / count);
        if (circuitIndex.near(from.x, from.z, .025) || circuitIndex.near(to.x, to.z, .025)) continue;
        positions.push(from.x, from.y, from.z, to.x, to.y, to.z);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: '#829ba5', transparent: true, opacity: .3, depthWrite: false });
  const group = new THREE.LineSegments(geometry, material);
  group.name = 'openstreetmap-road-outlines';
  return { group, near: (x, z, radius) => streetIndex.near(x, z, radius), dispose() { geometry.dispose();material.dispose(); } };
}
