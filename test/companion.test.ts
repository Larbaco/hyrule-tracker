import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { companionProgress, extendChecklist, type CompanionData } from '../src/core/companion.js';
import { evaluateAtlas } from '../src/core/atlas.js';
import { Tracker } from '../src/core/tracker.js';
import { murmur3 } from '../src/gamedata/murmur3.js';
import type { GameDataFile, Value } from '../src/gamedata/parser.js';
import { Controller } from '../src/main/controller.js';
import { SettingsStore } from '../src/main/settings.js';

const load = (file: string) => JSON.parse(readFileSync(new URL('../data/' + file, import.meta.url), 'utf8'));
const data: CompanionData = load('companion.json');
const save: GameDataFile = { version: 0x2d80eb, dataStart: 0, size: 0, entries: new Map(), bool64: new Set(), warnings: [] };
function entry(key: number | string, value: Value) {
  const hash = typeof key === 'number' ? key : murmur3(key);
  save.entries.set(hash, { hash, value, type: typeof value === 'boolean' ? 'Bool' : 'Int', recordOffset: 0 });
}

describe('expanded remake coverage', () => {
  it('includes the fixed save inventories and identifies located flags', () => {
    expect([data.statues.length, data.rematches.length, data.chests.length, data.notes.length, data.scarecrows.length]).toEqual([84, 25, 206, 23, 16]);
    expect(data.rematches.every(r => r.actor && r.completed)).toBe(true);
    expect(new Set(data.chests.map(chest => chest.hash)).size).toBe(206);
    expect(data.chests.filter(chest => chest.stage).length).toBeGreaterThanOrEqual(190);
  });

  it('reads quest, enemy rematch, treasure and fairy milestones from the same save', () => {
    const checklist = load('checklist.json');
    const map = load('save-mapping.json');
    extendChecklist(checklist, map, data);
    const tracker = new Tracker(checklist, map);
    entry('Step_SubEvent_GetMelodySun', murmur3('Complete'));
    const g = data.rematches.find(r => r.actor === 'Enemy_DungeonBoss_Gohma')!;
    entry(g.completed!, true);
    entry(g.timeKeys.find(k => k.field === murmur3('BestTimeFrame'))!.key, 1234);
    entry(data.chests[0].hash, true);
    entry(data.notes[0].hash, true);
    const result = tracker.evaluate(save);
    const category = (id: string) => result.categories.find(c => c.id === id)!;
    expect(category('side_quests').total).toBe(7);
    expect(category('side_quests').items.at(-1)?.done).toBe(true);
    expect(category('rematches').done).toBe(1);
    expect(category('chests').done).toBe(1);
    expect(category('fairy_thoughts').done).toBe(1);
    expect(companionProgress(data, save).rematches.find(r => r.id.endsWith(g.actor!))?.frames).toBe(1234);
  });

  it('separates verified, missing and unknown map markers', () => {
    const local: GameDataFile = { ...save, entries: new Map(), bool64: new Set([5n]) };
    expect(evaluateAtlas([
      { id: 'collected', hex32: [], hex64: ['0x5'] },
      { id: 'pending', hex32: [], hex64: ['0x6'] },
      { id: 'unmapped', hex32: [7], hex64: [] },
    ], local)).toEqual({ collected: 'done', pending: 'todo', unmapped: 'unknown' });
  });

  it('reads minigame victories and keeps unobservable prizes available for manual tracking', () => {
    const checklist = load('checklist.json');
    const map = load('save-mapping.json');
    extendChecklist(checklist, map, data);
    const tracker = new Tracker(checklist, map);
    const local: GameDataFile = { ...save, entries: new Map() };
    for (const [name, value] of [
      ['MiniGame_BombchuBowling_ClearFirstTime', true],
      ['MiniGame_BombchuBowling_ClearSecondTime', false],
      ['MiniGame_HorsebackArchery_BestScore', 900],
      ['MiniGame_HorseBackArchery_Get_Quiver', false],
      ['GraveYard_DiggingHoleTour_Drop_HeartPiece', true],
      ['MiniGame_DampeRace_ClearCount', 1],
      ['UnderTheGrave_DampeRace_HeartGeted', false],
    ] as const) {
      const hash = murmur3(name);
      local.entries.set(hash, { hash, value, type: typeof value === 'boolean' ? 'Bool' : 'Int', recordOffset: 0 });
    }
    const results = tracker.evaluate(local).categories.find(c => c.id === 'minigames')!.items;
    const state = (id: string) => results.find(i => i.id === 'minigames.' + id)?.state;
    expect(state('bowling_first')).toBe('yes');
    expect(state('bowling_second')).toBe('no');
    expect(state('archery_750')).toBe('yes');
    expect(state('archery_1400')).toBe('no');
    expect(state('dampe_dig')).toBe('yes');
    expect(state('dampe_race_win')).toBe('yes');
    expect(state('dampe_race')).toBe('no');
    expect(state('shooting_child_expert')).toBe('unmapped');
    expect(companionProgress(data, local).minigameScores.archery_750).toBe(900);
  });

  it('refreshes the selected save even when its disk timestamp is unchanged', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'hyrule-refresh-'));
    const slot = join(dir, 'slot_00');
    mkdirSync(slot);
    const progress = join(slot, 'progress.sav');
    const stamp = new Date('2026-11-16T20:00:00Z');
    const writeHearts = (hearts: number) => {
      const data = Buffer.alloc(0x38);
      data.writeUInt32LE(0x01020304, 0);
      data.writeUInt32LE(0x002d80eb, 4);
      data.writeUInt32LE(data.length, 8);
      data.writeUInt32LE(2, 0x2c); // Int section
      data.writeUInt32LE(murmur3('PlayerStatus.MaxLife'), 0x30);
      data.writeUInt32LE(hearts * 4, 0x34);
      writeFileSync(progress, data);
      utimesSync(progress, stamp, stamp);
    };
    const settings = new SettingsStore(join(dir, 'settings.json'));
    settings.data.saveDir = dir;
    settings.data.live.enabled = false;
    const appDir = fileURLToPath(new URL('..', import.meta.url));
    const controller = new Controller({ appDir, userData: dir, snapshots: join(dir, 'snapshots'), version: 'test' }, settings);
    try {
      writeHearts(7);
      await controller.start();
      expect(controller.state.summary?.hearts).toBe(7);
      writeHearts(8);
      await controller.refresh(false);
      expect(controller.state.summary?.hearts).toBe(7);
      await controller.refreshNow();
      expect(controller.state.summary?.hearts).toBe(8);
      expect(controller.state.saveReadError).toBe(false);
      controller.stop(); // Exercise the forced reads without a concurrent save watcher.
      writeFileSync(progress, Buffer.alloc(0x38));
      await controller.refreshNow();
      expect(controller.state.summary?.hearts).toBe(8);
      expect(controller.state.saveReadError).toBe(true);
      writeHearts(9);
      await controller.refreshNow();
      expect(controller.state.summary?.hearts).toBe(9);
      expect(controller.state.saveReadError).toBe(false);
    } finally {
      controller.stop();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
