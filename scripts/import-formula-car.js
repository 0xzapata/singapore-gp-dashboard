import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run with: npx --yes --package @gltf-transform/cli@4.4.0 -c 'node scripts/import-formula-car.js'
const toolsRoot = process.env.PATH.split(delimiter).map(path => resolve(path, '..'))
  .find(path => existsSync(join(path, '@gltf-transform/core/package.json')));
if (!toolsRoot) throw new Error('Run this importer through the pinned glTF Transform command above.');
const toolRequire = createRequire(join(toolsRoot, '@gltf-transform/cli/package.json'));
const { NodeIO } = await import(toolRequire.resolve('@gltf-transform/core'));
const { ALL_EXTENSIONS } = await import(toolRequire.resolve('@gltf-transform/extensions'));
const { compactPrimitive, transformPrimitive, cloneDocument, mergeDocuments, dedup, prune, weld, simplify, meshopt, textureCompress, unpartition } = await import(toolRequire.resolve('@gltf-transform/functions'));
const { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } = await import(toolRequire.resolve('meshoptimizer'));
const sharp = toolRequire('sharp');
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);

const root = fileURLToPath(new URL('../', import.meta.url));
const commit = '2f0c3e774c698b79095755093495f4b4a102d06e';
const sourceBase = `https://raw.githubusercontent.com/diazandez/threejs-F1-2022-models/${commit}/f1_generic_2022/`;
const sourceDirectory = join(root, '.cache', 'formula-car', commit);
const outputDirectory = join(root, 'public', 'models');
await mkdir(sourceDirectory, { recursive: true });
await mkdir(outputDirectory, { recursive: true });
const sources = [];
async function download(path) {
  const url = sourceBase + path;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Car source returned ${response.status}: ${path}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const destination = join(sourceDirectory, path);
  await mkdir(resolve(destination, '..'), { recursive: true });
  await writeFile(destination, bytes);
  sources.push({ path, url, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  return bytes;
}
const original = JSON.parse(await download('scene.gltf'));
if (original.asset.extras.license !== 'CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)') {
  throw new Error('The source license has changed.');
}
const license = await download('license.txt');
await Promise.all([download('scene.bin'), ...original.images.map(image => download(image.uri))]);
await writeFile(join(outputDirectory, 'F1-CAR-LICENSE.txt'), license);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});
const document = await io.read(join(sourceDirectory, 'scene.gltf'));
const scene = document.getRoot().getDefaultScene();
const nodes = document.getRoot().listNodes().filter(node => node.getMesh());
for (const node of nodes) {
  for (const primitive of node.getMesh().listPrimitives()) transformPrimitive(primitive, node.getWorldMatrix());
}
const detail = document.createNode('detail');
const wheelParts = new Set(['tyres', 'rims', 'brake']);
const wheelNames = ['wheel_front_left', 'wheel_front_right', 'wheel_rear_left', 'wheel_rear_right'];
const quadrant = (x, z) => (z > 0 ? 0 : 2) + (x > 0 ? 1 : 0);
const wheelBounds = wheelNames.map(() => ({ min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }));
for (const node of nodes) {
  for (const primitive of node.getMesh().listPrimitives()) {
    if (primitive.getMaterial().getName() !== 'tyres') continue;
    const positions = primitive.getAttribute('POSITION').getArray();
    for (let i = 0; i < positions.length; i += 3) {
      const bounds = wheelBounds[quadrant(positions[i], positions[i + 2])];
      for (let axis = 0; axis < 3; axis++) {
        bounds.min[axis] = Math.min(bounds.min[axis], positions[i + axis]);
        bounds.max[axis] = Math.max(bounds.max[axis], positions[i + axis]);
      }
    }
  }
}
const wheels = wheelBounds.map((bounds, i) => {
  const center = bounds.min.map((value, axis) => (value + bounds.max[axis]) / 2);
  const radius = (bounds.max[1] - bounds.min[1]) / 2;
  if (!center.every(Number.isFinite) || !(radius > 0)) throw new Error(`Missing wheel geometry: ${wheelNames[i]}`);
  const wheel = document.createNode(wheelNames[i]).setTranslation(center).setExtras({ radius, spinAxis: 'x' });
  detail.addChild(wheel);
  return wheel;
});
for (const node of nodes) {
  for (const primitive of node.getMesh().listPrimitives()) {
    const name = primitive.getMaterial().getName();
    if (!wheelParts.has(name)) {
      detail.addChild(document.createNode(node.getName()).setMesh(document.createMesh(node.getName()).addPrimitive(primitive)));
      continue;
    }
    const positions = primitive.getAttribute('POSITION').getArray();
    const indices = primitive.getIndices().getArray();
    const partitions = wheels.map(() => []);
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
      const part = quadrant(positions[a] + positions[b] + positions[c], positions[a + 2] + positions[b + 2] + positions[c + 2]);
      partitions[part].push(indices[i], indices[i + 1], indices[i + 2]);
    }
    partitions.forEach((indices, i) => {
      if (!indices.length) return;
      const split = primitive.clone().setIndices(document.createAccessor().setType('SCALAR')
        .setBuffer(document.getRoot().listBuffers()[0]).setArray(new Uint32Array(indices)));
      compactPrimitive(split);
      const [x, y, z] = wheels[i].getTranslation();
      transformPrimitive(split, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -x, -y, -z, 1]);
      const mesh = document.createMesh(`${wheelNames[i]}_${name}`).addPrimitive(split);
      wheels[i].addChild(document.createNode(mesh.getName()).setMesh(mesh));
    });
  }
}
for (const node of [...scene.listChildren()]) scene.removeChild(node);
scene.addChild(detail);
for (const node of document.getRoot().listNodes()) {
  if (node === detail || node.listParents().some(parent => parent.propertyType === 'Node' || parent.propertyType === 'Scene')) continue;
  node.dispose();
}
for (const material of document.getRoot().listMaterials()) {
  const name = material.getName();
  if (name.startsWith('Livery') || name.startsWith('UV_map')) {
    material.setBaseColorTexture(null).setBaseColorFactor([1, 1, 1, 1]);
    material.setExtras({ role: name.includes('blue') ? 'paint-secondary' : name.includes('white') || name.startsWith('UV_map') ? 'paint-trim' : 'paint-primary' });
  }
}
await document.transform(prune(), weld(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 88 }));
const overview = cloneDocument(document);
overview.getRoot().getDefaultScene().listChildren()[0].setName('overview');
await document.transform(simplify({ simplifier: MeshoptSimplifier, ratio: .3, error: .003 }));
await overview.transform(simplify({ simplifier: MeshoptSimplifier, ratio: .035, error: .018 }));
function triangles(doc) {
  return doc.getRoot().listMeshes().reduce((sum, mesh) => sum + mesh.listPrimitives().reduce((count, primitive) => count + primitive.getIndices().getCount() / 3, 0), 0);
}
const levels = { detail: triangles(document), overview: triangles(overview) };
const mapping = mergeDocuments(document, overview);
const overviewScene = mapping.get(overview.getRoot().getDefaultScene());
for (const node of overviewScene.listChildren()) scene.addChild(node);
overviewScene.dispose();
await document.transform(dedup(), prune(), unpartition(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
const output = join(outputDirectory, 'formula-car.glb');
await io.write(output, document);
const bytes = await readFile(output);
const metadata = {
  author: 'TheoDev', asset: 'F1 Generic 2022', source: original.asset.extras.source,
  mirror: `https://github.com/diazandez/threejs-F1-2022-models/tree/${commit}/f1_generic_2022`,
  sourceCommit: commit, license: 'CC-BY-4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  attribution: 'F1 Generic 2022 by TheoDev, licensed under CC BY 4.0. Adapted with team colours, wheel pivots, texture compression and levels of detail.',
  changes: ['Split tyres, rims and brake geometry into four rotating wheel pivots', 'Prepared neutral body paint for team recolouring', 'Generated close-view and distant-view geometry', 'Resized textures to at most 1024px and converted to WebP', 'Applied Meshopt geometry compression'],
  triangles: levels, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
  wheelPivots: wheels.map(wheel => ({ name: wheel.getName(), position: wheel.getTranslation(), ...wheel.getExtras() })),
  sourceFiles: sources.sort((a, b) => a.path.localeCompare(b.path)),
};
await writeFile(join(outputDirectory, 'formula-car-source.json'), JSON.stringify(metadata, null, 2) + '\n');
console.log(JSON.stringify({ output, bytes: bytes.length, triangles: levels, sha256: metadata.sha256 }, null, 2));
