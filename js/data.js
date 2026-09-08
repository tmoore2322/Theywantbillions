'use strict';
// ============================================================
// They Want Billions — data tables
// All balance lives here. Replace with a spreadsheet later.
// ============================================================
const TILE_W = 64, TILE_H = 32;
const MAP_W = 56, MAP_H = 56;
const DAY_LENGTH = 120;      // seconds per day
const FIRST_WAVE_DAY = 2;    // day 1 is a free build day
const WIN_DAY = 20;          // survive the day-20 wave (the Committee) to win
const BUILD_RADIUS = 16;     // tiles from Town Hall center (mandate radius)
const TREASURY_GRACE = 45;   // seconds at 0 Treasury before institutions shutter
const OCCUPY_PULSE = 30;     // seconds between Activist spawns from an Occupied tile
const RECAPTURE_TIME = 8;    // seconds of a unit standing next to an Occupied tile
const RECOVER_TIME = 10;     // seconds before a recaptured building produces again
const PAINT_TIME = 60;       // seconds Agitprop paint lasts without a Print Shop
const CRATE_TIME = 3;        // seconds to retrieve a stolen-gold crate

const TER = { GRASS:0, WATER:1, ROCK:2, TREE:3, STONE:4, IRON:5 };

const BUILDINGS = {
  townhall:   { name:'Town Hall', w:3, h:3, hp:6000, cost:{}, tab:null, kind:'civic', height:2.3,
                color:'#b23a2f', trim:'#f3e9cf', households:8, vision:11,
                income:{ gold:30, wood:8, stone:3, food:4, treasury:8 },
                desc:'Command center and clock. Sets the build radius. Trains Minutemen and Marksmen, researches tech. If it falls, the run ends.' },
  vault:      { name:'Treasury Vault', w:1, h:1, hp:900, cost:{}, tab:null, kind:'civic', height:1.1,
                color:'#c9a227', trim:'#5a4a12', vision:3,
                desc:'The vault. Seizure Crews and Sernie Banders come for it. Keep it behind the Hall, never on a wall.' },
  encampment: { name:'Encampment', w:3, h:3, hp:650, cost:{}, tab:null, kind:'enemy', height:0.9,
                color:'#4a2a5a', trim:'#ff5fd0', vision:0, loot:{ wood:120, gold:90, stone:40 }, pulse:45,
                desc:'Tents, a pallet kitchen, a banner, plastic trophies. Raid it (right-click with units) for wood, gold and stone. Expect a backlash.' },
  crate:      { name:'Stolen Gold Crate', w:1, h:1, hp:1, cost:{}, tab:null, kind:'crate', height:0.5,
                color:'#c9a227', trim:'#5a4a12', vision:0,
                desc:'Gold vacuumed from the Treasury. Body-blocks the street. Stand a unit next to it for 3s to retrieve it.' },
  // ---- Frontier ----
  wall_wood:  { name:'Wood Wall', w:1, h:1, hp:320, cost:{wood:5}, tab:'frontier', kind:'defense', height:0.7,
                color:'#8b5a2b', trim:'#5c3a1a', desc:'Cheap palisade. Click and drag to draw a line.' },
  wall_stone: { name:'Stone Wall', w:1, h:1, hp:900, cost:{stone:7}, tab:'frontier', kind:'defense', height:0.85, tech:'stonework',
                color:'#8f8f8f', trim:'#5a5a5a', desc:'Sturdy curtain. Needs a quarry and Stonework.' },
  gate:       { name:'Gate', w:1, h:1, hp:700, cost:{wood:15, stone:5}, tab:'frontier', kind:'defense', gate:true, height:1.0,
                color:'#7a4a22', trim:'#d9b45a', desc:'Your units pass. The Wave does not. Gates are weapons. Heavies want them.' },
  stakes:     { name:'Stakes', w:1, h:1, hp:120, cost:{wood:8}, tab:'frontier', kind:'trap', height:0.3, tech:'stakes',
                color:'#6b4a24', trim:'#3f2a15', trapDmg:14, desc:'Killbox floor. The Wave walks through it slowly and bleeds 14 HP/s. Your units cannot cross.' },
  tower:      { name:'Watchtower', w:1, h:1, hp:420, cost:{wood:35, gold:25}, tab:'frontier', kind:'defense', height:2.1,
                color:'#6e4b2a', trim:'#3f2a15', range:6.5, dmg:10, rate:1.1, vision:9, workers:1,
                desc:'Shoots the Wave. Range 6.5. Needs 1 worker.' },
  tower_stone:{ name:'Stone Tower', w:1, h:1, hp:1000, cost:{stone:45, iron:10, gold:40}, tab:'frontier', kind:'defense', height:2.4, tech:'stonework',
                color:'#7d7d7d', trim:'#3a3a3a', range:7.5, dmg:16, rate:1.0, vision:10, workers:1,
                desc:'Heavy tower. Range 7.5, 16 damage. Needs 1 worker.' },
  cottage:    { name:'Cottage', w:2, h:2, hp:260, cost:{wood:22, gold:12}, tab:'frontier', kind:'economy', height:1.0,
                color:'#b23a2f', trim:'#f3e9cf', households:4, vision:4,
                income:{ gold:10, food:-3, treasury:1 },
                desc:'+4 households, +10 gold/day, eats 3 food/day. Never on the wall: a flipped home is a spawn node.' },
  militiahall:{ name:'Militia Hall', w:2, h:2, hp:380, cost:{wood:30, gold:40}, tab:'frontier', kind:'civic', height:1.25,
                color:'#3b4a6b', trim:'#c9a227', workers:2, vision:5,
                desc:'Musters Citizen Militia (M), up to 8 per hall. Trains the Sheriff\'s Posse and Veteran Company. Place beside the main gate.' },
  // ---- Charter ----
  chapel:     { name:'Chapel', w:2, h:2, hp:300, cost:{wood:25, stone:10, gold:30}, tab:'charter', kind:'civic', height:1.7,
                color:'#f3f0e6', trim:'#9a3a2f', workers:2, vision:5, aura:7, momentumBleed:3,
                income:{ treasury:2 },
                desc:'Conscience. Bleeds Momentum (-3/day). Recapture is twice as fast within its aura (7).' },
  courthouse: { name:'Courthouse', w:2, h:2, hp:340, cost:{wood:30, stone:20, gold:45}, tab:'charter', kind:'civic', height:1.5,
                color:'#d9d2bf', trim:'#3b4a6b', workers:3, vision:5, aura:7,
                desc:'Law. In its aura (7): occupation spreads slower, Seizure channels and megaphone stuns are shorter.' },
  deedoffice: { name:'Deed Office', w:2, h:2, hp:320, cost:{wood:25, stone:10, gold:50}, tab:'charter', kind:'civic', height:1.3, tech:'deeds',
                color:'#c9b98a', trim:'#5a4a12', workers:2, vision:5, aura:8,
                desc:'Property. Titled buildings in its aura (8) recapture 50% faster and survive their first flip at 15% HP.' },
  printshop:  { name:'Print Shop', w:2, h:2, hp:340, cost:{wood:35, stone:10, gold:60}, tab:'charter', kind:'civic', height:1.4, tech:'gazette',
                color:'#8a8a9a', trim:'#1a1a2a', workers:3, vision:13, aura:8,
                income:{ gold:3 },
                desc:'Speech. Scrapes Agitprop paint in its aura (8) every 8s and sees far (13). ANTIFA Goons hunt it.' },
  school:     { name:'Schoolhouse', w:2, h:2, hp:300, cost:{wood:30, gold:45}, tab:'charter', kind:'civic', height:1.3, tech:'school',
                color:'#d9c7a3', trim:'#b23a2f', workers:2, households:4, vision:5,
                income:{ gold:4, treasury:2 },
                desc:'+4 households, +4 gold, +2 Treasury/day, +1 Trust/day. Organizers and Man-Children are drawn to it: keep it inside the court radius, off the wall.' },
  lodge:      { name:'Lodge', w:2, h:2, hp:320, cost:{wood:40, gold:35}, tab:'charter', kind:'civic', height:1.2, tech:'lodge',
                color:'#7a5230', trim:'#c9a227', workers:1, households:6, vision:5, aura:8,
                desc:'Association. +6 households. A Militia Hall in its aura (8) musters twice as fast.' },
  // ---- Workshop ----
  farm:       { name:'Farm', w:3, h:3, hp:200, cost:{wood:15, gold:6}, tab:'workshop', kind:'economy', height:0.35,
                color:'#9db24f', trim:'#5e7a2c', workers:2, vision:3,
                income:{ food:12, treasury:1 },
                desc:'+12 food/day. Wave priority target. Keep it behind the curtain.' },
  mill:       { name:'Sawmill', w:2, h:2, hp:320, cost:{wood:12, gold:22}, tab:'workshop', kind:'industry', height:1.3,
                color:'#5c7a3a', trim:'#2f4a1c', workers:3, vision:4, treeBonus:2.5,
                income:{ wood:10, treasury:1 },
                desc:'+10 wood/day, +2.5 per adjacent tree tile. Industry: Seizure Crews want it.' },
  quarry:     { name:'Quarry', w:2, h:2, hp:320, cost:{wood:20, gold:25}, tab:'workshop', kind:'industry', height:0.6,
                color:'#7d7d7d', trim:'#444', workers:3, vision:4, needsStone:true,
                income:{ stone:12, treasury:1 },
                desc:'+12 stone/day. Must sit on or touch a stone deposit. Industry.' },
  mine:       { name:'Iron Mine', w:2, h:2, hp:340, cost:{wood:30, stone:10, gold:30}, tab:'workshop', kind:'industry', height:0.9, tech:'mining',
                color:'#6a6a72', trim:'#2a2a30', workers:3, vision:4, needsIron:true,
                income:{ iron:6, treasury:1 },
                desc:'+6 iron/day. Must sit on or touch an iron deposit. Industry.' },
  workshop:   { name:'Workshop', w:2, h:2, hp:360, cost:{wood:40, stone:15, gold:50}, tab:'workshop', kind:'industry', height:1.4, tech:'workshop',
                color:'#5a4a3a', trim:'#c9a227', workers:3, vision:4,
                income:{ gold:10, treasury:1 },
                desc:'+10 gold/day. Builds Field Pieces. Industry: a Seizure and Occasion-Cortex favorite.' },
  warehouse:  { name:'Warehouse', w:2, h:2, hp:400, cost:{wood:45, stone:10, gold:30}, tab:'workshop', kind:'economy', height:1.1, tech:'storage',
                color:'#8a6a3a', trim:'#3a2a1a', workers:1, vision:4, aura:6,
                desc:'Storage. Economy and industry buildings in its aura (6) produce 20% more.' },
};

