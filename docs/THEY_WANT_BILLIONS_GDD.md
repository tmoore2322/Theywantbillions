# They Want Billions

**Genre:** Isometric pause-and-command colony survival RTS  
**Reference:** *They Are Billions* (structure, tension, wave weather)  
**Subtitle:** A Colony Survival Strategy  
**Taglines:**
- They don’t want your walls. They want the budget.
- Survive the fiscal year.

This document is a handoff spec. Prefer implementing the **Vertical Slice** section first. Flavor text is secondary to systems.

---

## 1. Pitch

The player keeps a free American township alive. The enemy is **the Wave** — one far-left / liberal horde that does not only smash buildings. It **occupies and nationalizes** them.

Double meaning of the title:
- They come in billions (mass).
- They want billions (Treasury drain / redistribution).

Player fantasy is **ordered liberty**: property, speech, arms, worship, local law. Not a rally stage and not a secret-police fantasy.

Tone: *They Are Billions* weather + political cartoon. Earnest, bureaucratic, loud. Readable silhouettes at full zoom-out. Adult units only. No real-person likenesses in shipped art. Boss names may be parody titles.

---

## 2. Design pillars

1. **Occupation is the infection.** A lost building flips and starts working for them.
2. **One enemy.** Socialist kit and campus-meme kit are cosmetics and jobs on the same army.
3. **Liberty has verbs.** Every player institution does something in a fight.
4. **Force is legitimate and finite.** Citizen militia you muster and dismiss. No conscript spam.
5. **Success paints a target.** A fat Treasury and splashy victories raise Momentum and call a bigger Wave.

---

## 3. Core loop

1. Build and title the town between waves.
2. Wave arrives from fog as one mixed horde.
3. Hold gates, recapture flipped tiles, dismiss militia before upkeep ruins you.
4. Survive the calendar.

**Win (slice / survival):** Survive Day N.  
**Lose:** Town Hall destroyed, **or** Treasury at 0 long enough that institutions shutter.

Pause-anytime command is mandatory (spacebar). This genre dies without it.

---

## 4. Camera, grid, time

