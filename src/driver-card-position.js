import { Vector3 } from 'three';

export function projectDriverPoint(position, camera, viewport, scratch = new Vector3()) {
  scratch.copy(position).applyMatrix4(camera.matrixWorldInverse);
  const depth = Math.max(Math.abs(scratch.z), .0001);
  return {
    x: (scratch.x * camera.projectionMatrix.elements[0] / depth * .5 + .5) * viewport.width,
    y: (-scratch.y * camera.projectionMatrix.elements[5] / depth * .5 + .5) * viewport.height,
    behind: scratch.z >= -camera.near,
  };
}

export function placeDriverCard(point, viewport, card, topInset, bottomInset, allowCompact) {
  if (!point) return null;
  const compact = point.behind || point.x < 0 || point.x > viewport.width || point.y < 0 || point.y > viewport.height;
  if (compact && !allowCompact) return null;
  const left = 12, right = viewport.width - card.width - 12;
  const top = topInset, bottom = viewport.height - bottomInset - card.height;
  if (right < left || bottom < top) return null;
  if (compact) {
    const centerX = (left + right) / 2, centerY = (top + bottom) / 2;
    const dx = point.x - centerX - card.width / 2;
    const dy = point.y - centerY - card.height / 2 || (dx === 0 ? 1 : 0);
    const scale = Math.min(dx === 0 ? Infinity : (right - left) / 2 / Math.abs(dx), dy === 0 ? Infinity : (bottom - top) / 2 / Math.abs(dy));
    return { x: centerX + dx * scale, y: centerY + dy * scale, compact };
  }
  const preferredX = point.x + 18 + card.width <= viewport.width - 12 ? point.x + 18 : point.x - card.width - 18;
  return {
    x: Math.max(left, Math.min(right, preferredX)),
    y: Math.max(top, Math.min(bottom, point.y - card.height - 14)),
    compact,
  };
}
