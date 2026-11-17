// Updates through GitHub Releases (electron-updater). The app only NOTIFIES: downloading and
// installing are the player's decision. No Electron import here: `autoUpdater` is injected so tests can fake it.
import type { NoteSection, UpdateState } from '../shared/types.js';

const CHECK_EVERY = 4 * 60 * 60 * 1000; // re-check while the app stays open
const MAX_ITEMS = 40; // changelog entries the dialog shows

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' };
const plain = (html: string) => html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '')
  .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, e => ENTITIES[e]).replace(/\s+/g, ' ').trim();

/**
 * GitHub serves release notes as HTML (or a list of {version, note}). The dialog gets them as data, never as HTML:
 * one section per heading ("New", "Fixed"…), one item per list entry, its leading bold words as the item's title.
 */
export function notesToSections(releaseNotes: unknown): NoteSection[] {
  let html: unknown = releaseNotes;
  if (Array.isArray(releaseNotes)) html = releaseNotes.map(r => (r && typeof r === 'object' && 'note' in r ? String((r as { note: unknown }).note ?? '') : '')).join('\n');
  if (typeof html !== 'string' || !html.trim()) return [];
  const clean = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  const sections: NoteSection[] = [];
  const current = () => sections.at(-1) ?? (sections.push({ items: [] }), sections[0]);
  let count = 0;
  for (const m of clean.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>|<li[^>]*>([\s\S]*?)<\/li>|<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    if (m[1] !== undefined) { const title = plain(m[1]); if (title) sections.push({ title, items: [] }); continue; }
    if (count >= MAX_ITEMS) continue;
    const body = m[2] ?? m[3] ?? '';
    const lead = /^\s*(?:<p[^>]*>\s*)?<strong>([\s\S]*?)<\/strong>/i.exec(body);
    const title = lead ? plain(lead[1]).replace(/[.:]\s*$/, '') : undefined;
    const text = plain(lead ? body.slice(lead.index + lead[0].length) : body);
    if (!title && !text) continue;
    current().items.push(title ? { title, text } : { text });
    count++;
  }
  // Plain text with no tags at all: one paragraph per line.
  if (!sections.length) sections.push({ items: clean.split(/\n+/).map(plain).filter(Boolean).slice(0, MAX_ITEMS).map(text => ({ text })) });
  return sections.filter(s => s.items.length);
}

/** The slice of electron-updater's `autoUpdater` this module uses. */
export interface AutoUpdaterLike {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  allowPrerelease: boolean;
  on(event: string, listener: (...args: any[]) => void): unknown;
  checkForUpdates(): Promise<unknown>;
  downloadUpdate(): Promise<unknown>;
  quitAndInstall(silent?: boolean, forceRunAfter?: boolean): void;
}

export interface UpdaterOptions {
  autoUpdater: AutoUpdaterLike;
  notify?: (state: UpdateState) => void;
  log?: (...args: unknown[]) => void;
  setTimer?: (fn: () => void, ms: number) => { unref?: () => void };
  setRepeat?: (fn: () => void, ms: number) => { unref?: () => void };
}

export function createUpdater({ autoUpdater, notify = () => {}, log = () => {}, setTimer = setTimeout, setRepeat = setInterval }: UpdaterOptions) {
  autoUpdater.autoDownload = false; // never downloads by itself
  autoUpdater.autoInstallOnAppQuit = false; // never installs by itself on exit
  autoUpdater.allowPrerelease = false;

  let state: UpdateState = { status: 'idle' };
  let dismissed: string | null = null; // version the player declined: no more prompts until a newer one (or a restart)

  // The changelog follows the version through later states, so each `set` need not repeat it.
  const set = (next: UpdateState) => {
    state = next.notes === undefined && state.notes && next.version === state.version ? { ...next, notes: state.notes } : next;
    notify(state);
  };
  const busy = () => state.status === 'downloading' || state.status === 'ready';

  autoUpdater.on('update-available', (info: { version: string; releaseNotes?: unknown }) => {
    if (busy()) return;
    if (info.version === dismissed) return log('[update] declined by the player, no prompt:', info.version);
    log('[update] available:', info.version);
    const notes = notesToSections(info.releaseNotes);
    set({ status: 'available', version: info.version, ...(notes.length ? { notes } : {}) });
  });
  autoUpdater.on('update-not-available', () => log('[update] already on the latest version'));
  autoUpdater.on('download-progress', (p: { percent?: number }) =>
    set({ status: 'downloading', version: state.version, percent: Math.max(0, Math.min(100, Math.round(p.percent || 0))) }));
  autoUpdater.on('update-downloaded', (info: { version: string }) => {
    log('[update] downloaded:', info.version);
    set({ status: 'ready', version: info.version });
  });
  autoUpdater.on('error', (err: unknown) => {
    log('[update] error', err);
    // A failed CHECK (offline, repo down) is silent. Only a failed download the player asked for is reported.
    if (state.status === 'downloading') set({ status: 'error', version: state.version });
  });

  async function check() {
    if (busy()) return;
    try { await autoUpdater.checkForUpdates(); } catch (e) { log('[update] check failed', e); }
  }
  async function download() {
    if (state.status !== 'available' && state.status !== 'error') return;
    set({ status: 'downloading', version: state.version, percent: 0 });
    try { await autoUpdater.downloadUpdate(); } catch (e) {
      log('[update] download failed', e);
      set({ status: 'error', version: state.version });
    }
  }
  function later() {
    if (state.status !== 'available' && state.status !== 'error') return;
    dismissed = state.version ?? null;
    set({ status: 'idle' });
  }
  function install() {
    if (state.status !== 'ready') return;
    autoUpdater.quitAndInstall(false, true); // show the installer, reopen the app afterwards
  }
  function start() {
    setTimer(check, 3000).unref?.(); // first check shortly after launch
    setRepeat(check, CHECK_EVERY).unref?.();
  }
  return { start, check, download, later, install, getState: () => state };
}
