import { createHash } from 'node:crypto';

export const MODULE_ID = 'wfrp4e-night-of-blood';
export const ADVENTURE_ID = 'NightOfBlood0001';
export const PLAYLIST_FOLDER = 'nobPlaylistsRoot';
export const stableId = (value) => createHash('sha256').update(value).digest('hex').slice(0, 16);
const oldFlags = new Set(['deprecated', 'levels', 'betterroofs', 'wall-height', 'wallHeight', 'token-attacher', 'tokenmagic', 'fxmaster', 'exportSource']);
const icons = { trait: 'aura', money: 'coins', weapon: 'sword', armour: 'shield', trapping: 'item-bag' };
const noteIcons = { 'inn1.png': 'house', 'chaos_worship.png': 'temple', 'roads.png': 'stone-path', 'blacksmith.png': 'sword', 'ruins.png': 'ruins', 'point_of_interest.png': 'book' };

export const effectScripts = {
  Armour: {
    trigger: 'APCalc',
    script: `const rating = Number.parseInt(this.item.system.specification.value, 10);
const damage = this.item.getFlag('wfrp4e', 'APdamage') || {};
if (Number.isFinite(rating)) {
  for (const location of ['head', 'rArm', 'lArm', 'body', 'lLeg', 'rLeg']) {
    args.AP[location].value += Math.max(0, rating - (damage[location] || 0));
  }
}`,
  },
  Fear: {
    trigger: 'manual',
    script: `const rating = Number.parseInt(this.item.system.specification.value, 10) || 0;
const name = this.actor.prototypeToken?.name || this.actor.name;
if (game.user.isGM && game.user.targets.size) {
  for (const target of game.user.targets) {
    if (target.actor) await target.actor.applyFear(rating, name);
  }
  await game.user.updateTokenTargets([]);
} else {
  await CONFIG.ChatMessage.dataModels.psych.createFearMessage(rating, name);
}`,
    async: true,
  },
  Arboreal: {
    trigger: 'dialog',
    script: `const name = args.skill?.name || '';
if (name === 'Climb' || name.startsWith('Stealth')) {
  args.fields.slBonus += this.actor.system.characteristics.ag.bonus;
}`,
    options: {
      activateScript: "const name = args.skill?.name || ''; return name === 'Climb' || name.startsWith('Stealth');",
      hideScript: "const name = args.skill?.name || ''; return name !== 'Climb' && !name.startsWith('Stealth');",
      showDuplicates: false,
    },
  },
};

function walk(value, fn) {
  if (!value || typeof value !== 'object') return;
  fn(value);
  for (const item of Object.values(value)) {
    if (Array.isArray(item)) item.forEach((v) => walk(v, fn));
    else walk(item, fn);
  }
}

/** Pre-clean legacy exports before Foundry's own schema migration. */
export function prepareLegacy(input) {
  const data = structuredClone(input);
  const roots = new Map(data.folders.filter((f) => !f.parent).map((f) => [f.type, f._id]));
  for (const folder of data.folders) {
    folder.folder = folder.parent || null;
    delete folder.parent;
  }
  data.folders.push({ _id: PLAYLIST_FOLDER, name: 'Night of Blood', type: 'Playlist', folder: null, sorting: 'a', color: '#ff0000' });
  roots.set('Playlist', PLAYLIST_FOLDER);
  for (const [collection, type] of Object.entries({ actors: 'Actor', scenes: 'Scene', journal: 'JournalEntry', playlists: 'Playlist' })) {
    for (const doc of data[collection]) {
      doc.folder ||= roots.get(type);
      doc.ownership = { default: 0 };
      delete doc.permission;
      doc.flags ||= {};
      doc.flags[MODULE_ID] = { sourceId: doc._id };
      if (type === 'Scene') {
        doc.thumb = null;
        doc.active = false;
      }
      if (type === 'Playlist') {
        doc.playing = false;
        for (const sound of doc.sounds) sound.playing = false;
      }
      if (type === 'Actor') {
        // Old Foundry copied transferred item effects onto the actor. Modern
        // Warhammer applies the item effect directly, so keeping both doubles it.
        doc.effects = (doc.effects || []).filter(effect => {
          const source = doc.items.some(item => (item.effects || []).some(candidate =>
            (effect.origin === `Actor.${doc._id}.Item.${item._id}` || effect._id === candidate._id)
            && (effect.label || effect.name) === (candidate.label || candidate.name)
            && effect.flags?.wfrp4e?.script === candidate.flags?.wfrp4e?.script));
          if (!source && effect.flags?.wfrp4e?.script) throw new Error(`Unmapped actor effect: ${doc.name}`);
          return !source;
        });
        for (const [index, item] of doc.items.entries()) {
          item._id ||= stableId(`${doc._id}:item:${index}:${item.name}`);
          if (item.img?.startsWith('modules/wfrp4e-core/') || item.img?.endsWith('/blank.png')) {
            item.img = `icons/svg/${icons[item.type] || 'item-bag'}.svg`;
          }
          for (const [n, effect] of (item.effects || []).entries()) {
            effect._id ||= stableId(`${item._id}:effect:${n}`);
            const migrated = effectScripts[effect.name || effect.label];
            if (effect.flags?.wfrp4e?.script && !migrated) throw new Error(`Unmapped legacy script: ${item.name}`);
            if (migrated) {
              effect.system = {
                transferData: { type: 'document', documentType: 'Actor', equipTransfer: false },
                scriptData: [{ label: effect.name || effect.label, ...structuredClone(migrated) }],
              };
              delete effect.flags.wfrp4e;
              effect.transfer = false; // Warhammer uses system.transferData, not core legacy transferral.
            }
            if (effect.icon?.startsWith('modules/wfrp4e-core/')) effect.icon = 'icons/svg/aura.svg';
          }
        }
      }
    }
  }
  walk(data, (value) => {
    if (value.flags) {
      for (const key of Object.keys(value.flags)) if (oldFlags.has(key)) delete value.flags[key];
      delete value.flags.core?.sourceId;
    }
    if (value.permission) { delete value.permission; value.ownership = { default: 0 }; }
    if (value.icon?.startsWith('systems/wfrp4e/icons/buildings/')) {
      value.icon = `icons/svg/${noteIcons[value.icon.split('/').at(-1)] || 'book'}.svg`;
    }
    if (value.icon?.startsWith('modules/wfrp4e-core/')) value.icon = 'icons/svg/aura.svg';
  });
  return data;
}

