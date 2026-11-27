# Changelog

## 4.0.0-dev.1 — Foundry V14 revival

- Replaced the removed `FormApplication`/WFRP module initializer with the native V2 Adventure importer. Opening it does not change the world; completion is recorded only after a successful import.
- Migrated four legacy NeDB compendiums into a single LevelDB Adventure. Preserved original document IDs, NPC statistics, maps, walls, journal prose, audio and typed folder hierarchy.
- Migrated scene backgrounds to V14 levels, journal entries to pages, map notes to page references, and name-based journal links to stable UUIDs.
- Updated Armour, Fear and Arboreal effects for WFRP 10.1.2. Removed eight actor-side copies of transferred item effects to avoid applying them twice.
- Removed obsolete module dependencies and dead world-specific thumbnails; replaced unavailable icons with Foundry icons. Original maps and tokens are unchanged.
- Removed the remote PHP initialization request. Added readable pack sources, build and validation tools, tests, and a standalone archive builder.

This is a development build. Native server schema validation and automated checks pass; a full browser import and play-through with WFRP client models remain to be tested.
