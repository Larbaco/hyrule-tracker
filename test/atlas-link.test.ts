import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { joinMarkerFlags, linkAtlas, PAIRED_MARKERS } from '../src/core/atlas.js';
import { extendChecklist, type CompanionData } from '../src/core/companion.js';
import { evaluate } from '../src/gamedata/detect.js';
import type { GameDataFile } from '../src/gamedata/parser.js';

const read = (f: string) => JSON.parse(readFileSync(`data/${f}`, 'utf8'));
type Marker = { id: string; cat: string; hex32: number[]; hex64: string[] };

describe('linkAtlas', () => {
  const items: Marker[] = read('atlas.json').items;
  const links = linkAtlas(items, read('save-mapping.json').entries);

  it('links every Gold Skulltula marker to its own checklist row', () => {
    const gs = items.filter(i => i.cat === 'gs');
    const linked = gs.map(i => links[i.id]);
    expect(linked.every(id => id?.startsWith('gold_skulltulas.'))).toBe(true);
    expect(new Set(linked).size).toBe(gs.length);
  });

  it('leaves markers with no single matching row unlinked', () => {
    expect(items.filter(i => i.cat === 'bean').every(i => !links[i.id])).toBe(true);
  });
});

describe('checklist and map, as the app builds them', () => {
  const items: Marker[] = read('atlas.json').items;
  const checklist = read('checklist.json');
  const mapping = read('save-mapping.json');
  const base = new Set<string>(checklist.categories.flatMap((c: { items: { id: string }[] }) => c.items.map(i => i.id)));
  extendChecklist(checklist, mapping, read('companion.json') as CompanionData);
  const paired = joinMarkerFlags(items, mapping.entries);
  const links = { ...linkAtlas(items, mapping.entries, id => !base.has(id)), ...paired };
  const rows = new Set<string>(checklist.categories.flatMap((c: { items: { id: string }[] }) => c.items.map(i => i.id)));

  it('gives every map marker a checklist row', () => {
    expect(items.filter(i => !links[i.id]).map(i => i.id)).toEqual([]);
    expect(Object.values(links).every(id => rows.has(id))).toBe(true);
  });

  it('prefers the original row when an added one reads the same flag', () => {
    // The Dampé dig heart piece is also a minigame row; the map marker belongs to the heart piece.
    expect(links['cementerio-heart-01']).toBe('heart_pieces.002');
    // "To the Great Fairy" bundles all six fountains; each fairy marker keeps its own fountain.
    expect(items.filter(i => i.cat === 'fairy').every(i => links[i.id]?.startsWith('great_fairies.'))).toBe(true);
  });

  it('links fairy thoughts written as hex keys', () => {
    expect(items.filter(i => i.cat === 'thought').every(i => links[i.id]?.startsWith('fairy_thoughts.'))).toBe(true);
  });

  it('counts a paired marker\'s own flag on its row', () => {
    const marker = items.find(i => i.id === 'cementerio-bean-01')!;
    expect(PAIRED_MARKERS[marker.id]).toBe('bean_spots.Graveyard');
    const save: GameDataFile = { version: 0, dataStart: 0, size: 0, entries: new Map(), bool64: new Set(), warnings: [] };
    const key = marker.hex32[0] >>> 0;
    save.entries.set(key, { hash: key, value: true, type: 'Bool', recordOffset: 0 });
    expect(evaluate(mapping.entries['bean_spots.Graveyard'].detect, save)).toBe('yes');
  });
});
