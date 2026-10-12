import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function loadFormulaCars(drivers) {
  const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/formula-car.glb`);
  const bounds = new THREE.Box3().setFromObject(gltf.scene);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = .34 / size.z;
  const materials = new Map();
  const cars = new Map();

  for (const driver of drivers) {
    const car = new THREE.Group();car.name = `formula-car-${driver.code}`;
    const model = gltf.scene.clone(true);
    model.position.sub(new THREE.Vector3(center.x, bounds.min.y, center.z));
    const normalized = new THREE.Group();normalized.add(model);normalized.scale.setScalar(scale);car.add(normalized);
    const wheels = [];
    model.traverse(part => {
      if (/^wheel/.test(part.name) && !part.isMesh) wheels.push(part);
      if (!part.isMesh) return;
      const recolor = source => {
        const paint = source.name === 'grey';
        const key = `${source.name}:${paint ? driver.color : 'shared'}`;
        if (!materials.has(key)) {
          const material = source.clone();
          material.color.set(paint ? driver.color : source.name === 'carTire' ? '#151a20' : '#263747');
          material.metalness = paint ? .28 : .05;
          material.roughness = paint ? .45 : .9;
          if (paint) { material.emissive.set(driver.color);material.emissiveIntensity = .18; }
          materials.set(key, material);
        }
        return materials.get(key);
      };
      part.material = Array.isArray(part.material) ? part.material.map(recolor) : recolor(part.material);
    });
    car.userData.wheels = wheels;cars.set(driver.code, car);
  }

  return {
    cars,
    updateWheels(car, distance) {
      for (const wheel of car.userData.wheels) wheel.rotation.x = distance / (size.y * scale * .27);
    },
    dispose() {
      const geometries = new Set();
      gltf.scene.traverse(part => { if (part.isMesh) geometries.add(part.geometry); });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
    },
  };
}
