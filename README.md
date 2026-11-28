# Asfalto: Noite em Movimento

Jogo arcade 3D de desvio de tráfego, inspirado nos minigames de direção dos anos 90. O jogador
permanece na pista enquanto sedãs, SUVs, vans e picapes vêm em sua direção. Desvie, sobreviva,
acumule quase-colisões e tente bater seu recorde em uma cidade noturna com asfalto de brilho úmido.

O projeto usa Three.js para renderização 3D e mantém o motor de jogo original como base técnica. It exists to be *changed*:
the engine layer is fixed scaffolding, the game layer is the part you rewrite.

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # typecheck + production build + JS/font budgets + total-size report
pnpm test     # unit tests (rules, save, i18n, level)
pnpm smoke    # after build: headless browser playthrough + screenshots in shots/
```

## Layout

| Path | Role | Change it? |
| --- | --- | --- |
| `src/engine/loop.ts` | Fixed 60 Hz simulation + interpolated rendering | Rarely |
| `src/engine/input.ts` | Keyboard/mouse, gamepad, touch → one action state | Add actions here |
| `src/engine/physics.ts` | Rapier world, collider helpers, render interpolation | Rarely |
| `src/engine/renderer.ts` | WebGL renderer, quality presets, bloom | Rarely |
| `src/engine/audio.ts` | Music/SFX buses, synthesized SFX, `load()` for files | Add sounds |
| `src/engine/save.ts` | Versioned localStorage save + leaderboard | Add fields + parsing |
| `src/engine/i18n.ts` | en / zh-CN, browser detection, saved choice wins | Rarely |
| `src/engine/assets.ts` | Cached GLTF/texture loading with progress | Use it for models |
| `src/game/config.ts` | Source defaults and active gameplay configuration | Yes |
| `src/game/tuning.ts` | Tweak catalog, atomic validation and activation boundaries | Yes |
| `src/game/rules.ts` | Pure score/lives/clock/win rules (unit tested) | Yes |
| `src/game/world.ts` | Level layout, sky, lights, islands, stones, lifts | Yes |
| `src/game/player.ts` | Character controller + game feel + procedural model | Yes |
| `src/game/race-game.ts` | Trânsito, colisões, pontuação, velocidade e partida | Yes |
| `src/game/race-world.ts` | Pista, cidade noturna, iluminação e cenário | Yes |
| `src/game/*.ts` | Sistemas auxiliares do motor original | Yes |
| `src/ui/`, `src/styles/main.css` | HTML/CSS title, HUD, pause, settings, results | Yes |
| `src/i18n/*.json` | All player-facing text (both files, same keys) | Yes |

## Rules for changes

- **Simulation in `step()`, visuals in `render()`/`animate()`.** Gameplay state only changes in
  fixed steps; read presses there with `input.consume(action)`, never `pressed()`.
- **Rules stay pure.** Scoring, win/lose and progression go in `rules.ts` with tests; scene code
  reports events and reads state.
- **Every visible string is an i18n key** in both `en.json` and `zh-CN.json` (a test enforces
  matching keys and placeholders). English and Chinese use the bundled Manus CC0 fonts in `public/fonts/`;
  if you add new Chinese text, check it renders (missing glyphs fall back to system fonts).
- **UI is HTML/CSS**, not canvas. Keep the game look: display font, outlined text, hard offset
  shadows, skewed buttons, notched panels. Menus must stay keyboard/gamepad navigable
  (`data-nav` on focusable controls).
- **Colliders come from the helpers** in `physics.ts` with the same sizes as the meshes.
- Keep `npm run build` within the JS/font budgets (`scripts/check-size.mjs`) and `npm run smoke` green.
  Total game asset size is reported without a hard limit.

## Controls

Teclado: A/D ou setas esquerda/direita para desviar; W/S ou setas cima/baixo para acelerar/frear;
Shift para acelerar e F para nitro; Esc pausa. Celular: controle direcional na lateral esquerda,
ACELERAR e NITRO nos botões da direita.

## Credits

Fonts: ManusCC0 (regular, medium, bold) and ManusCC0 Sans CJK SC — CC0 1.0.
The bundled Chinese font preserves its 6,547-codepoint repertoire; no font download is required.
See `public/fonts/ManusCC0-LICENSE.txt`.
Libraries: three.js (MIT), Rapier (Apache-2.0).

3D model: "CarConcept" (carro esportivo do garagem) — © Khronos Group / criado por Eric Chadwick (Darmstadt Graphics Group GmbH), licença
CC BY 4.0, de KhronosGroup/glTF-Sample-Assets. Otimizado (malha simplificada, texturas WebP 1024px, compressão meshopt)
em `public/models/supercar.glb`.

3D model: "Generic Sedan Car" (https://sketchfab.com/3d-models/generic-sedan-car-58c33766470d46e7b2aed542650494e5) by Márcio Meireles
(https://sketchfab.com/marciomeireles), licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Otimizado em `public/models/sedan.glb`.

3D model: "Oldsmobile Cutlass Supreme Sedan '71" (https://sketchfab.com/3d-models/oldsmobile-cutlass-supreme-sedan-71-78f76d386a4341b0b71745bdc50fd5ab) by Barbo
(https://sketchfab.com/barbo-autos), licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Otimizado em `public/models/cutlass.glb`.

Modelos 3D adicionais da garagem (Sketchfab), otimizados em `public/models/<id>.glb`. Os marcados NC só podem ser usados sem fins comerciais (este jogo é um projeto pessoal e gratuito); os NC-SA devem ser redistribuídos sob a mesma licença:
- "2015 Nissan Versa Sedan 1.6" by Ddiaz Design (https://sketchfab.com/ddiaz-design), licensed under CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/) — `versa.glb`
- "2010 Ford Fusion" by Ddiaz Design (https://sketchfab.com/ddiaz-design), licensed under CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/) — `fusion.glb`
- "2021 Nissan Kicks" by Ddiaz Design (https://sketchfab.com/ddiaz-design), licensed under CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/) — `kicks.glb`
- "2016 Ford Focus RS" by Ddiaz Design (https://sketchfab.com/ddiaz-design), licensed under CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/) — `focus-rs.glb`
- "2017 Ford GT" by Ddiaz Design (https://sketchfab.com/ddiaz-design), licensed under CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/) — `ford-gt.glb`
- "2024 BYD Dolphin" by Ddiaz Design (https://sketchfab.com/ddiaz-design), licensed under CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/) — `dolphin.glb`
- "2024 BYD Seal" by Ddiaz Design (https://sketchfab.com/ddiaz-design), licensed under CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/) — `seal.glb`
- "2025 Ford Mustang GTD" by Ddiaz Design (https://sketchfab.com/ddiaz-design), licensed under CC-BY-NC-SA-4.0 (http://creativecommons.org/licenses/by-nc-sa/4.0/) — `mustang-gtd.glb`
- "Ford Mustang 1965" by Pooya_dh (https://sketchfab.com/Pooya_dh), licensed under CC-BY-NC-4.0 (http://creativecommons.org/licenses/by-nc/4.0/) — `mustang-65.glb`
- "Nissan GT-R" by iSteven (https://sketchfab.com/OneSteven), licensed under CC-BY-NC-4.0 (http://creativecommons.org/licenses/by-nc/4.0/) — `gt-r.glb`
- "HB20s 2025" by GARAGISTA (https://sketchfab.com/-garagista1753d1), licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/) — `hb20s.glb`
- "Hyundai Hb20 2025" by teenlin3 (https://sketchfab.com/teenlin3), licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/) — `hb20-2025.glb`
- "Nissan Aimgain GT R35 Type2" by vecarz (https://sketchfab.com/heynic), licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/) — `gtr-type2.glb`
- "Nissan Skyline" by soujagah (https://sketchfab.com/soujagah), licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/) — `skyline.glb`
- "Tesla Cybertruck" by Lexyc16 (https://sketchfab.com/Lexyc16), licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/) — `cybertruck.glb`
- "Tesla Roadster 2020" by metarex.4d (https://sketchfab.com/metarex.4d), licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/) — `roadster.glb`

## Preview Tweak

`src/game/tuning.ts` is this game's parameter manager. The Addon panel reads its
catalog; `config.ts` owns source defaults and the active configuration used by gameplay.
When adapting the game, keep only controls with actual gameplay consumers, and preserve
stable IDs for unchanged parameters. Define ranges, units and the correct activation
boundary. Register through `scripts/manus-tuning/adapter.js` only under `import.meta.env.DEV`.
Keep the Vite plugin and `scripts/__manus__/` helpers intact; production builds exclude
the browser adapter and never inject the bridge.

Apply changes preview state only. `LIVE` parameters are read in the next game update;
`NEXT_ACTION` parameters activate at the relevant jump/dash start; `NEXT_RUN` parameters
activate in `Game.start`. Model/collider size and gravity are not exposed by this version.
Do not mutate the source defaults or persist Apply to localStorage. Save with Manus
checks the snapshot against the current catalog and edits `DEFAULT_CONFIG`, then uses
the normal Three.js Web build/checkpoint workflow. Keep existing gameplay parameter
managers when extending an older project; do not create a competing store.

For server-authoritative multiplayer, expose local cosmetic controls only until gameplay
parameters have explicit server-side development support. The descriptor's GAMEPLAY flag
is a classification, not server authorization or ranked-score enforcement.

The preview plugin reads the ignored `.manus-webdev/preview-identity.json` v1 projection
written by the Runtime when initializing, attaching or restoring this project. It contains
only the resource ID and canonical project directory; private Host bindings and starter
receipts are not template dependencies. Missing identity disables the bridge.
The manager latches `tuning.unranked` when non-default GAMEPLAY values become active and
resets it only at the next run using that run's active values. `Game` snapshots this onto
`RunState.unranked`; local results cannot save such runs. Preserve this guard when changing
scoring. When adding online leaderboards, skip submissions for unranked runs and enforce
eligibility in the authoritative server too; client flags are not proof of a fair score.
