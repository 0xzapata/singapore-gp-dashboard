import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { placeDriverCard, projectDriverPoint } from './driver-card-position.js';

const viewport = { width: 800, height: 600 };
const portrait = { width: 74, height: 82 };

test('off-screen driver portraits follow all four edges and corners within the map', () => {
  for (const [x, y] of [[-100, 300], [900, 300], [400, -100], [400, 700], [-100, -100], [900, 700]]) {
    const p = placeDriverCard({ x, y, behind: false }, viewport, portrait, 156, 108, true);
    assert.equal(p.compact, true);
    assert.ok(p.x >= 12 - 1e-8 && p.x + portrait.width <= 788 + 1e-8);
    assert.ok(p.y >= 156 - 1e-8 && p.y + portrait.height <= 492 + 1e-8);
    assert.ok(Math.abs(p.x - 12) < 1e-8 || Math.abs(p.x + portrait.width - 788) < 1e-8 || Math.abs(p.y - 156) < 1e-8 || Math.abs(p.y + portrait.height - 492) < 1e-8);
  }
});

test('returning to the map restores the full card and keeps it clear of the map controls', () => {
  const full = { width: 252, height: 82 };
  for (const [x, y] of [[1, 1], [799, 599], [400, 300]]) {
    const p = placeDriverCard({ x, y, behind: false }, viewport, full, 156, 108, true);
    assert.equal(p.compact, false);
    assert.ok(p.x >= 12 && p.x + full.width <= 788);
    assert.ok(p.y >= 156 && p.y + full.height <= 492);
  }
});

test('portrait positions remain inside mobile maps throughout collapse and expansion', () => {
  for (const width of [64, 100, 160, 228]) {
    const p = placeDriverCard({ x: 900, y: 900, behind: false }, { width: 294, height: 540 }, { width, height: 74 }, 170, 120, true);
    assert.ok(p.x >= 12 - 1e-8 && p.x + width <= 282 + 1e-8);
    assert.ok(p.y >= 170 - 1e-8 && p.y + 74 <= 420 + 1e-8);
  }
});

test('off-screen portraits remain exclusive to Orbit mode', () => {
  const point = { x: 900, y: 300, behind: false };
  assert.equal(placeDriverCard(point, viewport, portrait, 156, 108, false), null);
});

test('cars behind the camera keep their direction instead of mirroring to the opposite edge', () => {
  const camera = new PerspectiveCamera(38, 800 / 600, .1, 500);
  camera.updateMatrixWorld();
  const front = projectDriverPoint(new Vector3(10, 0, -10), camera, viewport);
  const behind = projectDriverPoint(new Vector3(10, 0, 10), camera, viewport);
  assert.equal(front.behind, false);
  assert.equal(behind.behind, true);
  assert.equal(front.x, behind.x);
  assert.ok(placeDriverCard(behind, viewport, portrait, 156, 108, true).x > 400);
  const plane = projectDriverPoint(new Vector3(0, 0, 0), camera, viewport);
  const p = placeDriverCard(plane, viewport, portrait, 156, 108, true);
  assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
});
