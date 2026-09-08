# They Want Billions

A pause-and-command colony survival RTS in the *They Are Billions* mould. One township, one Wave, twenty days.
The twist from the design doc: a building at 0 HP is not rubble, it is **Occupied**, and it starts working for them.

Built from `docs/THEY_WANT_BILLIONS_GDD.md` as a self-contained HTML5 Canvas game. No engine install, no build
step, no dependencies. It runs in Chrome or Firefox on Linux. The vertical slice (§13) is complete, plus the full
Wave roster, the ordered-liberty roster, the Charter tech tree, the three lieutenants, the map bosses and the Committee finale, Encampments, and noise-pull.

## Run it

```bash
./run.sh
```

That serves the folder on `http://127.0.0.1:8765` and opens your default browser. `Ctrl+C` stops it.
You can also just open `index.html` directly in Chrome or Firefox (the game does not need a server; the
launcher only exists so the browser does not cache stale files while you are editing).

## How to play

- **Day 1 is free.** Build cottages, a farm, a sawmill next to trees, a quarry on a stone deposit. Wall the ridge gaps.
  Open the tech tree (T) and start researching at the Town Hall.
- From **Day 2** a Wave arrives at the start of each day. **Day 16** is the big one; Days 17 to 19 each bring a map boss; **Day 20** brings the Committee. Kill it to win.
- **Occupation:** a building at 0 HP flips to *Occupied*. It stops paying you, spawns an Activist every 30 s,
  drains the Treasury, and buildings within 2 tiles take extra damage (stacking). Stand a unit next to it for
  8 s to recapture it (4 s inside a Chapel aura). Production resumes 10 s later.
- **Defenses** (walls, gates, towers) are destroyed instead of flipped.
- **Seizure Crews** ignore your people and beeline the sawmill, quarry or vault. If their 8 s channel completes the
  building flips even at full HP. A Courthouse aura makes the channel take 50% longer.
- **Man-Children** tantrum at 50% HP: nearby units are stunned, then they go for the nearest cottage at triple damage.
- **Organizers** are fast, buff nearby Activists and go for cottages and chapels.
- **Militia** cost 12 gold and 12 gold/day each while mobilized. Muster (M) before the Wave, dismiss (K) after.
- **Minutemen** are quiet scouts: fog Activists only wake when they get within 3 tiles.

### The full Wave (by first appearance)

| Day | Unit | Job |
|---|---|---|
| 2 | Activist | mass, soak, occupy |
| 3 | Organizer | fast, buffs Activists, hunts schools / cottages / chapels |
| 5 | Man-Child | tantrum stun at 50% HP, then triple damage on the nearest school or cottage |
| 5 | Agitprop Van | paints buildings: painted tiles take 50% more damage and pull the Wave; Print Shop scrubs |
| 7 | Seizure Crew | ignores colonists, channels industry and the vault into Occupied |
| 9 | ANTIFA Goon | packs of 3, jumps walls and gates, hunts Print Shop, Deed Office, Town Hall |
| 9 | Tankie | armor 6, gate and tower breaker |
| 10 | Nevertheless | two HP bars (Persist), megaphone deafens units and towers (half fire rate) in 4 tiles |
| 12 | Care Bear | heals Man-Children, Tankies and Goons |

### Lieutenants

| Day | Lieutenant | Mechanic |
|---|---|---|
| 10 | **Sernie Banders**, the Vacuum Wagon | drains the Treasury 2.5/s near your buildings; every 60 gold drops a crate that blocks the street until a unit retrieves it (3 s adjacent) |
| 12 | **Liz Barren**, the Desk on Wheels | while she lives, repairs cost triple and new buildings open at half HP after a 10 s permit review |
| 14 | **Alex Occasion-Cortex**, the Green New Deal Float | every 20 s shuts an industry for 25 s and every Seizure Crew on the map rushes it; arrives with two crews |

Killing a lieutenant returns 150 gold, drops Momentum 10 and raises Trust 5. Bosses return 300 and drop Momentum 20.

### Map bosses and the finale

