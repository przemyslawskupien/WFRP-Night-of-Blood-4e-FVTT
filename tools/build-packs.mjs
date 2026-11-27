import { compilePack, extractPack } from '@foundryvtt/foundryvtt-cli';
import { mkdir, rm, readFile, readdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'packs/night-of-blood');
await mkdir(path.dirname(target), { recursive: true });
await rm(target, { recursive: true, force: true });
await compilePack(path.join(root, 'pack-source'), target, { documentType: 'Adventure', log: true });
const check = await mkdtemp(path.join(os.tmpdir(), 'night-of-blood-pack-check-'));
try {
  await extractPack(target, check, { documentType: 'Adventure' });
  const files = await readdir(check);
  const actual = JSON.parse(await readFile(path.join(check, files.find((f) => f.endsWith('.json'))), 'utf8'));
  const expected = JSON.parse(await readFile(path.join(root, 'pack-source/night-of-blood.json'), 'utf8'));
  assert.deepEqual(actual, expected);
  console.log('Adventure LevelDB round-trip verified.');
} finally { await rm(check, { recursive: true, force: true }); }
