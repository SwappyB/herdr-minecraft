# Herdr, Minecraft edition

`layouts/minecraft.json` + `themes/minecraft.json` + this mod + two reskinned
clones of the shipped lists: `mc-worlds` (spaces) and `mc-mobs` (agents).

- Roles (`main.js`): brand, footer, pane (plank sign header), scene (the
  cats' world, `pets.js`, with the HUD over it, `hud.js`: F3 lines, hearts /
  hunger / XP, hotbar = tabs), advancement (floating toast).
- The world: night while the system is in dark mode; weather rolls every
  ~5 min (clear / rain / thunder / snow; thunder sends the cats into their
  hut); a 5-minute trip to the Nether or the End about once an hour.
  `herdr-app do mc.weather` / `mc.dimension` skip ahead.
- Portals: a nether portal in the Overworld and the Nether (click to travel;
  on scheduled trips the cats walk through it); the End has an exit portal.
- Mobs (`mobs.js`): at most two, spawning every ~15 s by chance and leaving
  after 1-2 min. Overworld day: chicken, pig, sheep; night or thunder:
  zombie, creeper (keeps away from the cats); Nether: zombified piglin,
  ghast; End: enderman (teleports). Hover: name; click: poof and XP.
- Pets: Poplu (tuxedo) and Lizzy (white). Hover: name tag; click: meow.
- Art: `python3 mods/mc/art/generate.py` redraws icons/ and img/ (Pillow).
  All original pixel art; no Mojang assets.
- Font: Monocraft (SIL OFL 1.1, fonts/LICENSE-Monocraft.txt).
- Sounds (synthesized with ffmpeg): levelup.mp3 and hiss.mp3 are set as
  settings.json's done/blocked sounds; xp.mp3 plays when an agent finishes
  while you're looking; click.mp3 on buttons and hotbar slots.
- Hearts: -2 per agent that needs you. Hunger: -1 per working agent.
  Level: agents finished (shared "mc.level"). XP bar: share of idle agents.