/** Finish deterministic identifiers and durable world UUID links after migration. */
export function createAdventure(migrated) {
  const data = structuredClone(migrated);
  const byName = Object.fromEntries(['actors', 'journal', 'scenes'].map((key) => [key, new Map(data[key].map((d) => [d.name, d._id]))]));
  for (const journal of data.journal) {
    for (const [index, page] of journal.pages.entries()) {
      page._id = stableId(`${journal._id}:page:${page.type}:${index}`);
      if (page.text?.content) {
        page.text.content = page.text.content.replace(/@(Actor|JournalEntry|Scene)\[([^\]]+)\](?:\{([^}]+)\})?/g, (_, type, name, label) => {
          const key = { Actor: 'actors', JournalEntry: 'journal', Scene: 'scenes' }[type];
          const id = byName[key].get(name);
          if (!id) throw new Error(`Unresolved ${type} link: ${name}`);
          return `@UUID[${type}.${id}]{${label || name}}`;
        }).replace(/@Compendium\[wfrp4e-core\.(talents|skills)\.([A-Za-z0-9]+)\]/g, '@UUID[Compendium.wfrp4e-core.items.Item.$2]')
          .replace(/@Compendium\[wfrp4e-core\.journal-entries\.u7IJ1xm4pO5s9QgS\]/g,
            '@UUID[Compendium.wfrp4e-core.journals.JournalEntry.NS3YGlJQxwTggjRX.JournalEntryPage.115GzWrmkD4viyy5]');
      }
    }
  }
  const journalPages = new Map(data.journal.map((j) => [j._id, j.pages.find((p) => p.type === 'text')?._id]));
  for (const scene of data.scenes) {
    for (const note of scene.notes) {
      if (!journalPages.has(note.entryId)) throw new Error(`Unresolved map note: ${note.entryId}`);
      note.pageId = journalPages.get(note.entryId);
    }
  }
  walk(data, (value) => {
    if (value._stats) {
      value._stats = { coreVersion: '14.370', systemId: 'wfrp4e', systemVersion: '10.1.2' };
    }
    if (value.ownership) value.ownership = { default: 0 };
  });
  return {
    _key: `!adventures!${ADVENTURE_ID}`,
    _id: ADVENTURE_ID,
    name: 'Night of Blood',
    img: `modules/${MODULE_ID}/assets/maps/hooded-man-high-res.webp`,
    caption: 'The Hooded Man Inn awaits. A classic Warhammer Fantasy Roleplay adventure.',
    description: '<p>Night of Blood by Jim Bambra. Unofficial Foundry conversion by Stuart Kerrigan; compatibility revival for Foundry V14.</p><p>Includes 13 actors, 5 scenes, 17 journal entries and 3 playlists. Choose the content types below and import. Re-importing may overwrite previously imported adventure documents.</p><p>The original free adventure PDF is still required. Original NPC statistics are preserved; some original NPCs are only minimally developed.</p>',
    cards: [], combats: [], items: [], macros: [], tables: [],
    ...Object.fromEntries(['actors', 'scenes', 'journal', 'playlists', 'folders'].map((key) => [key, data[key]])),
    flags: { [MODULE_ID]: { version: '4.0.0-dev.1' } },
  };
}
