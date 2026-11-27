import fs from 'node:fs';
import { legacySource } from './legacy-source.mjs';
import { prepareLegacy, createAdventure } from './content-migration.mjs';
import { nativeModels } from './native-models.mjs';
const [app, systemDir] = process.argv.slice(2);
if (!app || !systemDir) throw new Error('Usage: node tools/migrate-legacy.mjs /path/to/foundry/app /path/to/Data/systems/wfrp4e');
const db = await nativeModels(app, systemDir);
const data = prepareLegacy(legacySource());
for (const [collection, type] of Object.entries({ actors: 'Actor', scenes: 'Scene', journal: 'JournalEntry', playlists: 'Playlist', folders: 'Folder' })) {
  data[collection] = data[collection].map(raw => {
    const model = db[type].fromImport(foundry.utils.deepClone(raw), { dropInvalidEmbedded: false });
    model.validate({ strict: true });
    return model.toObject();
  });
}
fs.mkdirSync(new URL('../pack-source/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../pack-source/night-of-blood.json', import.meta.url), JSON.stringify(createAdventure(data), null, 2) + '\n');
console.log('Legacy exports migrated with native Foundry models.');
