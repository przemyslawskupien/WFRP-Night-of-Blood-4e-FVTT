import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Bootstrap only Foundry's server-side models. No world DB is opened. */
export async function nativeModels(app, systemDir) {
  await import(pathToFileURL(path.join(app, 'common/server.mjs')));
  globalThis.paths = { root: app, data: path.resolve(systemDir, '../..'), config: '/tmp', logs: '/tmp' };
  globalThis.logger = { info() {}, debug() {}, warn() {}, error: console.error };
  const manifest = JSON.parse(fs.readFileSync(path.join(systemDir, 'system.json')));
  globalThis.release = { version: '14.370', generation: 14, build: 370 };
  globalThis.game = { system: manifest, world: { id: 'night-of-blood-validation' }, model: {}, documentTypes: {}, modules: new Map(), users: [] };
  globalThis.config = { options: {} };
  const db = await import(pathToFileURL(path.join(app, 'dist/database/database.mjs')));
  globalThis.getDocumentClass = db.getDocumentClass;
  game.packs = db.packs;
  for (const cls of Object.values(db)) {
    if (typeof cls !== 'function' || !cls.documentName) continue;
    const types = [...new Set([...(cls.metadata.coreTypes || []), ...Object.keys(manifest.documentTypes?.[cls.documentName] || {})])];
    game.documentTypes[cls.documentName] = types;
    game.model[cls.documentName] = Object.fromEntries(types.map(type => [type, {}]));
    cls._db = { sublevels: {} };
  }
  return db;
}
