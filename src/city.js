import * as THREE from 'three';
import { createTrackScanField } from './track-scan.js';

const cityVertex = `
  attribute float aCityDetail;
  varying vec3 vCityPosition;
  varying float vCityDetail;
`;

const cityFragment = `
  uniform float uCityTime, uCityMotion, uCityVisibility, uCityScanExtent;
  uniform sampler2D uCityTrackDistance;
  uniform vec4 uCityTrackBounds;
  varying vec3 vCityPosition;
  varying float vCityDetail;
  float cityWaveRadius(float time) {
    float progress = smoothstep(1.5, 10.5, time);
    return mix(-1.0, uCityScanExtent + 1.0, progress);
  }
  float cityWaveLight(float distanceToTrack, float radius, float time) {
    float light = exp(-pow((distanceToTrack - radius) / 0.35, 2.0));
    return light * step(1.5, time) * (1.0 - step(10.5, time)) * uCityMotion;
  }
  vec3 cityScan() {
    float cycle = mod(uCityTime, 16.0);
    vec2 uv = (vCityPosition.xz - uCityTrackBounds.xy) / uCityTrackBounds.zw;
    float distanceToTrack = texture2D(uCityTrackDistance, uv).r * uCityScanExtent;
    float leadingRadius = cityWaveRadius(cycle);
    float trailingTime = cycle - 0.5;
    float trailingRadius = cityWaveRadius(trailingTime);
    float revealed = 1.0 - smoothstep(leadingRadius - 0.15, leadingRadius + 0.15, distanceToTrack);
    float cleared = 1.0 - smoothstep(trailingRadius - 0.15, trailingRadius + 0.15, distanceToTrack);
    float detail = mix(1.0, revealed * (1.0 - cleared), uCityMotion);
    return vec3(detail, cityWaveLight(distanceToTrack, leadingRadius, cycle), cityWaveLight(distanceToTrack, trailingRadius, trailingTime));
  }
`;

const cityProjection = `
  vec4 cityPosition = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    cityPosition = instanceMatrix * cityPosition;
  #endif
  vec4 cityWorld = modelMatrix * cityPosition;
  vCityPosition = cityWorld.xyz;
  vCityDetail = aCityDetail;
  vec4 mvPosition = viewMatrix * cityWorld;
  gl_Position = projectionMatrix * mvPosition;
`;