const TABS = [
  { id:'frontier', name:'Frontier', key:'Z' },
  { id:'charter',  name:'Charter',  key:'X' },
  { id:'workshop', name:'Workshop', key:'C' },
];

const UNITS = {
  // ---- the Wave ----
  activist:  { name:'Activist', side:'enemy', hp:34, speed:1.35, dmg:3, bdmg:1.0, rate:1.0, range:1.15, r:0.22,
               aggro:6, desc:'Walker. Mass, soak, occupy.' },
  organizer: { name:'Organizer', side:'enemy', hp:55, speed:2.3, dmg:3, bdmg:1.2, rate:1.0, range:1.15, r:0.22,
               aggro:7, buff:3.0, prefer:['school','cottage','chapel','militiahall'], desc:'Runner. Buffs nearby Activists. Goes for schools, homes and chapels.' },
  manchild:  { name:'Man-Child', side:'enemy', hp:300, speed:1.05, dmg:5, bdmg:4, rate:0.8, range:1.3, r:0.42,
               aggro:6, tantrum:true, preferAfter:['school','cottage','chapel'], desc:'Oversized adult in a onesie. At 50% HP: Tantrum, then goes for the nearest school or cottage at triple damage.' },
  goon:      { name:'ANTIFA Goon', side:'enemy', hp:60, speed:2.6, dmg:6, bdmg:3, rate:1.2, range:1.15, r:0.22,
               aggro:9, jump:true, prefer:['printshop','deedoffice','townhall'], pack:3, desc:'All-black kit. Jumps walls and gates. Hunts the Print Shop, Deed Office and Town Hall in small packs.' },
  agitprop:  { name:'Agitprop Van', side:'enemy', hp:240, speed:1.4, dmg:0, bdmg:0, rate:1.0, range:0, r:0.5,
               aggro:8, paints:true, prefer:['cottage','farm','school'], desc:'Megaphone livestream van. Paints buildings: painted tiles take 50% more damage and pull the Wave toward them. A Print Shop scrapes paint.' },
  haes:      { name:'Heavy At Every Size', side:'enemy', hp:700, speed:0.9, dmg:8, bdmg:25, rate:0.7, range:1.3, r:0.45, armor:6,
               aggro:7, prefer:['gate','tower','tower_stone'], desc:'Body positivity on a reinforced mobility scooter with a battering-ram bumper. Ignores 6 damage per hit. Breaks gates and towers and escorts the rest in. "Every body is a wave body."' },
  seizure:   { name:'Seizure Crew', side:'enemy', hp:120, speed:1.6, dmg:2, bdmg:1.5, rate:1.0, range:1.15, r:0.28,
               aggro:8, seizure:true, channel:8, prefer:['workshop','mill','quarry','mine','vault'], desc:'Ignores colonists. Beelines industry and the Treasury. If the channel completes, the building flips even with HP left.' },
  nevertheless:{ name:'Nevertheless', side:'enemy', hp:130, hp2:130, speed:1.6, dmg:3, bdmg:1, rate:1.0, range:1.15, r:0.26,
               aggro:7, persist:true, megaphone:{ every:6, radius:4, dur:3 }, prefer:['school','chapel'], desc:'Pink hat, megaphone. Persist: two HP bars. Megaphone Blast deafens units and towers in 4 tiles (half fire rate for 3s). Marksman food.' },
  carebear:  { name:'Care Bear', side:'enemy', hp:280, speed:1.2, dmg:4, bdmg:2, rate:0.8, range:1.3, r:0.4,
               aggro:6, heals:{ types:['manchild','haes','goon'], radius:3, rate:9 }, desc:'Adult in a pastel bear fursuit with a heart on the chest and a lanyard. Heals Man-Children, Heavies and Goons 9 HP/s with hugs. Marksman food.' },
  // ---- lieutenants ----
  sernie:    { name:'Sernie Banders', title:'The Vacuum Wagon', side:'enemy', hp:1600, speed:0.8, dmg:6, bdmg:15, rate:0.8, range:1.5, r:0.6, armor:5, lt:true,
               aggro:99, prefer:['vault','townhall'], drain:{ radius:6, rate:2.5, crate:60 }, desc:'Elderly rumpled-coat orator on a vacuum wagon. Drains the Treasury 2.5/s near your buildings and dumps the gold as crates that block your streets. Retrieve the crates.' },
  liz:       { name:'Liz Barren', title:'The Desk on Wheels', side:'enemy', hp:1200, speed:1.0, dmg:5, bdmg:12, rate:0.8, range:1.5, r:0.55, armor:4, lt:true,
               aggro:99, prefer:['workshop','mill','quarry','mine'], regulation:true, desc:'Desk on wheels with plan placards. While she is on the map, repairs cost triple and new buildings open at half HP after a 10s permit review.' },
  alex:      { name:'Alex Occasion-Cortex', title:'The Green New Deal Float', side:'enemy', hp:1400, speed:0.9, dmg:5, bdmg:12, rate:0.8, range:1.5, r:0.6, armor:3, lt:true,
               aggro:99, prefer:['workshop','mill','quarry','mine'], shut:{ every:20, dur:25 }, desc:'Solar-panel float. Every 20s it shuts an industry "for the planet" for 25s, and every Seizure Crew on the map rushes it.' },
  // ---- map / chapter bosses ----
  warcommunism:{ name:'War Communism', title:'The Kitchen Train', side:'enemy', hp:4200, speed:0.7, dmg:8, bdmg:20, rate:0.8, range:1.6, r:0.7, armor:6, lt:true, boss:true,
               aggro:99, prefer:['farm','townhall'], revive:{ radius:5, delay:6 }, desc:'Armored kitchen train. Activists who fall within 5 tiles of it stand back up after 6s, once. Kill the train or fight far from it.' },
  gosplan:   { name:'Gosplan Annex', title:'The Walking Filing Hall', side:'enemy', hp:3600, speed:0.75, dmg:8, bdmg:18, rate:0.8, range:1.6, r:0.7, armor:5, lt:true, boss:true,
               aggro:99, prefer:['workshop','mill','quarry','mine','townhall'], siphon:{ share:0.3, cap:100 }, desc:'Walking filing hall. Siphons 30% of your income into a Public Fund bar; every time it fills, a Heavy At Every Size rolls out of the stacks.' },
  listening: { name:'Listening Session', title:'The HR Dais', side:'enemy', hp:2800, speed:0.8, dmg:6, bdmg:12, rate:0.8, range:1.6, r:0.65, armor:4, lt:true, boss:true,
               aggro:99, prefer:['chapel','school','townhall'], freeze:{ every:30, warn:5, dur:9 }, desc:'"Your voice matters (please wait)." Every 30s it announces a session: for 9s your build tray and unit commands are frozen. A Courthouse and a Print Shop each shorten it by 2s.' },
  committee: { name:'The Committee on Equity & Alignment', title:'The Giant Gavel Dais', side:'enemy', hp:9000, speed:0.55, dmg:10, bdmg:30, rate:0.8, range:1.8, r:0.9, armor:8, lt:true, boss:true, final:true,
               aggro:99, prefer:['townhall'], aura:8, desc:'The final dais. In its aura (8) occupation is 50% faster and repairs cost double; Momentum is locked high while it sits. At each HP quarter it tables a Resolution. If it touches the Town Hall the charter is superseded: instant loss.' },
  // ---- civilians ----
  homesteader:{ name:'Homesteader', side:'player', hp:40, speed:1.7, dmg:0, rate:1, range:0, r:0.2, civilian:true, vision:3, quiet:true,
               desc:'Worker. Walks between home and work. If the Wave reaches them they flee to the Town Hall; if caught, they get "organized" and leave the worker pool until that Activist is put down.' },
  // ---- ordered liberty ----
  minuteman: { name:'Minuteman', side:'player', hp:90, speed:3.2, dmg:12, rate:1.2, range:5.0, r:0.24,
               cost:{gold:40}, workers:1, train:8, quiet:true, vision:8, cap:6, from:'townhall', key:'N',
               desc:'Quiet scout. Clears the fog edge without pulling the whole Wave.' },
  militia:   { name:'Citizen Militia', side:'player', hp:150, speed:1.9, dmg:10, rate:1.0, range:4.0, r:0.24,
               cost:{gold:10}, workers:1, upkeep:0.1, vision:6, capPerHall:8, from:'militiahall',
               desc:'Loud line infantry. Costs gold every second while mobilized. Dismiss between waves (K).' },
  marksman:  { name:'Marksman', side:'player', hp:70, speed:2.2, dmg:42, rate:0.4, range:8.0, r:0.24,
               cost:{gold:60, wood:10}, workers:1, train:12, vision:9, cap:8, from:'townhall', tech:'marksmen', special:true, key:'J',
               desc:'Deletes specials. Range 8, slow fire, prefers Man-Children, Care Bears, vans and megaphones over Activists.' },
  posse:     { name:'Sheriff\'s Posse', side:'player', hp:170, speed:2.0, dmg:7, rate:1.1, range:3.0, r:0.26,
               cost:{gold:80}, workers:1, train:12, vision:6, cap:8, from:'militiahall', tech:'posse', scatter:6, key:'P',
               desc:'Scatter cleanup after a breach. Hits up to 6 targets within 3 tiles. Cannot fire through walls.' },
  fieldpiece:{ name:'Field Piece', side:'player', hp:220, speed:1.0, dmg:60, rate:0.25, range:7.0, minRange:2, r:0.4,
               cost:{gold:150, iron:30, stone:20}, workers:2, train:20, vision:7, cap:4, from:'workshop', tech:'fieldpieces', splash:1.6, key:'U',
               desc:'Wagon cannon. Wave-breaker: 60 damage in a 1.6-tile splash every 4s. Splash also scorches your own buildings and costs Trust.' },
  veteran:   { name:'Veteran Company', side:'player', hp:420, speed:1.6, dmg:20, rate:1.0, range:4.0, r:0.28, armor:3,
               cost:{gold:200, iron:10}, workers:2, train:20, vision:6, cap:4, from:'militiahall', tech:'veterans', key:'V',
               desc:'Few, late, hold a gate during recapture. Armor 3.' },
};

