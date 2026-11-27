import fs from 'node:fs';
import { nativeModels } from './native-models.mjs';
const [app, systemDir] = process.argv.slice(2);
if (!app || !systemDir) throw new Error('Usage: node tools/validate-native.mjs /path/to/foundry/app /path/to/Data/systems/wfrp4e');
const db = await nativeModels(app, systemDir);
const raw = JSON.parse(fs.readFileSync(new URL('../pack-source/night-of-blood.json', import.meta.url)));
const manifest = JSON.parse(fs.readFileSync(new URL('../module.json', import.meta.url)));
const module = new foundry.packages.BaseModule(manifest, { strict: true });
module.validate({ strict: true });
const adventure = db.Adventure.fromImport(foundry.utils.deepClone(raw), { dropInvalidEmbedded: false });
adventure.validate({ strict: true });
const counts = {};
for (const [collection, type] of Object.entries({ actors: 'Actor', scenes: 'Scene', journal: 'JournalEntry', playlists: 'Playlist', folders: 'Folder' })) {
  for (const data of raw[collection]) {
    const model = db[type].fromImport(foundry.utils.deepClone(data), { dropInvalidEmbedded: false });
    model.validate({ strict: true });
    if (model.invalid) throw new Error(`Invalid ${type}: ${data.name}`);
  }
  counts[collection] = raw[collection].length;
}
console.log(JSON.stringify({ manifest: !module.invalid, adventure: !adventure.invalid, counts,
  scope: 'Foundry server-side schemas; does not execute the WFRP client data models or import into a world.' }, null, 2));
