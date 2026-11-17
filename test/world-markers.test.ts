import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extendChecklist, type CompanionData, type WorldMarker } from '../src/core/companion.js';
import { locatePlacement, type AtlasPlace } from '../src/core/position.js';
import type { ChecklistFile, MappingFile } from '../src/core/tracker.js';

const load = (file: string) => JSON.parse(readFileSync(new URL('../data/' + file, import.meta.url), 'utf8'));
const markers: Record<string, WorldMarker> = load('world-markers.json');
const atlas: { places: AtlasPlace[] } = load('atlas.json');

describe('world markers', () => {
  const checklist: ChecklistFile = load('checklist.json');
  extendChecklist(checklist, load('save-mapping.json') as MappingFile, load('companion.json') as CompanionData);
  const ids = new Set(checklist.categories.flatMap(c => c.items.map(i => i.id)));

  it('only names checklist rows that exist', () => {
    expect(Object.keys(markers).filter(id => !ids.has(id))).toEqual([]);
  });

  it('covers every gossip stone and Big Poe, and the rooms that have a map', () => {
    const count = (prefix: string) => Object.keys(markers).filter(id => id.startsWith(prefix)).length;
    expect(count('gossip_stones.')).toBe([...ids].filter(id => id.startsWith('gossip_stones.')).length);
    expect(count('big_poe_spots.')).toBe(10);
    expect(count('cow_rewards.')).toBe(2);
    expect(count('silver_rupees.')).toBeGreaterThanOrEqual(8);
  });

  it('projects onto the atlas where the Gold Skulltulas of the same area sit', () => {
    // Skulltula actors of Kokiri Forest (child scene) and the atlas's own marker positions for them.
    const projected = locatePlacement('KokiriForest', 'child', { x: 8, y: 113, z: -23 }, atlas.places)[0];
    expect(projected.placeId).toBe('kokiri');
    expect(projected.at!.x).toBeCloseTo(0.537, 1);
    expect(projected.at!.y).toBeCloseTo(0.422, 1);
  });

  it('puts the Lon Lon Ranch cow on the ranch, not on the field', () => {
    const fix = locatePlacement(markers['cow_rewards.milk'].stage, markers['cow_rewards.milk'].era, markers['cow_rewards.milk'], atlas.places)[0];
    expect(fix.placeId).toBe('lonlon');
  });
});
