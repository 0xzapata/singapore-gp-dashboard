import * as THREE from 'three';
import { createLens } from '../src/lens.js';

// Run in the dashboard's browser console:
// import('/scripts/verify-lens.js').then(module => module.verifyLens())
export function verifyLens() {
  const width = 600, height = 300;
  const renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(width, height);renderer.setClearColor(0, 0);
  const camera = new THREE.PerspectiveCamera(50, width / height, .1, 100);
  const scene = new THREE.Scene();
  const data = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const i = (y * 64 + x) * 4, value = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = value;data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, 64, 64);
  texture.needsUpdate = true;texture.minFilter = texture.magFilter = THREE.NearestFilter;
  for (const [depth, screenX] of [[6, -.65], [12, 0], [24, .65]]) {
    const size = depth * Math.tan(25 * Math.PI / 180) * .7;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: texture }));
    card.position.set(screenX * depth * Math.tan(25 * Math.PI / 180) * camera.aspect, 0, -depth);
    scene.add(card);
  }
  const lens = createLens(renderer, scene, camera);
  const destination = new THREE.WebGLRenderTarget(width, height);
  lens.setSize(width, height);renderer.setRenderTarget(destination);
  const focus = new THREE.Vector3(10, 0, -12);
  const pixels = new Uint8Array(width * height * 4);
  const read = () => { renderer.readRenderTargetPixels(destination, 0, 0, width, height, pixels);return pixels.slice(); };
  const difference = (reference, current, centerX) => {
    let sum = 0, count = 0;
    for (let y = height / 2 - 30; y < height / 2 + 30; y++) for (let x = centerX - 30; x < centerX + 30; x++) {
      const i = (y * width + x) * 4;
      sum += Math.abs(reference[i] - current[i]);count++;
    }
    return Number((sum / count).toFixed(2));
  };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  try {
    renderer.render(scene, camera);
    const sharp = read();
    lens.render(focus, 1);
    const blurred = read();
    const blurredDifference = [105, 300, 495].map(x => difference(sharp, blurred, x));
    assert(blurredDifference[1] < 2, 'The object on the focus plane must stay sharp.');
    assert(blurredDifference[0] > 5, 'The fixed lens must blur the foreground.');
    assert(blurredDifference[2] > 5, 'The fixed lens must blur the background.');
    assert(blurred[3] === 0, 'The lens must preserve the transparent scene background.');
    focus.set(0, 0, -24);
    for (let frame = 0; frame < 10; frame++) lens.render(focus, .1);
    const refocused = read();
    const refocusedDifference = [105, 300, 495].map(x => difference(sharp, refocused, x));
    assert(refocusedDifference[2] < 2, 'Autofocus must make the new focus plane sharp.');
    assert(refocusedDifference[1] > 5, 'The old focus plane must become blurred.');
    assert(!renderer.info.programs.some(program => program.diagnostics?.runnable === false), 'Lens shaders must compile.');
    renderer.setSize(300, 150);destination.setSize(300, 150);lens.setSize(300, 150);
    lens.render(focus, .1);
    assert(renderer.getContext().getError() === 0, 'Resizing the lens must not cause a WebGL error.');
    return { passed: true, blurredDifference, refocusedDifference, transparentBackground: true, resized: true };
  } finally {
    lens.dispose();destination.dispose();texture.dispose();
    scene.traverse(object => { object.geometry?.dispose();object.material?.dispose(); });
    renderer.dispose();
  }
}