// Tech tree: three branches, ~13 nodes, researched at the Town Hall one at a time.
const TECH = {
  stonework:  { name:'Stonework', branch:'frontier', cost:{gold:60, stone:20}, time:30, requires:[], unlocks:['wall_stone','tower_stone'], desc:'Stone walls and stone towers.' },
  stakes:     { name:'Stakes & Traps', branch:'frontier', cost:{gold:40, wood:30}, time:20, requires:[], unlocks:['stakes'], desc:'Killbox floor in front of the gate.' },
  marksmen:   { name:'Marksmen', branch:'frontier', cost:{gold:90}, time:30, requires:['stakes'], unlocks:['marksman'], desc:'Long rifles for the specials.' },
  posse:      { name:'Sheriff\'s Posse', branch:'frontier', cost:{gold:110}, time:35, requires:['marksmen'], unlocks:['posse'], desc:'Scatter guns for breach cleanup.' },
  deeds:      { name:'Homestead Act', branch:'charter', cost:{gold:70}, time:25, requires:[], unlocks:['deedoffice'], desc:'Deed Office: titled tiles resist their first flip.' },
  gazette:    { name:'Free Press', branch:'charter', cost:{gold:70, wood:20}, time:25, requires:[], unlocks:['printshop'], desc:'Print Shop: scrapes paint, sees far.' },
  school:     { name:'Common School', branch:'charter', cost:{gold:80}, time:30, requires:['deeds'], unlocks:['school'], desc:'Schoolhouse: households, gold, Trust. A magnet.' },
  lodge:      { name:'Lodge & Grange', branch:'charter', cost:{gold:70}, time:30, requires:['gazette'], unlocks:['lodge'], desc:'Lodge: +6 households, faster musters nearby.' },
  mining:     { name:'Iron Mining', branch:'workshop', cost:{gold:50, wood:20}, time:25, requires:[], unlocks:['mine'], desc:'Iron Mine on iron deposits.' },
  workshop:   { name:'Workshop', branch:'workshop', cost:{gold:80}, time:30, requires:['mining'], unlocks:['workshop'], desc:'Workshop: gold, and it builds Field Pieces.' },
  storage:    { name:'Storage', branch:'workshop', cost:{gold:70, wood:30}, time:25, requires:[], unlocks:['warehouse'], desc:'Warehouse: +20% production in its aura.' },
  fieldpieces:{ name:'Field Pieces', branch:'workshop', cost:{gold:160, iron:20}, time:40, requires:['workshop'], unlocks:['fieldpiece'], desc:'Wagon cannon.' },
  veterans:   { name:'Veteran Company', branch:'workshop', cost:{gold:200, iron:20}, time:45, requires:['workshop','posse'], unlocks:['veteran'], desc:'Armored line company.' },
};