| Day | Boss | Mechanic |
|---|---|---|
| 17 | **War Communism**, the Kitchen Train | Activists who die within 5 tiles of it stand back up after 6 s, once |
| 18 | **Gosplan Annex**, the Walking Filing Hall | siphons 30% of your income into a Public Fund bar; each time it fills, a Tankie steps out |
| 19 | **Listening Session**, the HR Dais | every 30 s, after a 5 s warning, freezes the build tray and unit commands for 9 s; Courthouse and Print Shop each cut 2 s |
| 20 | **The Committee on Equity & Alignment** | 9000 HP, armor 8. Aura 8: occupation 50% faster, repairs double, Momentum locked at 80+. At each HP quarter it tables a Resolution: gates frozen open 15 s, an unattended farm collectivized, Seizure channels doubled 30 s, or a leftover lieutenant summoned. Touching the Town Hall is an instant loss. A random lieutenant rides with it. |

### Encampments

Five Encampments sit in the fog (a Print Shop reveals them on the minimap). Each slowly seeds idle Activists around
itself. Select units and right-click one to raid it: 120 wood, 90 gold, 40 stone, then a backlash of campers spawns
on the spot and Momentum rises 5.

### Noise

Firing wakes idle fog Activists within a radius: Minuteman 2, Marksman 3, Militia 5, Posse 6, Field Piece 10,
towers 6 to 7. Minutemen are the quiet scouts; a militia line in the fog pulls the neighborhood.

### Occupation skins

Flavor only, same rules: a flipped farm becomes the Collective or the Community Garden, a mill the People's Foundry
or the Maker Space, a school the Cadre School or the Inclusive Classroom, and so on (table in `js/data.js`).

### Ordered liberty

| Unit | From | Tech | Job |
|---|---|---|---|
| Minuteman | Town Hall | — | quiet scout, range 5 |
| Citizen Militia | Militia Hall | — | line infantry, upkeep while mobilized |
| Marksman | Town Hall | Marksmen | range 8, 42 damage, targets specials first |
| Sheriff's Posse | Militia Hall | Sheriff's Posse | hits up to 6 targets in 3 tiles, cannot fire through walls |
| Field Piece | Workshop | Field Pieces | 60 damage in a 1.6-tile splash every 4 s, min range 2, scorches your own buildings |
| Veteran Company | Militia Hall | Veteran Company | armor 3, 420 HP, holds a gate |

New buildings: Stone Wall and Stone Tower (Stonework), Stakes (killbox floor, 14 HP/s to the Wave), Deed Office
(titled buildings survive their first flip and recapture 50% faster), Print Shop (scrapes paint, sees 13 tiles),
Schoolhouse (households, gold, Trust; a magnet), Lodge (households; Militia Hall in its aura musters twice as fast),
Iron Mine, Workshop (gold; builds Field Pieces), Warehouse (+20% production in its aura).

### Tech tree (T)

Frontier: Stonework, Stakes & Traps, Marksmen, Sheriff's Posse.
Charter: Homestead Act (Deed Office), Free Press (Print Shop), Common School, Lodge & Grange.
Workshop: Iron Mining, Workshop, Storage, Field Pieces, Veteran Company.
One research at a time, gold plus time, at the Town Hall.
- **Trust** rises when you win waves clean and recapture; falls when Occupied tiles sit overnight or you use the War Levy.
  High Trust = faster musters and tougher militia.
- **Momentum** rises with Occupied tiles, a fat Treasury (over 300) and the War Levy; falls with chapels and recaptures.
  Wave size scales by `1 + Momentum/100`; at 50+ an extra Man-Child, at 75+ an extra Seizure Crew.
- **Lose:** the Town Hall falls, or the Treasury sits at zero for 45 s.

### Controls

| Key | Action |
|---|---|
| Space | pause / resume (you can command while paused) |
| WASD / arrows / middle-drag | pan · mouse wheel: zoom · H: home |
| Z / X / C / V | tray tabs (Frontier / Charter / Workshop / Muster) |
| 1–9 | pick a building in the current tab; click to place; drag for walls; Shift keeps placing |
| Right-click / Esc | cancel placement |
| Left-click / drag | select unit or building / box-select units |
| Right-click | move · attack enemy · recapture Occupied building |
| M / Shift+M | muster 1 / 5 militia (needs a Militia Hall) |
| K | dismiss selected militia (or all) |
| N | train a Minuteman at the Town Hall · T: tech tree |
| F / G | select all militia / the whole army |
| R / Del | repair / demolish (scuttle) selected building |
| L | War Levy: +200 gold, Trust −15, Momentum +12, once per day |

## Decisions made on the GDD's open questions

