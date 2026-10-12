import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const [bucket, prefix = 'sg-grand-prix/portraits/2026-v2', publicUrl] = process.argv.slice(2);
if (!bucket || !publicUrl || !/^[a-z0-9-]+$/.test(bucket) || !/^[\w/-]+$/.test(prefix)) {
  throw new Error('Usage: node scripts/upload-driver-portraits.js BUCKET PREFIX PUBLIC_BUCKET_URL');
}
const base = new URL(publicUrl);
if (base.protocol !== 'https:') throw new Error('Use the public HTTPS R2 bucket URL.');
const source = JSON.parse(readFileSync(new URL('../public/data/driver-portrait-sources.json', import.meta.url), 'utf8'));
for (const portrait of source.portraits) {
  const path = fileURLToPath(new URL(`../assets/driver-portraits/${portrait.file}`, import.meta.url));
  const result = spawnSync('npx', [
    'wrangler', 'r2', 'object', 'put', `${bucket}/${prefix}/${portrait.file}`,
    '--file', path, '--remote', '--content-type', 'image/png',
    '--cache-control', 'public, max-age=31536000, immutable',
  ], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Upload failed for ${portrait.code}`);
}
console.log(`Portrait base URL: ${base.href.replace(/\/$/, '')}/${prefix}`);