// Wave table by day. Scaled by Momentum (x 1 + M/150). `lt` = lieutenant added.
const WAVES = {
  2:  { activist:18 },
  3:  { activist:24, organizer:2 },
  4:  { activist:30, organizer:4 },
  5:  { activist:34, organizer:5, manchild:1, agitprop:1 },
  6:  { activist:40, organizer:6, manchild:2, agitprop:1 },
  7:  { activist:46, organizer:8, manchild:2, agitprop:1, seizure:1 },
  8:  { activist:52, organizer:10, manchild:3, agitprop:2, seizure:2 },
  9:  { activist:50, organizer:10, manchild:3, agitprop:2, seizure:2, goon:4, haes:1 },
  10: { activist:54, organizer:12, manchild:4, agitprop:2, seizure:2, goon:5, haes:1, nevertheless:1, lt:'sernie' },
  11: { activist:58, organizer:12, manchild:4, agitprop:2, seizure:3, goon:6, haes:2, nevertheless:1 },
  12: { activist:62, organizer:14, manchild:5, agitprop:3, seizure:3, goon:6, haes:2, nevertheless:2, carebear:1, lt:'liz' },
  13: { activist:66, organizer:14, manchild:5, agitprop:3, seizure:4, goon:8, haes:3, nevertheless:2, carebear:2 },
  14: { activist:70, organizer:16, manchild:6, agitprop:3, seizure:4, goon:8, haes:3, nevertheless:2, carebear:2, lt:'alex' },
  15: { activist:76, organizer:16, manchild:6, agitprop:3, seizure:5, goon:10, haes:4, nevertheless:3, carebear:3 },
  16: { activist:100, organizer:20, manchild:8, agitprop:4, seizure:6, goon:12, haes:5, nevertheless:4, carebear:4 },
  17: { activist:70, organizer:14, manchild:5, agitprop:3, seizure:4, goon:8, haes:3, nevertheless:2, carebear:2, boss:'warcommunism' },
  18: { activist:74, organizer:14, manchild:5, agitprop:3, seizure:5, goon:8, haes:3, nevertheless:3, carebear:3, boss:'gosplan' },
  19: { activist:78, organizer:16, manchild:6, agitprop:3, seizure:5, goon:9, haes:4, nevertheless:3, carebear:3, boss:'listening' },
  20: { activist:120, organizer:22, manchild:9, agitprop:4, seizure:7, goon:12, haes:6, nevertheless:4, carebear:4, boss:'committee', lt:'random' },
};