| Question | Decision for the slice |
|---|---|
| Engine | HTML5 Canvas + vanilla JS (zero install on Linux). Systems are data tables, so porting to Godot 4 is a transcription job. |
| Day length | 120 s. First Wave at the start of Day 2. Lieutenants on Days 10, 12, 14; bosses 17, 18, 19; the Committee on Day 20. Win = the Committee dies. |
| Grid | 56×56 tiles, 64×32 px isometric diamonds. Footprints: Town Hall 3×3, farm 3×3, cottage / mill / quarry / chapel / court / militia hall 2×2, walls / gate / tower / vault 1×1. |
| Mandate radius | Yes: 16 tiles from the Town Hall. Nothing builds outside it. |
| Defense structures | Destroyed, not flipped (an occupied wall would be a hole either way). Everything else flips. |
| Noise-pull | Not implemented. Fog Activists wake on proximity (6 tiles for loud units and buildings, 3 for Minutemen). |
| Boss naming | Parody names with title subtitles ("Sernie Banders, the Vacuum Wagon"). Swap `name` for `title` in `js/data.js` if Steam-safety matters. |
| Economy numbers | All in `js/data.js`. Not balanced; the harness in `dev/simtest.js` fast-forwards a scripted town for tuning. |

## Code map

| File | What it holds |
|---|---|
| `js/data.js` | every number: buildings, units, wave table, day length, thresholds |
| `js/map.js` | the hand-authored County Seat plus the seeded procedural generator and reachability check |
| `js/path.js` | grid Dijkstra flow fields. Walls are finite cost for the Wave (they chew through), infinite for you |
| `js/game.js` | simulation: economy tick, occupation / recapture, Seizure channel, tantrum, waves, Trust / Momentum, vision |
| `js/render.js` | isometric renderer, placeholder art built from primitives, fog, minimap |
| `js/ui.js` | input, placement, selection, HUD, selection card |
| `js/main.js` | fixed-step loop (30 Hz sim, speed 1×/2×/3×) |
| `dev/simtest.js` | load in the browser console to auto-build a town and fast-forward N days, optionally with a crude autopilot |
| `dev/unittests.js` | 44 scenario tests covering every mechanic (goon jump, persist, paint, lieutenants, bosses, raids, freeze, maps, homesteaders, save/load, win) |
| `dev/serve.py` | no-cache static server used by `run.sh` |

## Dev harness

Open the browser console on the running game and paste:

```js
eval(await (await fetch('/dev/simtest.js')).text()); simtest(15, { militia: 6, auto: true })
eval(await (await fetch('/dev/unittests.js')).text()); runTests()
```

The first builds a walled test town and simulates fifteen days in a few seconds with a crude autopilot (it repairs,
musters, dismisses, adds towers, researches). It currently dies around Day 11, which is the intended shape: it never
recaptures, so Momentum climbs. The second runs the scenario tests and returns PASS/FAIL per mechanic.

### Maps, difficulty, saves

The start screen offers the hand-authored **County Seat** or a **procedural map** from a seed (lake, rock ridges
with chokes, tree stands, stone and iron deposits, five Encampments, checked for reachability). Three difficulties
scale wave size and starting resources: Study Group (×0.7, fat start), General Strike, Five-Year Shock (×1.3, lean
start). F5 saves to the browser's local storage, F9 loads; the ☰ button opens the menu mid-run.

### Homesteaders

Every cottage sends out a Homesteader who walks between home and a workplace. When the Wave gets within 3.5 tiles
they run for the Town Hall. If an enemy catches one, they are **organized**: the Homesteader becomes an Activist
on the spot and your household cap drops by one until that Activist is put down. The cottage waits 60 s before
sending out another.

### Audio and juice

WebAudio only, no files: wave horn, boss drums, gate-break sting with screen shake, Field Piece booms, Persist ring
pop, Sernie's vacuum hum while he drains, research chime, shot ticks. Mute with 🔊.

## Still out

A campaign, real sprites, a human balance pass.

## Art

Everything on screen is drawn from primitives in `js/render.js` in the GDD palette. The HUD layout follows the
concept sheet (title block, resource bar, clock and day panel, Trust bar, Momentum thermometer, Occupied alert
over the minimap, icon build tray, portrait card). Drop sprites in by replacing `drawUnit` / `drawBuilding` cases.