export function createCity(routeSamples, nearStreet) {
  const group = new THREE.Group();
  group.name = 'city';
  let seed = 2026;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const shells = [], edges = [], windows = [], windowColors = [];
  const edgeDetails = [];
  const cool = new THREE.Color('#a4bdca'), warm = new THREE.Color('#dfac72');
  const segment = (a, b, detail = 0) => {
    edges.push(...a, ...b);edgeDetails.push(detail, detail);
  };
  const addWindow = (x, y, z, brightness, amber = false) => {
    const color = amber ? warm : cool;
    windows.push(x, y, z);
    windowColors.push(color.r * brightness, color.g * brightness, color.b * brightness);
  };

  function building(x, z, w, d, h, base = 0, detail = 1) {
    shells.push({ x, y: base + h / 2, z, w, d, h });
    const left = x - w / 2, right = x + w / 2, front = z - d / 2, back = z + d / 2;
    for (const y of [base, base + h]) {
      segment([left,y,front], [right,y,front]);segment([right,y,front], [right,y,back]);
      segment([right,y,back], [left,y,back]);segment([left,y,back], [left,y,front]);
    }
    for (const [px, pz] of [[left,front],[right,front],[right,back],[left,back]]) segment([px,base,pz], [px,base+h,pz]);
    const floorHeight = .22, floors = Math.floor(h / floorHeight);
    const colsX = Math.max(2, Math.floor(w / .19)), colsZ = Math.max(2, Math.floor(d / .19));
    for (let floor = 1; floor < floors; floor++) {
      const y = base + floor * floorHeight;
      segment([left,y,front], [right,y,front], 1);segment([left,y,back], [right,y,back], 1);
      segment([left,y,front], [left,y,back], 1);segment([right,y,front], [right,y,back], 1);
      for (let c = 0; c < colsX; c++) {
        const px = left + (c + .5) * w / colsX;
        if (random() > .25) addWindow(px, y + .07, front - .012, .25 + random() * .7, random() < .20);
        if (random() > .25) addWindow(px, y + .07, back + .012, .25 + random() * .7, random() < .20);
      }
      for (let c = 0; c < colsZ; c++) {
        const pz = front + (c + .5) * d / colsZ;
        if (random() > .28) addWindow(left - .012, y + .07, pz, .25 + random() * .55);
        if (random() > .28) addWindow(right + .012, y + .07, pz, .25 + random() * .55);
      }
    }
    if (h > 2 && detail === 1) {
      const rw = w * .30, rd = d * .32;
      shells.push({ x, y: base + h + .09, z, w: rw, d: rd, h: .18 });
      segment([x,base+h+.18,z], [x,base+h+.55,z]);
      addWindow(x, base + h + .55, z, .8, true);
    }
  }

  function nearRoad(x, z, radius) {
    if (nearStreet(x, z, radius)) return true;
    for (let i = 0; i < routeSamples.length; i += 5) {
      if ((routeSamples[i].x - x) ** 2 + (routeSamples[i].z - z) ** 2 < radius * radius) return true;
    }
    return false;
  }

  let buildingCount = 0;
  for (let gx = -30; gx <= 30; gx += 2.9) for (let gz = -22; gz <= 22; gz += 2.9) {
    if (random() < .24 || (gz > 10 && gx > -6 && gx < 18) || (gx > 16 && gz > 0 && gz < 9)) continue;
    const x = gx + (random() - .5) * .4, z = gz + (random() - .5) * .4;
    const w = .85 + random() * 1.5, d = .8 + random() * 1.45;
    if (nearRoad(x, z, Math.hypot(w, d) / 2 + .6)) continue;
    const h = .7 + random() ** 2.8 * 7;
    const podium = h > 3 ? .4 : 0;
    if (podium) building(x, z, w + .3, d + .3, podium);
    const tiered = h > 4 && random() > .4;
    building(x, z, w, d, tiered ? h * .75 : h, podium);
    if (tiered) building(x, z, w * .70, d * .70, h * .25, podium + h * .75);
    buildingCount++;
  }

  // Stylized Marina Bay Sands: articulated towers, window bands and a curved skypark.
  building(8, 17, 7.4, 3, .28, 0, 2);
  for (let tower = 0; tower < 3; tower++) {
    const x = 5.6 + tower * 2.35;
    for (let tier = 0; tier < 4; tier++) {
      building(x + Math.sin(tier / 3 * Math.PI / 2) * .32, 16.8, 1.22 - tier * .035, 1.65, 1.55, .28 + tier * 1.55, 2);
    }
  }
  const skypark = new THREE.Shape();
  skypark.moveTo(-4.6, 0);skypark.bezierCurveTo(-4.8,-.65,-3.3,-1.03,0,-.97);
  skypark.bezierCurveTo(3.8,-.94,4.65,-.4,4.75,0);skypark.bezierCurveTo(4.3,.65,2.8,.98,0,.98);
  skypark.bezierCurveTo(-3,.98,-4.35,.7,-4.6,0);
  const deckGeometry = new THREE.ExtrudeGeometry(skypark, { depth: .22, bevelEnabled: false, curveSegments: 24 });
  deckGeometry.rotateX(-Math.PI / 2);deckGeometry.translate(8, 6.53, 16.8);
  group.add(new THREE.Mesh(deckGeometry, new THREE.MeshBasicMaterial({ color: '#25383d' })));
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(deckGeometry), new THREE.LineBasicMaterial({ color: '#a3b7b6', transparent: true, opacity: .65 })));
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(5.8, .32), new THREE.MeshBasicMaterial({ color: '#6ca5ae', transparent: true, opacity: .6, side: THREE.DoubleSide }));
  pool.rotation.x = -Math.PI / 2;pool.position.set(8, 6.76, 17.12);group.add(pool);
  for (let i = 0; i < 23; i++) {
    const x = 4.6 + i * .30;segment([x,6.75,16.05], [x,6.97,16.05]);
    if (i % 3 === 0) addWindow(x, 6.82, 16.05, .75, true);
  }

  // The Flyer has two rims, spokes, suspended cabins and its support structure.
  const wheelX = 20, wheelZ = 4, wheelY = 3.05, radius = 2.7;
  for (const z of [wheelZ - .22, wheelZ + .22]) {
    for (let i = 0; i < 120; i++) {
      const a = i / 120 * Math.PI * 2, b = (i + 1) / 120 * Math.PI * 2;
      segment([wheelX + Math.cos(a)*radius,wheelY + Math.sin(a)*radius,z], [wheelX + Math.cos(b)*radius,wheelY + Math.sin(b)*radius,z]);
    }
  }
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * Math.PI * 2, x = wheelX + Math.cos(a) * radius, y = wheelY + Math.sin(a) * radius;
    segment([wheelX,wheelY,wheelZ], [x,y,wheelZ-.22]);
    shells.push({ x, y, z: wheelZ, w: .20, h: .17, d: .55 });
    addWindow(x, y, wheelZ + .29, .8, i % 4 === 0);
  }
  segment([wheelX,wheelY,wheelZ], [wheelX-1.5,.05,wheelZ+.9]);
  segment([wheelX,wheelY,wheelZ], [wheelX+1.5,.05,wheelZ+.9]);
  building(wheelX, wheelZ, 3.5, 1.8, .25, 0, 2);

  const matrix = new THREE.Matrix4();
  const shellMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({ color: '#1a303d' }), shells.length);
  shellMesh.name = 'building-shells';
  shellMesh.geometry.setAttribute('aCityDetail', new THREE.InstancedBufferAttribute(new Float32Array(shells.length).fill(1), 1));
  shells.forEach((box, i) => {
    matrix.makeScale(box.w, box.h, box.d);matrix.setPosition(box.x, box.y, box.z);shellMesh.setMatrixAt(i, matrix);
  });
  group.add(shellMesh);
  const edgeGeo = new THREE.BufferGeometry();edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edges, 3));
  edgeGeo.setAttribute('aCityDetail', new THREE.Float32BufferAttribute(edgeDetails, 1));
  const outlineMesh = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: '#8bb0bd', transparent: true, opacity: .48 }));
  outlineMesh.name = 'facades-and-rooftops';group.add(outlineMesh);
  const windowGeo = new THREE.BufferGeometry();windowGeo.setAttribute('position', new THREE.Float32BufferAttribute(windows, 3));windowGeo.setAttribute('color', new THREE.Float32BufferAttribute(windowColors, 3));
  windowGeo.setAttribute('aCityDetail', new THREE.Float32BufferAttribute(new Float32Array(windows.length / 3).fill(1), 1));
  const scanBounds = new THREE.Box3().setFromObject(group);
  for (const point of routeSamples) scanBounds.expandByPoint(point);
  scanBounds.expandByScalar(4);
  const uniforms = {
    uCityTime: { value: 0 }, uCityMotion: { value: 1 }, uCityVisibility: { value: 1 },
    ...createTrackScanField(routeSamples, scanBounds),
  };
  const windowMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { ...uniforms, uPixelRatio: { value: Math.min(globalThis.devicePixelRatio || 1, 1.7) } },
    vertexShader: `${cityVertex} attribute vec3 color;varying vec3 vColor;uniform float uPixelRatio;
      void main(){vColor=color;vec3 transformed=position;${cityProjection}
      gl_PointSize=clamp(45./-mvPosition.z,.45,1.9)*uPixelRatio;}`,
    fragmentShader: `${cityFragment} varying vec3 vColor;
      void main(){
        vec3 scan=cityScan();vec2 p=abs(gl_PointCoord-.5);
        float a=1.-smoothstep(.3,.5,max(p.x,p.y));
        vec3 glow=vColor*(1.15+scan.y*2.3+scan.z*1.5)
          +vec3(.85,.5,.24)*scan.y*.3+vec3(.3,.7,.85)*scan.z*.3;
        gl_FragColor=vec4(glow,a*clamp(scan.x+scan.y+scan.z,0.,1.)*uCityVisibility);
      }`,
  });
  const windowMesh = new THREE.Points(windowGeo, windowMaterial);windowMesh.name = 'illuminated-windows';group.add(windowMesh);
  windowMesh.renderOrder = 2;

  group.traverse(object => {
    if (!object.material || object === windowMesh) return;
    if (!object.geometry.getAttribute('aCityDetail')) {
      const count = object.geometry.getAttribute('position').count;
      object.geometry.setAttribute('aCityDetail', new THREE.Float32BufferAttribute(new Float32Array(count).fill(object.isLineSegments ? 0 : 1), 1));
    }
    const material = object.material;
    object.renderOrder = object.isMesh ? 1 : 2;
    material.transparent = true;material.depthWrite = true;
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = cityVertex + shader.vertexShader.replace('#include <project_vertex>', cityProjection);
      shader.fragmentShader = cityFragment + shader.fragmentShader.replace('#include <opaque_fragment>', `
        vec3 scan = cityScan();
        float light = scan.y + scan.z * 0.8;
        float outline = 0.65 + 0.35 * scan.x + light;
        float mask = mix(outline, scan.x + light, vCityDetail);
        diffuseColor.rgb += vec3(0.85, 0.5, 0.24) * scan.y * 2.5;
        diffuseColor.rgb += vec3(0.3, 0.7, 0.85) * scan.z * 2.0;
        diffuseColor.a *= clamp(mask, 0.0, 1.0) * uCityVisibility;
        if (diffuseColor.a < 0.005) discard;
        #include <opaque_fragment>
      `);
    };
    material.customProgramCacheKey = () => 'city-track-scan-reveal-and-clear';
  });

  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let startedAt, previousTime, visibility = 1, targetVisibility = 1;
  return {
    group, pointCount: windows.length / 3, buildingCount,
    frame(time) {
      startedAt ??= time;
      const dt = previousTime === undefined ? 0 : Math.min(.1, Math.max(0, time - previousTime));previousTime = time;
      visibility = reducedMotion?.matches ? targetVisibility : THREE.MathUtils.damp(visibility, targetVisibility, 3.5, dt);
      uniforms.uCityTime.value = time - startedAt;
      uniforms.uCityMotion.value = reducedMotion?.matches ? 0 : 1;
      uniforms.uCityVisibility.value = visibility;
      group.visible = visibility > .005;
    },
    setVisible(visible) { targetVisibility = visible ? 1 : 0; },
    visibilityFor() { return visibility; },
  };
}