// Occupation skins: flavor only, same rules. Picked at random when a building flips.
const OCC_SKINS = {
  farm: ['Collective', 'Community Garden'], mill: ["People's Foundry", 'Maker Space'], quarry: ["People's Pit", 'Land Acknowledgment'],
  mine: ['State Mine', 'Extraction Circle'], workshop: ["People's Foundry", 'Maker Space'], school: ['Cadre School', 'Inclusive Classroom'],
  cottage: ['Commune', 'Roommate Collective'], printshop: ['State Broadcast', 'Livestream Hub'], chapel: ['Struggle Session Hall', 'Wellness Space'],
  courthouse: ["People's Tribunal", 'Restorative Circle'], deedoffice: ['Land Reform Office', 'Housing Justice Desk'], lodge: ['Party Cell', 'Affinity Group'],
  militiahall: ['Red Guard Post', 'Safety Team HQ'], warehouse: ['Ration Depot', 'Mutual Aid Pantry'], vault: ["People's Treasury", 'Reparations Fund'],
  farmDefault: ['Occupied'],
};

// Encampments: Village-of-Doom analog. Raid for loot; expect a backlash.
const ENCAMPMENTS = [
  { x: 9, y: 9 }, { x: 46, y: 6 }, { x: 5, y: 40 }, { x: 47, y: 46 }, { x: 27, y: 3 },
];
const ENCAMP_DEF = { name:'Encampment', w:3, h:3, hp:650, loot:{ wood:120, gold:90, stone:40 }, pulse:45, backlash:{ activist:10, organizer:2, manchild:1 } };