- Isometric, grid-snapped buildings (TAB-like).
- Recommended engine for an indie first pass: **Godot 4** (GDScript or C#). Unity C# is acceptable.
- Buildings block pathing. Closed gates block the Wave; player units can use gates.
- Default Wave pathing is dumb and cheap: nearest valid target. Only ANTIFA Goon flanks / jumps.
- v0.1 on-screen cap: hundreds of units, not thousands.
- Day length: **TBD numeric**, but there is a visible clock on Town Hall and a HUD countdown “until next wave.”
- Time frozen while paused.

---

## 5. Resources and meters

### Stock resources
- Wood
- Stone
- Iron
- Coal / oil
- Food
- Households (population / worker cap)
- Gold (operating cash)
- **Treasury** (the vault — enemy win condition besides Town Hall)

Economy fills Treasury from production and trade, not from squeezing households by default.

### Trust (player meter)
Rises when waves are beaten without losing homesteads, when flipped tiles are recaptured, when chapel/courthouse stay online.  
Falls when flipped tiles are left standing, splash hits own cottages, or a **war levy** is used.  
Effect: volunteer quality / Minuteman response time. Low Trust = late muster.

### Momentum (enemy meter)
Rises when the town booms, when splash is overused, when participation trophies are left on the ground, when Encampments are raided.  
Falls when sermons fire, tiles are recaptured, surplus stays lean.  
Effect: denser waves, more specials (Man-Children, Seizure Crews, lieutenants).

### War levy
Emergency tax. Works. Also spikes Momentum and dumps Trust. Use only when a boss is on the map.

---

## 6. Player faction — ordered liberty

**Look:** barn red, chapel white, pine green, lamp gold. County seat, not a firebase. Flags on poles, not on every unit. Town Hall has a clock.

### Liberty as verbs

| Principle | Building / tech | Combat job |
|---|---|---|
| Property | Deed Office, Homestead Act | Occupied tiles recapture faster; upgraded farms resist first flip |
| Arms | Militia Hall | Citizen units; cheap to raise, costly while mobilized |
| Speech | Print Shop / Gazette | Strips Agitprop paint |
| Conscience | Chapel / Meeting House | Morale, bleeds Momentum, recapture pulse |
| Law | Courthouse | Slows flip timers in radius; shortens control stuns |
| Localism | Town Hall (Command Center) | Build radius. If it dies, run ends |
| Self-reliance | Farm, Mill, Smith, Workshop | Economy. Wave priority targets |
| Association | Lodge / Grange | Household cap; compact-town volunteer bonus |

Sprawl is tempting and punished. Compact, deeded, watched towns are the intended spatial puzzle.

### Player units (TAB role map)

| TAB slot | Unit | Notes |
|---|---|---|
| Ranger | **Minuteman** | Quiet scout. Clears fog edge without pulling the whole Wave. |
| Soldier | **Citizen Militia** | Loud line infantry. Upkeep while mobilized. Dismiss between waves. |
| Sniper | **Marksman** | Deletes specials (Man-Child, Thicc Support, Agitprop, Nevertheless persist ring). |
| Lucifer | **Sheriff’s Posse** | Cone / scatter cleanup after a breach. Cannot fire through walls. |
| Thanatos | **Field Piece** | Wagon cannon. Wave-breaker. Expensive. |
| Titan | **Veteran Company** | Few, late, hold a gate during recapture. |
| Civilian | **Homesteader** | Worker. If reached: flee to Town Hall or get “organized” off the worker pool. |

No secret police. No conscript wave.

### Tech tree (three branches)

- **Frontier** — walls, traps, marksmen, homesteads.
- **Charter** — court, deeds, gazette, chapel, school.
- **Workshop** — mills, field pieces, storage, quarry rail.

Guns-only dies. Paper-only gets walked through. Early access: cap the tree at ~12 nodes.

---

## 7. Buildings

### Core / civic
- **Town Hall** — command center, clock, lose condition.
- **Treasury vault** — sits against Town Hall. Seizure Crew priority. Not an outer-wall building.
- **Courthouse** — flip-slow aura.
- **Deed Office** — recapture / first-hit resist on titled tiles.
- **Chapel / Meeting House** — morale, Momentum bleed.
- **Print Shop / Radio / Gazette** — reveal Encampments, mark Seizure Crews, scrape paint. Bloc/ANTIFA priority.
- **Schoolhouse** — Organizer / Man-Child magnet. Keep inside court radius, off the wall.

### Economy
- Cottage / homestead
- Farm
- Mill / smith / workshop
- Storage / warehouse analog

### Defense
- Wood wall → stone wall
- Gate
- Watchtower / wood tower → stone tower
- Traps / stakes (later)
- Militia Hall (place near the *main gate*, not beside Town Hall)

### Map structures (enemy)
- **Encampment** — Village of Doom analog. Tents, pallet kitchen, banner, plastic trophies. Raid for resources; backlash spawn is a mixed bag.

### Occupation skins (flavor only — one rule)
Same flip rules whether graffiti looks socialist or pastel.
Examples if last-hit flavor is implemented later:
- Farm → Collective or Community Garden
- Workshop → People’s Foundry or Maker Space
- School → Cadre School or Inclusive Classroom
- Cottage → Commune or Roommate Collective
- Radio → State Broadcast or Livestream Hub

**v0.1: one Occupied state. No dual kits.**

---

## 8. Occupation spec (implement this literally)

When a Wave unit finishes a building:

1. Building HP reaches 0 **or** a Seizure Crew completes its channel.
2. Building does **not** become rubble.
3. Building enters **Occupied**:
   - Stops paying the player.
   - Pulses a small Activist spawn every T seconds.
   - Neighbor buildings flip faster (stacking multiplier).
4. Player **Recapture**: eligible unit stands on the tile for T seconds (cost: time + optional gold). Building returns to player, production resumes after a short delay.
5. Leaving Occupied tiles standing raises Momentum and drops Trust.

**Seizure Crew special:** ignores colonists; paths to Workshop / Mill / Treasury; if the channel completes, the building flips even if HP remains.

**Optional later:** scuttle / burn a flipped mill rather than let it pulse. Dead mill > People’s Foundry.

Exact T values and pulse counts are placeholders until the economy spreadsheet exists.

---

## 9. Enemy faction — the Wave

One faction. Random cosmetics on the walker mesh (neon hair, red scarf, tote, pins). AI is the **role**, not the hat.

Adult units only. **Man-Child** is an oversized **adult** in a onesie, not a child.

### Line units

| Unit | TAB analog | Job |
|---|---|---|
| **Activist** | Walker | Mass, soak, occupy only if left alone on a tile. |
| **Organizer** | Runner | Faster. Buffs nearby Activists. Paths to school, chapel, cottages. |
| **Man-Child** | Chubby | High HP. At 50% HP: **Tantrum** (short stun) then occupy nearest cottage/school. |
| **ANTIFA Goon** | Harpy | Wall jump. Priority: Town Hall, Print Shop, Radio, Deed Office. Small packs. Optional short-range fire pot vs wood towers. |
| **Agitprop Van** | Venom | Paints buildings. Painted tiles flip faster and pull pathing. Print Shop scrapes paint. |
| **Tankie** | Armored special | Gate/tower breaker. Escorts the rest in. |
| **Seizure Crew** | Sapper | Beelines industry and Treasury. Nationalize channel. |
| **Nevertheless** | Support | Feminist meme unit. Pink pussyhat, megaphone. **Persist:** two HP bars (pink ring is bar two). **Megaphone Blast:** cone Deafen (fire-rate / accuracy down). Paths with blob toward School/Chapel. Does **not** lock towers (that is a boss-only HR trick). |
| **Thicc Support** | Support (mobility scooter) | Body-positivity healer on a rolling scooter ("Every body is a wave body"). Rolls with the blob; heals Man-Children, Tankies and Goons. Marksman food. |

### Lieutenants (named parody — mechanics, not portraits)

Use titles in shipped UI if likeness risk is a concern.

| Name | Mechanic |
|---|---|
| **Sernie Banders** | Vacuum wagon. Constant Treasury drain in radius. Stolen gold dumps as crates that body-block retrieval. |
| **Alex Occasion-Cortex** | Green New Deal float. Shuts Mill/Workshop “for the planet.” Seizure Crews rush the shut building. |
| **Liz Barren** | Desk on wheels. Regulation stack: build queue slow, repairs expensive on one industry pocket. |
| Others (later) | Squad platform, streamer Agitprop, Hollywood rant stun, academic splash resist, etc. |

### Map / chapter bosses (later)

- War Communism — kitchen train; nearby dead Activists stand back up slowly.
- Gosplan Annex — walking filing hall; siphon income into a public-fund bar that spawns Tankies when full.
- Listening Session — freezes build menu / rally for a short announced window. Courthouse + Print Shop shorten it.
- **The Committee on Equity & Alignment** — final. Giant dais. Auras: faster occupation, slower repairs, Momentum locked high. At HP quarters it tables Resolutions (gates freeze open, flip an unattended farm, double Seizure speed, summon a leftover lieutenant). If it **touches Town Hall**, instant lose (charter superseded), even if Hall has HP. Highlighted on minimap like a TAB Giant.

### Wave curve (survival)

| Days | Mix |
|---|---|
| 1–4 | Activists, few Organizers |
| 5–8 | + Man-Children, first Agitprop |
| 9–12 | + ANTIFA Goon, Tankie, one lieutenant |
| 13–16 | Seizure Crews every wave, Thicc Support |
| 17–19 | Map boss (War Communism / Gosplan) between waves |
| 20 | Committee + leftover lieutenant add |

Chapter titles (flavor): Study Group → General Strike → Occupied Quad → War Communism → Cultural Inspection → Five-Year Shock → The Committee Arrives.

---

## 10. Layout doctrine

Occupation changes TAB housing-on-the-wall advice. A house on the wall is a **spawn node**.

### Adjacency law

| Building | Place | Never |
|---|---|---|
| Town Hall | Center or one layer behind main gate | On the wall |
| Treasury | Touching Town Hall | Outer wall |
| Court + Deeds | Overlapping housing and farm belt | Isolated on empty grass |
| Chapel | Housing side of core | Front line |
| Print / Radio | Inner ring | Outer wall |
| School | Inside court radius | Beside a gate |
| Homes | Dense inner block; one-tile road off the wall | Touching palisade |
| Farms | Rear/side belt under Deed radius | Forward of the killbox |
| Mill / Workshop | Walled **industrial pocket** with inward gate | On the perimeter |
| Militia Hall | Beside main gate | Beside Town Hall |

### Standard layouts
1. **County Seat** — one wall, one gate, civic knot in the middle. Opening map.
2. **Charter Core + Farm Belt** — inner stone civic square, outer curtain for farms/cottages, two gates max, industry as a barbican.
3. **Sprawl Trap** — anti-pattern. Wall cottages, exposed workshop, lonely school, too many gates, no court overlap.

### Wall doctrine
- Two layers by first mid wave. Outer may fall. Inner may not.
- Gates are weapons. A gateless tower line is incomplete; a towerless gate is a hallway.
- Killbox in front of main gate: slow + crossfire. Activists are walkers.
- Late game: Ring A disposable, Ring B belt, Ring C charter core.

### Expansion order
Scout chokes → smallest defensible green → civic knot (Court + Deeds + Chapel) → housing under radii → one industry pocket → farm belt behind second curtain → second gate only if the map forces two vectors.

---

## 11. HUD / screen layout

Isometric map is the center.

- **Top bar:** wood, stone, iron, food, households, gold, Treasury, Trust.
- **Top center:** wave countdown + day number. Town Hall clock mirrors this.
- **Right rail:** Momentum meter.
- **Bottom left:** minimap (town gold, fog mass red, occupied tiles pink pips).
- **Bottom center:** build tray. Tabs Frontier / Charter / Workshop.
- **Bottom right:** selection card.
- **On-map:** occupied stencil, Agitprop paint decal, ANTIFA already-inside as black pips.

Build phase: clock running, fog quiet.  
Wave phase: tray dimmed; Rally / Recapture / Dismiss Militia hot.

---

## 12. Art bible (short)

- Isometric, readable at two zoom levels.
- Player: barn red, chapel white, pine, lamp gold, navy UI chrome.
- Wave zoomed-out: dark rectangle of bodies with a few huge Man-Child silhouettes and pink Persist rings.
- ANTIFA: black kit, mask, umbrella, backpack.
- Nevertheless: pink hat/coat, megaphone, glowing persist ring. Adult proportions in original intent; if using existing roster art, keep the shipped label “adult woman.”
- No photoreal gore. No real politician/actor portraits.
- Placeholder cubes with labels are acceptable for the slice.

---

## 13. Vertical slice (build this first)

**Do not start with the Committee.**

### In
- 1 hand-authored map, no generator
- Buildings: Town Hall, wall, gate, 1 tower type, cottage, farm, mill, chapel
- Enemies: Activist, Organizer, Man-Child, Seizure Crew
- Player units: Minuteman, Militia
- Systems: pause, place, shoot, resource tick, occupation, recapture, wave timer
- 8–10 days; last wave large but unnamed
- Win: survive. Lose: Hall down or Treasury empty too long

### Out
- Full 9-unit roster
- Lieutenants / Committee
- Dual occupation kits
- Tech tree
- Procedural maps
- Noise-pull system
- Encampments
- Listening Session UI freeze

### Build order
1. Grid + pause + camera  
2. Town Hall + walls/gate + dummy walker pathing to Hall  
3. Tower shoots walkers  
4. Cottage + farm + resource tick  
5. Occupation + recapture on one building  
6. Wave timer  
7. Militia muster / dismiss  
8. Seizure Crew + Treasury  
9. Then expand roster  

---

## 14. Placeholder numbers

Replace with a spreadsheet. Do not ship without columns.

Suggested starting bands (not balanced):

| Unit | HP | Speed | Damage | Notes |
|---|---|---|---|---|
| Activist | Low | Slow | Low | Noise medium |
| Organizer | Low-med | Fast | Low | Buff radius |
| Man-Child | High | Slow-med | Low until tantrum | Occupy after 50% |
| Seizure Crew | Med | Med | Low vs units | Channel on industry |
| Minuteman | Med | Fast | Med | Quiet |
| Militia | Med-high | Med | Med | Loud, upkeep |

Wave 1: ~20 Activists.  
Wave 5: Activists + Organizers + 1–2 Man-Children.  
Wave 10: add Seizure Crews.

Exact day length in seconds: **unset**. Pick one and keep it.

---

## 15. Audio / juice (later)

- Banders vacuum should be audible.
- Persist ring pop when Nevertheless’s first bar dies.
- Gate break has a distinct sting.
- Chapel sermon is a short recapture / Momentum bleed sting.

---

## 16. Tooling notes for another model

- Implement systems as data-driven tables (unit defs, building defs, wave tables).
- One `Occupied` component. Do not fork socialist vs liberal capture classes in v0.1.
- Pathfinding: flow field or cheap grid BFS from Town Hall / current targets. Specials override target priority.
- Keep jokes in names, VO, and cosmetics. Combat math stays readable.
- Parody boss display names can be swapped to titles without changing mechanics.

### Suggested local coding model (if working offline)
On a 24 GB GPU: Qwen3-Coder 30B-A3B or Qwen3.6 27B.  
Inline complete: Codestral-class FIM model.  
Unity C# multi-file: consider Devstral Small 2.  
Feed this document + one system per session.

---

## 17. Open questions

- Engine: Godot 4 vs Unity.
- Exact day length and wave clock hour.
- Grid cell size / building footprints.
- Whether Town Hall energy/mandate radius exists (TAB Tesla analog). Recommend **yes**: buildings off-grid occupy faster.
- Noise-pull radius for loud guns (TAB soldier agro). Add after pathing works.
- Survival-only vs later campaign.
- Steam-safe boss naming.
- Numeric economy spreadsheet.

---

## 18. One-sentence contrast

They occupy and redistribute. You title, muster, and hold. Same map, opposite verbs.
