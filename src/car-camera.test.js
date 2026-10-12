import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCarCamera } from './car-camera.js';

function setup() {
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 500);
  const cars = new Map();
  for (const [code, x, z, heading] of [['RUS', 0, 0, 0], ['VER', 20, 15, 1], ['NOR', -15, 10, -1]]) {
    const car = new THREE.Object3D();car.position.set(x, .075, z);car.rotation.y = heading;cars.set(code, car);
  }
  const controls = {
    target: cars.get('RUS').position.clone(), enabled: true, enableDamping: true, autoRotate: false, maxDistance: 12,
    update() { camera.lookAt(this.target); },
  };
  camera.position.copy(controls.target).add(new THREE.Vector3(1.7, 1.8, -2.2));
  const controller = createCarCamera(camera, controls, cars);
  controller.frame(0, 'RUS');controller.frame(3, 'RUS');
  return { camera, controls, cars, controller };
}

function close(actual, expected, message) {
  assert.ok(actual.distanceTo(expected) < 1e-8, message);
}

test('changing drivers begins at the current camera pose and pulls back before moving away', () => {
  const { camera, controls, cars, controller } = setup();
  const position = camera.position.clone(), target = controls.target.clone();
  const originalDistance = camera.position.distanceTo(cars.get('RUS').position);
  controller.frame(4, 'VER');
  close(camera.position, position, 'Selection must not teleport the camera.');
  close(controls.target, target, 'Selection must not jump the look target.');
  controller.frame(4.2, 'VER');
  close(controls.target, cars.get('RUS').position, 'Pullback must keep looking at the outgoing car.');
  assert.ok(camera.position.distanceTo(cars.get('RUS').position) > originalDistance + .5);
  assert.equal(controls.enabled, false);
});

test('the camera travels between cars and zooms in on the destination before restoring orbit controls', () => {
  const { camera, controls, cars, controller } = setup();
  const destination = cars.get('VER');
  controller.frame(4, 'VER');controller.frame(5.1, 'VER');
  assert.ok(controls.target.x > 0 && controls.target.x < destination.position.x);
  assert.ok(camera.position.y > 5, 'The flight should lift above the circuit.');
  controller.frame(5.9, 'VER');
  const arrivalDistance = camera.position.distanceTo(destination.position);
  controller.frame(6.4, 'VER');
  close(controls.target, destination.position, 'The new car must be centered after arrival.');
  assert.ok(camera.position.distanceTo(destination.position) < arrivalDistance - 1);
  const offset = new THREE.Vector3(1.7, 1.8, -2.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), destination.rotation.y);
  close(camera.position, destination.position.clone().add(offset), 'Arrival must frame the destination heading.');
  assert.equal(controls.enabled, true);assert.equal(controls.enableDamping, true);assert.equal(controls.maxDistance, 12);
});

test('the departure and arrival follow cars that move during the flight', () => {
  const { camera, controls, cars, controller } = setup();
  controller.frame(4, 'VER');
  cars.get('RUS').position.add(new THREE.Vector3(2, 0, 3));
  controller.frame(4.2, 'VER');
  close(controls.target, cars.get('RUS').position, 'Pullback must follow the moving outgoing car.');
  cars.get('VER').position.add(new THREE.Vector3(-4, 0, 2));
  controller.frame(6.4, 'VER');
  close(controls.target, cars.get('VER').position, 'Arrival must use the current destination position.');
  const position = camera.position.clone(), delta = new THREE.Vector3(1, 0, 2);
  cars.get('VER').position.add(delta);controller.frame(6.5, 'VER');
  close(camera.position, position.add(delta), 'Following must preserve the settled camera offset.');
});

test('selecting another driver during a flight redirects it without a camera jump', () => {
  const { camera, controls, cars, controller } = setup();
  controller.frame(4, 'VER');controller.frame(5, 'VER');
  const position = camera.position.clone(), target = controls.target.clone();
  controller.frame(5, 'NOR');
  close(camera.position, position, 'Retargeting must start from the current visible camera position.');
  close(controls.target, target, 'Retargeting must preserve the current look direction.');
  controller.frame(8, 'NOR');
  close(controls.target, cars.get('NOR').position, 'The latest selection must win.');
  assert.equal(controls.enabled, true);
});

test('entering car cam flies from the current overview instead of cutting to the car', () => {
  const { camera, controls, cars, controller } = setup();
  controller.stop();camera.position.set(3, 38, 49);controls.target.set(0, 0, 0);
  const position = camera.position.clone();
  controller.frame(4, 'VER');close(camera.position, position, 'Entering Car cam must preserve the overview on its first frame.');
  controller.frame(4.5, 'VER');assert.ok(camera.position.distanceTo(position) > 1);
  controller.frame(7, 'VER');close(controls.target, cars.get('VER').position, 'The entry flight must finish on the selected car.');
});

test('leaving car cam cancels the flight and restores camera interaction', () => {
  const { camera, controls, controller } = setup();
  controller.frame(4, 'VER');controller.frame(4.2, 'VER');
  const position = camera.position.clone();controller.stop();
  close(camera.position, position, 'Stopping a flight must not move the camera.');
  assert.equal(controls.enabled, true);assert.equal(controls.enableDamping, true);
});

test('reduced motion follows the selected driver without a camera flight', () => {
  const original = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: true });
  try {
    const { camera, controls, cars, controller } = setup();
    controller.frame(4, 'VER');close(controls.target, cars.get('VER').position, 'Reduced motion must switch immediately.');
    assert.ok(camera.position.distanceTo(cars.get('VER').position) < 4);assert.equal(controls.enabled, true);
  } finally {
    if (original === undefined) delete globalThis.matchMedia;else globalThis.matchMedia = original;
  }
});