// Noise radius when a unit or tower fires: idle fog enemies inside it wake up.
const NOISE = { minuteman:2, marksman:3, militia:5, posse:6, veteran:5, fieldpiece:10, tower:6, tower_stone:7 };

function chapterName(day) {
  if (day <= 1) return 'Study Group';
  if (day <= 4) return 'General Strike';
  if (day <= 8) return 'Occupied Quad';
  if (day <= 11) return 'Cultural Inspection';
  if (day <= 15) return 'Five-Year Shock';
  if (day === 16) return 'The Big One';
  if (day === 17) return 'War Communism';
  if (day === 18) return 'Five-Year Plan';
  if (day === 19) return 'Cultural Inspection';
  return 'The Committee Arrives';
}

const START_RES = { wood:220, stone:60, iron:0, food:80, gold:320, treasury:250 };
const DIFFICULTY = {
  easy:   { name:'Study Group',     waves:0.7, res:1.4, desc:'Smaller waves, fatter start. Learn the verbs.' },
  normal: { name:'General Strike',  waves:1.0, res:1.0, desc:'The intended game.' },
  hard:   { name:'Five-Year Shock', waves:1.3, res:0.8, desc:'Bigger waves, lean start, Momentum bites.' },
};
const START_TRUST = 50, START_MOMENTUM = 10;
const RES_ORDER = ['wood', 'stone', 'iron', 'food', 'gold'];

