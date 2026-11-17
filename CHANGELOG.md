# Changelog

Player-facing changes in each Hyrule Tracker version. Every published version needs a `## [version]` section here:
`scripts/ensure-release.mjs` uses it as the GitHub release text, and the in-app updater shows it before the player decides to update.
Format: `New`, `Improved`, `Fixed`, `Known` (open issue).

## [1.0.0] - 2026-11-16

### New
- **First public release.** Live save tracking for the Ocarina of Time remake on Nintendo Switch 2, with checklist, Hyrule map, minigames, Hall of Enemies, daily log, rumor quests and daily quiz.
- **Windows installer.** Hyrule Tracker now ships as a regular `.exe` installer instead of a portable executable.
- **Automatic update check.** The app looks for new versions on GitHub, shows what changed and only downloads after you confirm.
- **PT, EN and ES.** The whole interface is available in Portuguese, English and Spanish.
- **In-game overlay** with counters, remaining objectives and what is available now.
- **Manual save folder.** If the save is not found automatically, pick the folder yourself with **Choose folder**.

### Known
- The two amiibo masks (Young Link and Young Zelda) are detected from best-guess save flags and may need manual marking.
- The installer is not code-signed yet, so Windows SmartScreen may warn on first install.
