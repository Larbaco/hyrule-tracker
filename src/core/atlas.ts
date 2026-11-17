import type { GameDataFile } from '../gamedata/parser.js';
import { murmur3 } from '../gamedata/murmur3.js';

export interface AtlasRule { id: string; hex32: number[]; hex64: string[] }
export type AtlasStatus = 'done' | 'todo' | 'unknown';

/**
 * Marker id -> checklist row id, for markers that watch the same save flag as exactly one row
 * (their detect rule names the same 64-bit flag, or the same Int/Bool by name or hash).
 * Ticking either one then ticks both. Markers matching no row or several are left out.
 */
export function linkAtlas(items: AtlasRule[], entries: Record<string, { detect?: unknown } | undefined>): Record<string, string> {
  const index = new Map<string, Set<string>>();
  const put = (key: string, id: string) => index.set(key, (index.get(key) ?? new Set()).add(id));
  for (const [id, entry] of Object.entries(entries)) {
    const walk = (x: unknown) => {
      if (!x || typeof x !== 'object') return;
      const r = x as Record<string, unknown>;
      if (typeof r.b64 === 'string') put('b' + BigInt(r.b64).toString(16), id);
      if (typeof r.name === 'string') put('n' + (murmur3(r.name) >>> 0), id);
      if (typeof r.key === 'number') put('n' + (r.key >>> 0), id);
      Object.values(r).forEach(walk);
    };
    walk(entry?.detect);
  }
  const links: Record<string, string> = {};
  for (const item of items) {
    const hit = new Set<string>();
    for (const h of item.hex64) index.get('b' + BigInt(h).toString(16))?.forEach(id => hit.add(id));
    for (const h of item.hex32) index.get('n' + (h >>> 0))?.forEach(id => hit.add(id));
    if (hit.size === 1) links[item.id] = [...hit][0];
  }
  return links;
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
