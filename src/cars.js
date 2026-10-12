import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export async function loadFormulaCars(drivers) {
  const url = import.meta.env.VITE_FORMULA_CAR_URL?.trim() || `${import.meta.env.BASE_URL}models/formula-car.glb`;
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
  const detail = gltf.scene.getObjectByName('detail');
  const overview = gltf.scene.getObjectByName('overview');
  if (!detail || !overview) throw new Error('The formula car asset is missing its detail levels.');
  gltf.scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(detail);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = .34 / size.z;
  const materials = new Map();
  const cars = new Map();

  for (const driver of drivers) {
    const car = new THREE.Group();car.name = `formula-car-${driver.code}`;
    const lod = new THREE.LOD();
    lod.addLevel(detail.clone(true), 0);
    lod.addLevel(overview.clone(true), 6, .12);
    const normalized = new THREE.Group();normalized.add(lod);normalized.scale.setScalar(scale);car.add(normalized);
    for (const level of lod.levels) level.object.position.sub(new THREE.Vector3(center.x, bounds.min.y, center.z));
    const wheels = [];
    lod.traverse(part => {
      if (part.name.startsWith('wheel_') && part.userData.radius) wheels.push(part);
      if (!part.isMesh) return;
      const recolor = source => {
        const role = source.userData.role;
        const paint = role?.startsWith('paint-');
        const key = `${source.uuid}:${paint ? driver.color : 'shared'}`;
        if (!materials.has(key)) {
          const material = source.clone();
          if (paint) {
            material.color.set(role === 'paint-trim' ? '#dce6ec' : driver.color);
            if (role === 'paint-secondary') material.color.multiplyScalar(.45);
            material.metalness = .45;material.roughness = .28;
            material.emissive.set(driver.color);material.emissiveIntensity = .015;
          } else if (source.name === 'tyres') {
            material.metalness = 0;material.roughness = .9;
          }
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
      for (const wheel of car.userData.wheels) wheel.rotation.x = (distance / (wheel.userData.radius * scale)) % (Math.PI * 2);
    },
    dispose() {
      const geometries = new Set();
      const textures = new Set();
      const sourceMaterials = new Set();
      gltf.scene.traverse(part => {
        if (!part.isMesh) return;
        geometries.add(part.geometry);
        for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
          sourceMaterials.add(material);
          for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        }
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      sourceMaterials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
    },
  };
}
