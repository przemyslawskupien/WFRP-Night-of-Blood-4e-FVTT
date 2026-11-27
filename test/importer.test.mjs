import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../init.js', import.meta.url), 'utf8');
const id = 'wfrp4e-night-of-blood', pack = `${id}.adventure`;
let counter = 0;
async function fixture({ gm = true, initialized = false, missing = false } = {}) {
  const hooks = new Map(), calls = { renders: [], settings: [], warnings: [], errors: [] };
  const adventure = { id: 'NightOfBlood0001', pack };
  globalThis.Hooks = { once: (name, fn) => hooks.set(name, fn), on: (name, fn) => hooks.set(name, fn) };
  globalThis.ui = { notifications: { warn: text => calls.warnings.push(text), error: text => calls.errors.push(text) } };
  globalThis.foundry = { applications: {
    api: { ApplicationV2: class {} },
    sheets: { AdventureImporterV2: class { constructor(options) { this.document = options.document; } async render(options) { calls.renders.push({ document: this.document, options }); return this; } } },
  } };
  globalThis.game = {
    user: { isGM: gm }, packs: new Map(missing ? [] : [[pack, { getDocument: async () => adventure }]]),
    modules: new Map([[id, {}]]),
    settings: { register() {}, registerMenu: (module, key, options) => { calls.menu = options; }, get: () => initialized, set: async (...args) => calls.settings.push(args) },
  };
  const api = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${counter++}`);
  hooks.get('init')();
  return { api, hooks, calls, adventure };
}
test('GM sees native V2 importer; rendering and cancel do not mark imported', async () => {
  const f = await fixture(); await f.hooks.get('ready')();
  assert.equal(f.calls.renders.length, 1);
  assert.equal(f.calls.renders[0].document, f.adventure);
  assert.deepEqual(f.calls.renders[0].options, { force: true });
  assert.deepEqual(f.calls.settings, []);
  assert.equal(f.calls.menu.restricted, true);
  await new f.calls.menu.type().render(); assert.equal(f.calls.renders.length, 2);
});
test('only successful import of this Adventure sets initialized', async () => {
  const f = await fixture();
  await f.hooks.get('importAdventure')({ id: 'unrelated', pack });
  await f.hooks.get('importAdventure')({ id: f.adventure.id, pack: 'other.adventure' });
  assert.equal(f.calls.settings.length, 0);
  await f.hooks.get('importAdventure')(f.adventure);
  assert.deepEqual(f.calls.settings, [[id, 'initialized', true]]);
});
test('players cannot import and initialized worlds do not prompt again', async () => {
  let f = await fixture({ gm: false }); await f.hooks.get('ready')(); await f.api.openAdventureImporter();
  assert.equal(f.calls.renders.length, 0); assert.equal(f.calls.warnings.length, 1);
  f = await fixture({ initialized: true }); await f.hooks.get('ready')(); assert.equal(f.calls.renders.length, 0);
  await game.modules.get(id).api.openImporter(); assert.equal(f.calls.renders.length, 1);
});
test('concurrent requests share one importer and a missing pack can be retried', async () => {
  let f = await fixture(); await Promise.all([f.api.openAdventureImporter(), f.api.openAdventureImporter()]);
  assert.equal(f.calls.renders.length, 1);
  f = await fixture({ missing: true });
  const error = console.error; console.error = () => {};
  try { await f.api.openAdventureImporter(); } finally { console.error = error; }
  assert.equal(f.calls.errors.length, 1);
  game.packs.set(pack, { getDocument: async () => f.adventure });
  await f.api.openAdventureImporter(); assert.equal(f.calls.renders.length, 1);
});