// Campaign: seven missions following the GDD chapter titles. `schedule` overrides which lieutenant/boss
// rides with a given day's wave; 'full' keeps the survival schedule. Days = the final wave day.
const MISSIONS = [
  { id:'study',     name:'Study Group',           days:6,  seed:0,    waves:0.6, res:1.3, schedule:{},
    blurb:'A quiet county seat and a study group on the quad. Learn the verbs: wall the choke, muster, dismiss, recapture.', objective:'Survive Day 6.' },
  { id:'strike',    name:'General Strike',        days:9,  seed:1101, waves:0.8, res:1.1, schedule:{},
    blurb:'Organizers run ahead of the walkers now and go for your homes. Build a Chapel and bleed Momentum.', objective:'Survive Day 9.' },
  { id:'quad',      name:'Occupied Quad',         days:12, seed:2202, waves:0.9, res:1.0, schedule:{ 8:{ lt:'sernie' } }, preoccupied:3,
    blurb:'You inherit a town with three buildings already flipped. Sernie Banders and his vacuum wagon arrive on Day 8.', objective:'Recapture the quad. Survive Day 12.' },
  { id:'warcom',    name:'War Communism',         days:14, seed:3303, waves:1.0, res:1.0, schedule:{ 10:{ lt:'liz' }, 13:{ boss:'warcommunism' } },
    blurb:'Liz Barren regulates you on Day 10; the kitchen train rolls in on Day 13. Fight far from it or kill it fast.', objective:'Survive Day 14.' },
  { id:'inspect',   name:'Cultural Inspection',   days:16, seed:4404, waves:1.0, res:0.95, schedule:{ 9:{ lt:'sernie' }, 12:{ lt:'alex' }, 15:{ boss:'listening' } },
    blurb:'HR is holding a Listening Session on Day 15. A Courthouse and a Print Shop shorten it.', objective:'Survive Day 16.' },
  { id:'shock',     name:'Five-Year Shock',       days:18, seed:5505, waves:1.1, res:0.9, schedule:{ 10:{ lt:'liz' }, 13:{ lt:'alex' }, 16:{ boss:'gosplan' }, 17:{ boss:'warcommunism' } },
    blurb:'Gosplan Annex siphons the budget on Day 16 and War Communism follows. Keep the Public Fund from filling.', objective:'Survive Day 18.' },
  { id:'committee', name:'The Committee Arrives', days:20, seed:0,    waves:1.2, res:0.9, schedule:'full',
    blurb:'Everything at once on the County Seat. The Committee tables its Resolutions on Day 20. Do not let it touch the Hall.', objective:'Adjourn the Committee.' },
];

const NEON = ['#ff5fd0', '#5ff0ff', '#a6ff4d', '#ffe14d', '#ff7a4d'];
