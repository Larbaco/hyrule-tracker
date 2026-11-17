import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { linkAtlas } from '../src/core/atlas.js';

const read = (f: string) => JSON.parse(readFileSync(`data/${f}`, 'utf8'));

describe('linkAtlas', () => {
  const items = read('atlas.json').items;
  const links = linkAtlas(items, read('save-mapping.json').entries);

  it('links every Gold Skulltula marker to its own checklist row', () => {
    const gs = items.filter((i: { cat: string }) => i.cat === 'gs');
    const linked = gs.map((i: { id: string }) => links[i.id]);
    expect(linked.every((id: string | undefined) => id?.startsWith('gold_skulltulas.'))).toBe(true);
    expect(new Set(linked).size).toBe(gs.length);
  });

  it('leaves markers with no single matching row unlinked', () => {
    expect(items.filter((i: { cat: string }) => i.cat === 'bean').every((i: { id: string }) => !links[i.id])).toBe(true);
  });
});
