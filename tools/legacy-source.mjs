import fs from 'node:fs';
const root = new URL('../legacy/', import.meta.url);
export function legacySource() {
  const data = { folders: JSON.parse(fs.readFileSync(new URL('initialization.json', root))) };
  for (const [collection, filename] of Object.entries({ actors: 'actors', scenes: 'scenes', journal: 'journal', playlists: 'sfx' })) {
    const rows = fs.readFileSync(new URL(`night-of-blood-${filename}.db`, root), 'utf8').trim().split('\n').map(JSON.parse);
    const documents = new Map();
    for (const row of rows) {
      if (row.$$deleted) documents.delete(row._id);
      else if (row._id) documents.set(row._id, row);
    }
    data[collection] = [...documents.values()];
  }
  return data;
}
