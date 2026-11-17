import type { GameDataFile } from '../gamedata/parser.js';
import { murmur3 } from '../gamedata/murmur3.js';
import type { Rule } from '../gamedata/detect.js';

export interface AtlasRule { id: string; hex32: number[]; hex64: string[] }
export type AtlasStatus = 'done' | 'todo' | 'unknown';

/**
 * Marker id -> checklist row id, for markers that watch the same save flag as exactly one row
 * (their detect rule names the same 64-bit flag, or the same Int/Bool by name or hash).
 * Ticking either one then ticks both. Markers matching no row or several are left out.
 */
export function linkAtlas(items: AtlasRule[], entries: Record<string, { detect?: unknown } | undefined>, extra: (id: string) => boolean = () => false): Record<string, string> {
  const index = new Map<string, Set<string>>();
  const size = new Map<string, number>();
  const put = (key: string, id: string) => { index.set(key, (index.get(key) ?? new Set()).add(id)); size.set(id, (size.get(id) ?? 0) + 1); };
  for (const [id, entry] of Object.entries(entries)) {
    const walk = (x: unknown) => {
      if (!x || typeof x !== 'object') return;
      const r = x as Record<string, unknown>;
      if (typeof r.b64 === 'string') put('b' + BigInt(r.b64).toString(16), id);
      if (typeof r.name === 'string') {
        const chest = /^IsTreasureBoxOpen\.(\d+)$/.exec(r.name);
        if (chest) put('b' + BigInt(chest[1]).toString(16), id);
        put('n' + (murmur3(r.name) >>> 0), id);
      }
      if (typeof r.key === 'number') put('n' + (r.key >>> 0), id);
      else if (typeof r.key === 'string' && /^0x[0-9a-f]+$/i.test(r.key)) put('n' + (Number(r.key) >>> 0), id);
      Object.values(r).forEach(walk);
    };
    walk(entry?.detect);
  }
  const links: Record<string, string> = {};
  for (const item of items) {
    const hit = new Set<string>();
    for (const h of item.hex64) index.get('b' + BigInt(h).toString(16))?.forEach(id => hit.add(id));
    for (const h of item.hex32) index.get('n' + (h >>> 0))?.forEach(id => hit.add(id));
    // Several rows can watch one flag (a minigame row repeating a heart piece, a quest that bundles all six fairies).
    // The row from the original checklist wins over added ones, then the one that watches the fewest flags.
    const base = [...hit].filter(id => !extra(id));
    const pool = base.length ? base : [...hit];
    pool.sort((a, b) => (size.get(a) ?? 0) - (size.get(b) ?? 0));
    if (pool.length && (pool.length === 1 || (size.get(pool[0]) ?? 0) < (size.get(pool[1]) ?? 0))) links[item.id] = pool[0];
  }
  return links;
}

/**
 * Markers whose save flag differs from the one their checklist row reads, paired by place and description.
 * No save checked so far had either flag set, so neither is known to be the right one: the row counts both
 * (joinMarkerFlags). The two Lost Woods soils are paired by order (01 by the bridge, 02 by the Scrubs), unconfirmed.
 */
export const PAIRED_MARKERS: Record<string, string> = {
  'kokiri-bean-01': 'bean_spots.KokiriForest', 'perdido-bean-01': 'bean_spots.LostWood01', 'perdido-bean-02': 'bean_spots.LostWood02',
  'cementerio-bean-01': 'bean_spots.Graveyard', 'rio-bean-01': 'bean_spots.ZoraRiver', 'lago-bean-01': 'bean_spots.LakeHylia',
  'sendero-bean-01': 'bean_spots.DeathMountainTrail', 'crater-bean-01': 'bean_spots.DeathMountainCrater',
  'valle-bean-01': 'bean_spots.GerudoValley', 'coloso-bean-01': 'bean_spots.DesertColossus',
  'cementerio-heart-02': 'heart_pieces.019', 'valle-heart-02': 'heart_pieces.004',
  'lago-bottle-01': 'bottles.rutos_letter_bottle', 'ciudadela-bottle-01': 'bottles.poe_collector_bottle',
};

/**
 * Links the paired markers to their rows and adds each marker's own flag to the row's rule (`any`),
 * so the row is done when either flag is set. Returns marker id -> row id for the pairs found on both sides.
 */
export function joinMarkerFlags(items: AtlasRule[], entries: Record<string, { detect?: Rule | null } | undefined>, pairs = PAIRED_MARKERS): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of items) {
    const row = pairs[item.id];
    const entry = row ? entries[row] : undefined;
    if (!row || !entry) continue;
    out[item.id] = row;
    const own: Rule[] = [...item.hex32.map(h => ({ key: '0x' + (h >>> 0).toString(16) })), ...item.hex64.map(b64 => ({ b64 }))];
    if (own.length && entry.detect) entries[row] = { ...entry, detect: { any: [entry.detect, ...own] } };
  }
  return out;
}

/**
 * Statuses from the save, plus the markers ticked by hand (only those the save doesn't already show as done).
 * A linked marker follows its checklist row's tick (`links`); the others have a tick of their own.
 */
export function evaluateAtlasWithManual(items: AtlasRule[], save: GameDataFile, manual: Record<string, boolean>, links: Record<string, string> = {}): { status: Record<string, AtlasStatus>; manual: Record<string, true> } {
  const status = evaluateAtlas(items, save);
  const ticked: Record<string, true> = {};
  for (const item of items) if (manual[links[item.id] ?? item.id] && status[item.id] !== 'done') { status[item.id] = 'done'; ticked[item.id] = true; }
  return { status, manual: ticked };
}

export function evaluateAtlas(items: AtlasRule[], save: GameDataFile): Record<string, AtlasStatus> {
  return Object.fromEntries(items.map(item => {
    const saved = item.hex32.map(key => save.entries.get(key)?.value);
    const done = saved.some(v => v === true || (typeof v === 'number' && v > 0)) ||
      item.hex64.some(hex => save.bool64.has(BigInt(hex)));
    const known = item.hex64.length > 0 || saved.some(v => typeof v === 'boolean' || typeof v === 'number');
    return [item.id, done ? 'done' : known ? 'todo' : 'unknown'];
  }));
}
