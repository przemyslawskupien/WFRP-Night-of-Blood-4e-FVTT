const MODULE_ID = 'wfrp4e-night-of-blood';
const PACK_ID = `${MODULE_ID}.adventure`;
const ADVENTURE_ID = 'NightOfBlood0001';
let opening;

/** Show Foundry's importer. Rendering this sheet does not import any documents. */
export async function openAdventureImporter() {
  if (!game.user?.isGM) {
    ui.notifications.warn('Only the GM can import Night of Blood.');
    return;
  }
  if (opening) return opening;
  opening = (async () => {
    try {
      const pack = game.packs.get(PACK_ID);
      if (!pack) throw new Error('The Night of Blood adventure compendium is missing. Reinstall the complete module archive.');
      const adventure = await pack.getDocument(ADVENTURE_ID);
      if (!adventure) throw new Error('The Night of Blood adventure could not be loaded.');
      return await new foundry.applications.sheets.AdventureImporterV2({ document: adventure }).render({ force: true });
    } catch (error) {
      console.error('Night of Blood | Could not open the adventure importer', error);
      ui.notifications.error(error.message);
    }
  })().finally(() => { opening = undefined; });
  return opening;
}

Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'initialized', {
    name: 'Adventure imported', scope: 'world', config: false, default: false, type: Boolean,
  });
  class ImportAdventureMenu extends foundry.applications.api.ApplicationV2 {
    async render() { await openAdventureImporter(); return this; }
  }
  game.settings.registerMenu(MODULE_ID, 'init-dialog', {
    name: 'Night of Blood', label: 'Import adventure',
    hint: 'Open Foundry’s adventure importer to select content. Existing adventure content may be overwritten on re-import.',
    icon: 'fas fa-book-open', type: ImportAdventureMenu, restricted: true,
  });
  game.modules.get(MODULE_ID).api = Object.freeze({ openImporter: openAdventureImporter });
});

Hooks.once('ready', async () => {
  if (game.user?.isGM && !game.settings.get(MODULE_ID, 'initialized')) await openAdventureImporter();
});

Hooks.on('importAdventure', async (adventure) => {
  if (game.user?.isGM && adventure.pack === PACK_ID && adventure.id === ADVENTURE_ID) {
    await game.settings.set(MODULE_ID, 'initialized', true);
  }
});
