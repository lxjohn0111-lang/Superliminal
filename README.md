# Lucid Angles

A first-person **forced-perspective puzzle game** for the browser, built for **CrazyGames** with the CrazyGames HTML5 SDK v3.

> *Things are exactly as big as they look.*

You are a volunteer at the Morrow Sleep Clinic, drifting through nine dream chapters, guided by WREN, the clinic's dry-witted rest-guidance system. Pick something up and it keeps its size *on screen*: hold it against a far wall and it becomes enormous; bring it close and it shrinks. Use that one idea to open doors, cross pools, light gardens, build staircases and, eventually, wake up.

The game drops you straight into gameplay after loading. Menus only appear when you pause (Esc) or finish the game.

## Features

- **Forced-perspective core**: held objects are pushed along your line of sight to the first surface they would touch, and rescaled so their apparent size never changes. Mass, physics colliders, sound pitch and light radius all scale with them.
- **Anamorphic illusions**: objects shattered into floating fragments that only line up from one secret viewpoint. Stand there and they become real: blocks, staircases, bridges, even the final door.
- **Nine handcrafted chapters**: Intake, Overtime, The Gallery, Nocturne, Echoes, The Deep End, The Nursery, The Long Fall, Wake. Each adds a new twist: shrinking, threading objects through a hatch, light-sensitive flowers, self-duplicating blocks, buoyancy and rafts, toy doors that become real doorways, plank bridges over the void.
- **Graphics**: PBR materials with procedurally generated albedo, normal and roughness maps; soft PCF shadows; an image-based-lighting probe baked per chapter (two bounces); N8AO ambient occlusion; bloom, AgX tone mapping, vignette, grain, chromatic aberration and SMAA. Water with animated normals, caustics on pool floors, light shafts, dust motes and fireflies. Automatic quality scaling (Low, Medium, High, Ultra).
- **Fully procedural audio**: synthesized footsteps per surface, impacts pitched by object size, a hold hum that slides with scale, convolution reverb sized per room, ambience beds, and generative ambient music per chapter.
- **Replayability**: 27 hidden paper cranes, 17 achievements, gold/silver/bronze par times per chapter, a speedrun timer, and chapter select.
- **Controls**: keyboard and mouse, touch (virtual stick, drag to look, buttons) and gamepad.

## Controls

| Action | Keyboard / mouse | Gamepad |
|---|---|---|
| Move | WASD / arrows | Left stick |
| Look | Mouse | Right stick |
| Jump | Space | A |
| Run | Shift | L3 / LT |
| Grab / drop | Left click or E | X / RT / RB |
| Rotate held object | Q, R or mouse wheel | LB / Y |
| Pause | Esc or P | Start |

## CrazyGames SDK integration

`src/engine/platform.js` wraps SDK v3, which is loaded in `index.html` from `https://sdk.crazygames.com/crazygames-sdk-v3.js`. Every call has a safe fallback, so the game also runs locally or on other hosts.

- `SDK.init()` on boot; respects `environment === 'disabled'`.
- `game.loadingStart()` / `loadingStop()` around asset generation.
- `game.gameplayStart()` / `gameplayStop()` on pointer-lock gain and loss, pause, chapter complete and ads.
- `ad.requestAd('midgame')` between chapters (also throttled locally to one per 90 s). Audio is suspended while ads play.
- `ad.requestAd('rewarded')` for the **Get a hint** button in the pause menu.
- `game.happytime()` on chapter completion and achievements.
- `data.setItem` / `getItem` for cloud saves (mirrored to `localStorage`).
- `game.settings.muteAudio` and the settings-change listener are honoured.

## Build

```bash
npm install
npm run build        # bundles to ./dist
```

Upload the **contents** of `dist/` (`index.html`, `game.js`, `style.css`, `fonts/`) to CrazyGames as a zip. The game ships no image or audio files; everything is generated at load time.

For a local preview, run `npm run dev` (esbuild watch + server on http://localhost:8080).

### Debug URL parameters

- `?lvl=N` starts at chapter N (0-based).
- `?q=0..3` forces a quality tier.
- `?debug` logs load timings.

## Project layout

```
public/            index.html + style.css (copied to dist)
src/main.js        entry: SDK init -> load -> straight into gameplay
src/engine/        renderer + post FX, physics (Rapier), input, audio, procedural textures, materials
src/game/          game loop, player controller, grab system (forced perspective), props, illusions, levels runtime, decor
src/levels/        the nine chapter definitions
src/ui/            HUD and menus
```
