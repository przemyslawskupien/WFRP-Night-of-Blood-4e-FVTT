# Night of Blood — Foundry V14 revival

Development build **4.0.0-dev.1**, prepared for **Foundry VTT 14.370** and **WFRP4e 10.1.2**. This fork remains an unofficial conversion of Jim Bambra's adventure, originally converted to Foundry by Stuart Kerrigan.

## Install and import

1. In Foundry Setup → Add-on Modules → Install Module, paste this manifest URL:

   `https://raw.githubusercontent.com/przemyslawskupien/WFRP-Night-of-Blood-4e-FVTT/codex/foundry-v14-revival/module.json`
2. Enable **Night of Blood (WFRP 4e)** in a WFRP4e world.
3. As GM, select the content in Foundry's **Import Adventure** window and import it. You can reopen the window from module settings → **Night of Blood → Import adventure**, or from the Night of Blood adventure compendium.

The importer contains **13 actors, 5 scenes, 17 journal entries, 3 playlists and 12 folders**. Each document category has its own Night of Blood folder; journal subfolders are retained. Map notes open the corresponding journal pages. Simply opening or closing the importer changes no world documents. Reimporting the adventure may overwrite documents with the same original IDs: use a test world for the first import and back up an existing campaign before replacing its content.

The original free [Night of Blood PDF](https://www.drivethrurpg.com/product/259967/WFRP-Old-World-Adventures--Night-of-Blood) is required to run the scenario. Three optional rules links target the current WFRP Core module; its paid content is not included. Core is not required to load the supplied maps, actors, journals or audio.

## What changed and what to check

The old Foundry 0.9 exports now use V14 scenes and journal pages in a native Adventure/LevelDB compendium. The removed WFRP initializer, its remote PHP request and the dependencies on Levels, Better Roofs, Wall Height, Token Attacher, Ambient Doors, Token Magic and LibWrapper have been removed. Floors are separate scenes, as in the source. Standard walls, lights, tiles, doors and ambient sounds remain; old third-party shader/roof behavior is not recreated.

NPC statistics and equipment are preserved from the original exports. Several original NPCs have very sparse sheets; this update does not invent missing stat blocks. Armour, Fear and Arboreal use current WFRP effect scripts. Maps and token artwork have not been rescaled or redrawn. Foundry rounds old fractional map coordinates to integer pixels during migration (less than one pixel).

**Validation:** all packaged assets, document references, folder relationships and map note targets are checked; native Foundry 14 server schemas accept the manifest, Adventure and its documents. Automated tests exercise importer hooks and the three effect scripts. The LevelDB build is extracted and compared with the complete source JSON. A browser import, WFRP client preparation, lighting/roof appearance and a session play-through are still pending. This is a development build, not a claim of complete play testing.

## Develop

Use a current Node.js release (22.12+ recommended) and Python 3 for the optional archive builder. No Node packages are loaded by the module at runtime.

```sh
npm ci
npm test
npm run check
npm run build
python3 tools/package.py
```

`pack-source/night-of-blood.json` is the readable Adventure source. Commit the rebuilt `packs/night-of-blood` database together with source changes. The official Foundry CLI is used through its programmatic pack API; the build verifies a full LevelDB round trip. The ZIP in `dist/` contains only runtime files, assets, documentation and the pack.

Original 3.0 exports are retained under `legacy/` for comparison. To regenerate the source, use your own installed Foundry 14.370 and WFRP4e 10.1.2 on the same machine:

```sh
node tools/migrate-legacy.mjs /path/to/foundry/app /path/to/Data/systems/wfrp4e
node tools/validate-native.mjs /path/to/foundry/app /path/to/Data/systems/wfrp4e
npm test
npm run build
```

These tools load server-side models without opening world databases or starting a Foundry server. They do not execute WFRP's browser data preparation. Foundry and WFRP source files are not redistributed in this repository.

## Credits and licence

Scenario: **Jim Bambra**. Original Foundry conversion: **Stuart Kerrigan / Perilous Realm**. Compatibility maintenance: **Przemysław Skupień**. Original map attribution: [Acrobata2000](http://acrobata2000.blogspot.com/) and Pinterest, as recorded by the original module. Audio includes the storm, tavern voices and other soundscapes from the original repository; token artwork and all assets retain their original provenance.

The original [MIT licence](LICENSE), including its copyright notice, is retained. This maintenance work does not change or expand rights to third-party Warhammer content or artwork.

# Want to support us?
			
This module is freeware, and always will be, and other free unofficial WFRP modules are planned. As the WFRP content now requires payment to Cubicle 7 there are some running costs so if you want to donate then the link below is provided.
			
<p align="center">
<a href="https://paypal.me/perilousrealm?locale.x=en_GB"><img src="https://raw.githubusercontent.com/CStuartEKerrigan/WFRP-Night-of-Blood-4e-FVTT/master/paypal.png" style="display: block;  margin-left: auto; margin-right: auto;" alt="paypal" /></a></p>

You can also listen to the <a href="https://anchor.fm/peril">Perilous Realm Podcast</a><br/><br/>
<p align="center">
<a href="https://anchor.fm/peril"><img src="https://raw.githubusercontent.com/CStuartEKerrigan/WFRP-Night-of-Blood-4e-FVTT/master/peril.png" style="display: block;  margin-left: auto;  margin-right: auto;" alt="peril logo"></a></p>

Lastly do share with us at <a href="mailto:perilousrealmpodcast@gmail.com">perilousrealmpodcast@gmail.com</a> any streams or audio you have of your adventures in the Hooded Man Inn - if anyone is left to tell the tale.