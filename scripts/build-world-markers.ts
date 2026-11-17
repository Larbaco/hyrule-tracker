// Where each remaining collectible sits in the world, read from the player's own level
// files (romfs/Banc/**/*.bcett.byml.zs). Only the item id, the scene and a position end up in
// data/world-markers.json; no game files are copied.
//   npx tsx scripts/build-world-markers.ts <romfs path>
//
// How each kind is matched to its checklist row:
// - Gossip stone: the actor's Name is GOSSIP_<AREA>_<NN>, the same text as the row's id.
// - Field Big Poe: Dynamic.PoeBig_IsCleared is HyruleField_Defeat_BigPoe_<NN>, the row's flag.
// - Silver rupee challenge: Obj_silverRupeeCounter of the dungeon folder + room index (its
//   DefaultDungeonRoomIndex) names the room; the pin sits on the mean of its linked rupees.
// - Cows: Animal_Cow_LinkHouse (the "house" reward) and the first cow inside Lon Lon Ranch (the
//   "milk" reward, which any cow gives).
import fs from 'node:fs';
import path from 'node:path';
import { RomFs } from '../src/gamedata/romfs.js';
import { parseByml } from '../src/gamedata/byml.js';

const romfs = process.argv[2];
if (!romfs) { console.error('Usage: npx tsx scripts/build-world-markers.ts <romfs path>'); process.exit(1); }
const rom = new RomFs(romfs);
type Actor = { Gyaml: string; Hash: bigint; Name?: string; Translate?: number[]; Dynamic?: Record<string, unknown>; Links?: { Dst: bigint }[] };
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const round = (v: number) => Math.round(v * 10) / 10;

interface Marker { stage: string; era?: 'child' | 'adult'; x: number; y: number; z: number }
const markers: Record<string, Marker> = {};
const cows: (Marker & { file: string })[] = [];
const eraOf = (f: string) => f.match(/_(Child|Adult)(?:_|\.)/)?.[1]?.toLowerCase() as 'child' | 'adult' | undefined;
// A row seen in both the child and the adult scene has no single era.
function put(id: string, m: Marker) {
  const prev = markers[id];
  if (prev && prev.era !== m.era) prev.era = undefined;
  else if (!prev) markers[id] = m;
}

for (const f of walk(path.join(romfs, 'Banc')).filter(f => f.endsWith('.bcett.byml.zs'))) {
  const rel = path.relative(romfs, f).split(path.sep).join('/');
  const stage = rel.split('/')[1];
  if (/DreamWorld|MasterQuest|Museum|Test|Title/i.test(rel)) continue;
  let actors: Actor[];
  try { actors = (parseByml(rom.read(rel)) as unknown as { Actors?: Actor[] }).Actors ?? []; } catch { continue; }
  const era = eraOf(rel.split('/').pop()!);
  const at = (a: Actor) => { const [x, y, z] = (a.Translate ?? [0, 0, 0]).map(round); return { stage, era, x, y, z }; };
  const byHash = new Map(actors.map(a => [a.Hash, a]));
  for (const a of actors) {
    if (!a.Translate) continue;
    if (a.Gyaml === 'Obj_GossipStone_A_01' && a.Name?.startsWith('GOSSIP_')) put('gossip_stones.' + a.Name.slice(7), at(a));
    const poe = typeof a.Dynamic?.PoeBig_IsCleared === 'string' ? /_BigPoe_(\d+)$/.exec(a.Dynamic.PoeBig_IsCleared)?.[1] : undefined;
    if (a.Gyaml === 'Enemy_Poe_Big' && poe) put('big_poe_spots.' + poe, at(a));
    if (/^Animal_Cow(_LinkHouse)?$/.test(a.Gyaml)) cows.push({ ...at(a), file: a.Gyaml });
    if (/^Obj_silverRupeeCounter(_d+)?$/.test(a.Gyaml)) {
      const room = String(a.Dynamic?.DefaultDungeonRoomIndex ?? '').padStart(2, '0');
      const tokens = (a.Links ?? []).map(l => byHash.get(l.Dst)).filter((t): t is Actor => !!t?.Translate);
      const list = tokens.length ? tokens : [a];
      const mean = (i: number) => round(list.reduce((s, t) => s + t.Translate![i], 0) / list.length);
      put(`silver_rupees.${stage}.${room}`, { stage, era, x: mean(0), y: mean(1), z: mean(2) });
    }
  }
}
// Silver rupee rows are named by the save flag (same list as src/core/companion.ts): [flag, level folder, room].
const coinRooms: [string, string, string][] = [
  ['IceCavern_Room06_SilverRupeeGet', 'IceCavern', '06'],
  ['BottomOfTheWell_Level_Room_09_A_SilverRupee_GetAll', 'BottomOfTheWell', '09'],
  ...['02', '06', '09'].map((n): [string, string, string] => [`GerudoTrainingGround_Dungeon_Room${n}_SilverRupee`, 'GerudoTrainingGround', n]),
  ...['03', '10', '14', '16'].map((n): [string, string, string] => [`InsideGanonCastle_Dungeon_Room${n}_SilverRupee`, 'InsideGanonCastle', n]),
];
for (const [flag, folder, room] of coinRooms) {
  const found = markers[`silver_rupees.${folder}.${room}`];
  if (found) markers['silver_rupees.' + flag] = found; else console.warn('no silver rupee room for', flag);
}
for (const k of Object.keys(markers)) if (/^silver_rupees\.[A-Za-z]+\.\d\d$/.test(k)) delete markers[k];
const linkHouse = cows.find(c => c.file === 'Animal_Cow_LinkHouse');
// The ranch is part of the HyruleField scene: its cows are the ones inside the ranch's box.
const ranchCow = cows.find(c => c.file === 'Animal_Cow' && c.x >= -165 && c.x <= -14 && c.z >= 186 && c.z <= 305);
if (linkHouse) markers['cow_rewards.house'] = linkHouse; else console.warn('no cow in Link\'s house');
if (ranchCow) markers['cow_rewards.milk'] = ranchCow; else console.warn('no cow at the ranch');
const clean = Object.fromEntries(Object.entries(markers).sort(([a], [b]) => a.localeCompare(b)).map(([k, { stage, era, x, y, z }]) => [k, { stage, ...(era ? { era } : {}), x, y, z }]));
fs.writeFileSync('data/world-markers.json', JSON.stringify(clean, null, 1) + '\n');
const byKind = (p: string) => Object.keys(clean).filter(k => k.startsWith(p)).length;
console.log(`Wrote data/world-markers.json: ${byKind('gossip_stones')} gossip stones, ${byKind('big_poe_spots')} Big Poes, ${byKind('silver_rupees')} silver rupee rooms, ${byKind('cow_rewards')} cows`);
