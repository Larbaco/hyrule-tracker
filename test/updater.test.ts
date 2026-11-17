import { describe, expect, it } from 'vitest';
import { EventEmitter } from 'node:events';
import { createUpdater, notesToSections, type AutoUpdaterLike } from '../src/main/updater.js';
import type { UpdateState } from '../src/shared/types.js';

function fake() {
  const ee = new EventEmitter();
  const calls: string[] = [];
  const au = {
    autoDownload: true, autoInstallOnAppQuit: true, allowPrerelease: true,
    on: (e: string, l: (...a: any[]) => void) => ee.on(e, l),
    checkForUpdates: async () => { calls.push('check'); },
    downloadUpdate: async () => { calls.push('download'); },
    quitAndInstall: () => { calls.push('install'); },
  } satisfies AutoUpdaterLike;
  return { ee, au, calls };
}

describe('notesToSections', () => {
  it('turns GitHub release HTML into sections and entries, the leading bold words as the title', () => {
    const html = '<h3>New</h3>\n<ul>\n<li><strong>Play time.</strong> The <strong>Overview</strong> shows it.</li>\n<li>Fix &amp; polish</li>\n</ul>\n<h3>Fixed</h3><ul><li><p><strong>Crash:</strong> gone</p></li></ul><script>x()</script>';
    expect(notesToSections(html)).toEqual([
      { title: 'New', items: [{ title: 'Play time', text: 'The Overview shows it.' }, { text: 'Fix & polish' }] },
      { title: 'Fixed', items: [{ title: 'Crash', text: 'gone' }] },
    ]);
  });
  it('accepts a list of notes, plain text and empty input', () => {
    expect(notesToSections([{ version: '1', note: '<p>Hi</p>' }])).toEqual([{ items: [{ text: 'Hi' }] }]);
    expect(notesToSections('one\ntwo')).toEqual([{ items: [{ text: 'one' }, { text: 'two' }] }]);
    expect(notesToSections(undefined)).toEqual([]);
  });
});

describe('createUpdater', () => {
  it('never downloads or installs by itself, and carries the changelog through states', async () => {
    const { ee, au, calls } = fake();
    const states: UpdateState[] = [];
    const u = createUpdater({ autoUpdater: au, notify: s => states.push(s) });
    expect(au.autoDownload).toBe(false);
    expect(au.autoInstallOnAppQuit).toBe(false);

    ee.emit('update-available', { version: '1.1.0', releaseNotes: '<ul><li>Cool</li></ul>' });
    expect(u.getState()).toMatchObject({ status: 'available', version: '1.1.0', notes: [{ items: [{ text: 'Cool' }] }] });
    expect(calls).toEqual([]);

    await u.download();
    expect(calls).toEqual(['download']);
    ee.emit('download-progress', { percent: 41.6 });
    expect(u.getState()).toMatchObject({ status: 'downloading', percent: 42, notes: [{ items: [{ text: 'Cool' }] }] });
    ee.emit('update-downloaded', { version: '1.1.0' });
    expect(u.getState().status).toBe('ready');
    u.install();
    expect(calls).toEqual(['download', 'install']);
  });

  it('stops prompting for a version the player declined', () => {
    const { ee, au } = fake();
    const u = createUpdater({ autoUpdater: au });
    ee.emit('update-available', { version: '1.1.0' });
    u.later();
    ee.emit('update-available', { version: '1.1.0' });
    expect(u.getState().status).toBe('idle');
    ee.emit('update-available', { version: '1.2.0' });
    expect(u.getState().status).toBe('available');
  });
});
