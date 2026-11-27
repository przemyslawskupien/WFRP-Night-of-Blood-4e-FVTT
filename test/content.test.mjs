import test from 'node:test';
import assert from 'node:assert/strict';
import { checkContent, adventure } from '../tools/check-content.mjs';
import { legacySource } from '../tools/legacy-source.mjs';
import { prepareLegacy } from '../tools/content-migration.mjs';
const old = legacySource();

test('all documents, typed folders, map note links and assets resolve', () => {
  const result = checkContent();
  assert.deepEqual([result.actors, result.scenes, result.journals, result.playlists, result.folders], [13, 5, 17, 3, 12]);
  assert(result.uuidLinks > 50);
});
test('preserves original document IDs, actor stats, item IDs and journal prose', () => {
  for (const key of ['actors', 'scenes', 'journal', 'playlists']) {
    assert.deepEqual(adventure[key].map(d => d._id), old[key].map(d => d._id));
  }
  for (const actor of old.actors) {
    const migrated = adventure.actors.find(a => a._id === actor._id);
    assert.deepEqual(migrated.system.characteristics, actor.data.characteristics);
    assert.deepEqual(migrated.items.map(i => i._id), actor.items.map(i => i._id));
  }
  const normalize = html => html.replace(/@(?:UUID|Actor|JournalEntry|Scene|Compendium)\[[^\]]+\](?:\{([^}]+)\})?/g, 'LINK');
  for (const journal of old.journal) {
    const migrated = adventure.journal.find(j => j._id === journal._id);
    if (journal.content) assert.equal(normalize(migrated.pages.find(p => p.type === 'text').text.content), normalize(journal.content));
    if (journal.img) assert(migrated.pages.some(p => p.type === 'image' && p.src === journal.img));
  }
});
test('map geometry and note positions survive native V14 migration', () => {
  for (const scene of old.scenes) {
    const migrated = adventure.scenes.find(s => s._id === scene._id);
    assert.equal(migrated.width, scene.width); assert.equal(migrated.height, scene.height);
    assert.equal(migrated.levels[0].background.src, scene.img);
    for (const key of ['walls', 'lights', 'sounds', 'tokens', 'tiles', 'notes']) assert.equal(migrated[key].length, scene[key].length);
    for (const wall of scene.walls) {
      const target = migrated.walls.find(w => w._id === wall._id);
      assert(target.c.every((coordinate, i) => Math.abs(coordinate - wall.c[i]) <= 1));
    }
    for (const note of scene.notes) {
      const target = migrated.notes.find(n => n._id === note._id);
      assert.equal(target.entryId, note.entryId);
      assert(Math.abs(target.x - note.x) <= 1 && Math.abs(target.y - note.y) <= 1);
    }
  }
});
test('removes only legacy actor copies, keeps eight current item effects', () => {
  const prepared = prepareLegacy(old);
  assert.equal(old.actors.flatMap(a => a.effects).length, 8);
  assert.equal(prepared.actors.flatMap(a => a.effects).length, 0);
  const effects = adventure.actors.flatMap(a => a.items.flatMap(i => i.effects));
  assert.equal(effects.length, 8);
  for (const effect of effects) {
    assert.equal(effect.system.scriptData.length, 1);
    assert.equal(effect.system.transferData.documentType, 'Actor');
    assert(!effect.flags.wfrp4e?.script);
  }
});
test('content checker detects missing assets, dangling notes and folder cycles', () => {
  for (const mutate of [a => { a.img += '.missing'; }, a => { a.scenes[0].notes[0].entryId = 'missing'; }, a => { a.folders[0].folder = a.folders[0]._id; }]) {
    const damaged = structuredClone(adventure); mutate(damaged);
    assert.throws(() => checkContent(damaged));
  }
});
