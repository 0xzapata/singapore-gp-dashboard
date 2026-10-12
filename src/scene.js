import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createCity } from './city.js';
import { createTrack } from './track.js';
import { loadFormulaCars } from './cars.js';
import { createLens } from './lens.js';
import { createCarCamera } from './car-camera.js';
import { createDriverCard } from './driver-card.js';
import { projectDriverPoint } from './driver-card-position.js';
import { createCircuitPath } from './circuit-path.js';
import { createStreets } from './streets.js';

const AMBER = new THREE.Color('#ffad66');

export async function createCircuitScene(container, hud, coordinates, drivers, streetsData) {
  const fleet = await loadFormulaCars(drivers);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#d8e8ff', '#253038', 2));
  const keyLight = new THREE.DirectionalLight('#ffdfbd', 2.8);keyLight.position.set(-12, 25, 14);scene.add(keyLight);
  scene.fog = new THREE.FogExp2('#080a0c', .006);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const environment = new RoomEnvironment();
  const environmentGenerator = new THREE.PMREMGenerator(renderer);
  const environmentMap = environmentGenerator.fromScene(environment, .04);
  scene.environment = environmentMap.texture;scene.environmentIntensity = .5;
  environment.dispose();environmentGenerator.dispose();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.setClearColor('#080a0c', 0);
  container.append(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 500);
  const lens = createLens(renderer, scene, camera);
  const target = new THREE.Vector3(0, 0, 0);
  const home = new THREE.Vector3(3, 38, 49);
  camera.position.copy(home);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .065;
  controls.minDistance = 22;
  controls.maxDistance = 140;
  controls.maxPolarAngle = Math.PI / 2.08;
  controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotateSpeed = .22;
  controls.target.copy(target);
  let idleUntil = 0;
  let topDown = false;
  let carView = false;
  const carCamera = createCarCamera(camera, controls, fleet.cars);
  controls.addEventListener('start', () => { idleUntil = Infinity; controls.autoRotate = false; });
  controls.addEventListener('end', () => { idleUntil = performance.now() + 6000; });

  const { curve, project } = createCircuitPath(coordinates);
  const samples = curve.getSpacedPoints(1600);
  const track = createTrack(curve);
  scene.add(track.group);
  const streets = createStreets(streetsData, project, samples);
  scene.add(streets.group);
  const city = createCity(samples, streets.near);
  const cityGroup = city.group;
  scene.add(cityGroup);
  const landmarks = [
    { name: 'MARINA BAY SANDS', position: new THREE.Vector3(8, 6.8, 17) },
    { name: 'SINGAPORE FLYER', position: new THREE.Vector3(20, 5.8, 4) },
    { name: 'PADANG', position: new THREE.Vector3(-18, 0, -2) },
  ];

  const grid = new THREE.GridHelper(160, 80, '#56616b', '#28323a');
  grid.material.transparent = true;grid.material.opacity = .14;grid.position.y = -.17;scene.add(grid);

  const carMeshes = fleet.cars;
  for (const car of carMeshes.values()) scene.add(car);
  const selectedRing = new THREE.Mesh(new THREE.RingGeometry(.20, .22, 40), new THREE.MeshBasicMaterial({ color: AMBER, side: THREE.DoubleSide, transparent: true, opacity: .55 }));
  selectedRing.rotation.x = -Math.PI / 2;scene.add(selectedRing);

  const labels = [
    { text: 'START / FINISH', fraction: 0, color: '#ffad66' },
    { text: 'T01', fraction: .056 },{ text: 'T05', fraction: .235 },
    { text: 'T07', fraction: .395 },{ text: 'T10', fraction: .525 },
    { text: 'T14', fraction: .695 },{ text: 'T19', fraction: .95 },
  ].map(item => ({ ...item, position: curve.getPointAt(item.fraction) }));
  const ctx = hud.getContext('2d');
  const driverCard = createDriverCard(container.parentElement);
  const scaleBar = document.querySelector('.scene-scale i');
  let width = 0, height = 0, previousFrame;
  const observer = new ResizeObserver(() => {
    width = container.clientWidth; height = container.clientHeight;
    renderer.setSize(width, height);
    lens.setSize(width, height);
    camera.aspect = width / Math.max(1, height);camera.updateProjectionMatrix();
    const requiredDistance = home.length() * Math.max(1, 1.2 / camera.aspect);
    if (!carView && camera.position.distanceTo(target) < requiredDistance) camera.position.sub(target).setLength(requiredDistance).add(target);
    const dpr = Math.min(window.devicePixelRatio, 2);
    hud.width = Math.round(width * dpr);hud.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    driverCard.resize();
  });
  observer.observe(container);

  const projected = new THREE.Vector3();
  const driverProjection = new THREE.Vector3();
  function screenPosition(position) {
    projected.copy(position).project(camera);
    if (projected.z > 1 || projected.z < -1) return null;
    return [(projected.x * .5 + .5) * width, (-projected.y * .5 + .5) * height];
  }
  function drawPin(text, position, color, small = false, opacity = 1) {
    if (opacity < .01) return;
    const p = screenPosition(position);if (!p) return;
    const [x, y] = p;
    if (x < 15 || x > width - 100 || y < 128 || y > height - 100) return;
    ctx.strokeStyle = color;ctx.fillStyle = color;ctx.lineWidth = .6;
    ctx.globalAlpha = opacity;
    ctx.beginPath();ctx.moveTo(x, y);ctx.lineTo(x, y - 15);ctx.lineTo(x + 5, y - 20);ctx.stroke();
    ctx.fillRect(x - 1, y - 1, 2, 2);ctx.font = `${small ? 6 : 7}px Plex, monospace`;
    ctx.fillText(text, x + 8, y - 18);
    ctx.globalAlpha = 1;
  }

  return {
    frame(t, state) {
      if (!width || !height) return;
      const dt = previousFrame === undefined ? 0 : Math.min(1, Math.max(0, t - previousFrame));previousFrame = t;
      if (performance.now() > idleUntil && !topDown && !carView && !matchMedia('(prefers-reduced-motion: reduce)').matches) controls.autoRotate = true;
      if (!carView) controls.update();city.frame(t);
      for (const car of state.cars) {
        const mesh = carMeshes.get(car.code);mesh.position.copy(curve.getPointAt(car.fraction));mesh.position.y = .075;
        mesh.visible = !car.retired;
        const tangent = curve.getTangentAt(car.fraction);
        mesh.rotation.y = Math.atan2(tangent.x, tangent.z);
        fleet.updateWheels(mesh, car.distance * curve.getLength());
      }
      if (carView) carCamera.frame(t, state.selected.code);
      selectedRing.position.copy(carMeshes.get(state.selected.code).position);
      selectedRing.position.y = .063;selectedRing.visible = !carView && !state.selected.retired;
      lens.render(controls.target, dt);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      right.y = 0;right.normalize().multiplyScalar(500 * 3000 / 111320);
      const scaleStart = screenPosition(target), scaleEnd = screenPosition(target.clone().add(right));
      if (scaleStart && scaleEnd) scaleBar.style.width = `${Math.abs(scaleEnd[0] - scaleStart[0])}px`;
      ctx.clearRect(0, 0, width, height);
      for (const label of labels) drawPin(label.text, label.position, label.color || '#9ba2a899');
      drawPin('PIT LANE', track.pitLabel, '#8ca7a5bb', true);
      if (cityGroup.visible) for (const landmark of landmarks) {
        const opacity = city.visibilityFor();
        drawPin(landmark.name, landmark.position, '#69798377', true, opacity);
      }
      const viewport = { width, height };
      const p = projectDriverPoint(selectedRing.position, camera, viewport, driverProjection);
      if (state.selected.retired) driverCard.hide();
      else driverCard.frame(state.selected, p, viewport, carView ? 'car' : topDown ? 'top' : 'orbit', dt);
    },
    setView(view) {
      carCamera.stop();carView = view === 'car';
      if (carView) driverCard.hide();
      controls.minDistance = carView ? 1.2 : 22;controls.maxDistance = carView ? 12 : 140;
      topDown = view === 'top';controls.autoRotate = !topDown && !carView;idleUntil = topDown || carView ? Infinity : performance.now() + 1000;
      if (carView) return;
      camera.position.copy(topDown ? new THREE.Vector3(0, 63, .01) : home);
      camera.position.multiplyScalar(Math.max(1, 1.2 / camera.aspect));
      controls.target.copy(target);controls.update();
    },
    setCity(visible) { city.setVisible(visible); },
    dispose() { observer.disconnect();driverCard.dispose();carCamera.stop();controls.dispose();streets.dispose();fleet.dispose();lens.dispose();environmentMap.dispose();renderer.dispose(); },
    pointCount: city.pointCount,
  };
}
