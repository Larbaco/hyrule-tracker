import { expect, it } from 'vitest';
import discoveries from '../data/easter-eggs.json';
import { LOCAL_NAMES } from '../src/core/companion';

it('ships unique discoveries with a known region, localized clues and trusted source URLs', () => {
  const regions = new Set(Object.values(LOCAL_NAMES));
  const ids = discoveries.map(discovery => discovery.id);
  expect(ids.length).toBeGreaterThan(0);
  expect(new Set(ids).size).toBe(ids.length);
  for (const entry of discoveries) {
    expect(entry.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(regions.has(entry.region), entry.region).toBe(true);
    expect(['detail', 'interaction', 'dialogue']).toContain(entry.kind);
    expect(entry.sources.length, entry.id).toBeGreaterThan(0);
    for (const source of entry.sources) expect(new URL(source).protocol).toBe('https:');
    for (const locale of ['pt', 'en', 'es'] as const) {
      const copy = entry.text[locale];
      expect(copy.title.trim(), entry.id).not.toBe('');
      expect(copy.hint.trim(), entry.id).not.toBe('');
      expect(copy.solution.trim(), entry.id).not.toBe('');
    }
  }
});
