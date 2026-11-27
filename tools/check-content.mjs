import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MODULE_ID, ADVENTURE_ID } from './content-migration.mjs';
export const root = fileURLToPath(new URL('../', import.meta.url));
export const adventure = JSON.parse(fs.readFileSync(new URL('../pack-source/night-of-blood.json', import.meta.url)));
export function checkContent(a = adventure) {
  assert.equal(a._id, ADVENTURE_ID);
  const types = { actors: 'Actor', scenes: 'Scene', journal: 'JournalEntry', playlists: 'Playlist' };
  const folders = new Map(a.folders.map(f => [f._id, f]));
  assert.equal(folders.size, a.folders.length);
  for (const f of a.folders) {
    const visited = new Set([f._id]);
    for (let parent = f.folder; parent;) {
      assert(!visited.has(parent), `Folder cycle: ${f.name}`); visited.add(parent);
      assert.equal(folders.get(parent)?.type, f.type, `Invalid parent: ${f.name}`);
      parent = folders.get(parent).folder;
    }
  }
  const uuids = new Set();
  for (const [collection, type] of Object.entries(types)) {
    const ids = new Set();
    for (const doc of a[collection]) {
      assert(/^[A-Za-z0-9]{16}$/.test(doc._id), `Invalid ID: ${doc.name}`);
      assert(!ids.has(doc._id), `Duplicate ID: ${doc.name}`); ids.add(doc._id);
      uuids.add(`${type}.${doc._id}`);
      assert.equal(folders.get(doc.folder)?.type, type, `Unfiled ${type}: ${doc.name}`);
      assert.deepEqual(doc.ownership, { default: 0 });
    }
  }
  for (const scene of a.scenes) {
    assert.equal(scene.active, false);
    assert(scene.levels.length && scene.levels.some(l => l._id === scene.initialLevel));
    for (const note of scene.notes) {
      const journal = a.journal.find(j => j._id === note.entryId);
      assert(journal?.pages.some(p => p._id === note.pageId), `Broken note on ${scene.name}`);
    }
    for (const token of scene.tokens) assert(a.actors.some(x => x._id === token.actorId));
  }
  let assetCount = 0, links = 0;
  const scan = value => {
    if (typeof value === 'string') {
      assert(!/@(?:Actor|JournalEntry|Scene|Compendium)\[/.test(value), `Legacy link: ${value.slice(0, 100)}`);
      for (const [, id] of value.matchAll(/@UUID\[([^\]]+)\]/g)) {
        if (!id.startsWith('Compendium.')) assert(uuids.has(id), `Missing UUID: ${id}`);
        else assert(/^Compendium\.wfrp4e-core\.(items\.Item\.[A-Za-z0-9]{16}|journals\.JournalEntry\.[A-Za-z0-9]{16}\.JournalEntryPage\.[A-Za-z0-9]{16})$/.test(id));
        links++;
      }
      if (value.startsWith(`modules/${MODULE_ID}/`)) {
        const local = value.slice(`modules/${MODULE_ID}/`.length);
        assert(!local.split('/').includes('..'));
        assert(fs.existsSync(root + local), `Missing asset: ${local}`); assetCount++;
      }
      assert(!value.startsWith('worlds/'), `World-specific asset: ${value}`);
      assert(!value.startsWith('modules/wfrp4e-core/'), `Premium icon dependency: ${value}`);
    } else if (value && typeof value === 'object') {
      assert(!value.permission, 'Legacy permission field');
      assert(!value.flags?.wfrp4e?.script, 'Legacy effect script');
      Object.values(value).forEach(scan);
    }
  };
  scan(a);
  return { actors: a.actors.length, scenes: a.scenes.length, journals: a.journal.length, playlists: a.playlists.length, folders: a.folders.length, assetReferences: assetCount, uuidLinks: links };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(checkContent(), null, 2));
