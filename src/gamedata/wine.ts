// Wine / Proton on Linux: finding prefixes and turning Windows paths (C:\...) into real ones.
// No Electron imports. Only reads the filesystem.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const readdir = (dir: string) => { try { return fs.readdirSync(dir); } catch { return []; } };
const isDir = (p: string) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };

/** A Windows absolute path: "C:\Games\x.exe" or "C:/Games/x.exe". */
export const isWindowsPath = (p: string) => /^[a-z]:[\\/]/i.test(p);

/**
 * The real path of a Windows path inside a Wine prefix. Drives come from <prefix>/dosdevices
 * (c: is <prefix>/drive_c, z: is / by default). Each part is matched without regard to case,
 * like Windows does. Returns undefined when the drive is unknown.
 */
export function toUnixPath(winPath: string, prefix: string): string | undefined {
  if (!isWindowsPath(winPath)) return undefined;
  const drive = winPath[0].toLowerCase();
  let root: string | undefined;
  try { root = fs.realpathSync(path.join(prefix, 'dosdevices', `${drive}:`)); } catch { /* no dosdevices link */ }
  root ??= drive === 'c' ? path.join(prefix, 'drive_c') : drive === 'z' ? '/' : undefined;
  if (!root) return undefined;
  let out = root;
  for (const part of winPath.slice(3).split(/[\\/]+/).filter(Boolean)) {
    const names = readdir(out);
    const match = names.includes(part) ? part : names.find(n => n.toLowerCase() === part.toLowerCase());
    out = path.join(out, match ?? part);
  }
  return out;
}

/** The prefix a Wine process runs in, from its environment (WINEPREFIX, Proton's STEAM_COMPAT_DATA_PATH, or ~/.wine). */
export function prefixFromEnv(env: Record<string, string>, home = os.homedir()): string {
  if (env.WINEPREFIX) return env.WINEPREFIX;
  if (env.STEAM_COMPAT_DATA_PATH) return path.join(env.STEAM_COMPAT_DATA_PATH, 'pfx');
  return path.join(home, '.wine');
}

/** The Windows user folders of a prefix ("drive_c/users/<name>"), the shared "Public" one left out. */
export function prefixUsers(prefix: string): string[] {
  const users = path.join(prefix, 'drive_c', 'users');
  return readdir(users).filter(n => n.toLowerCase() !== 'public').map(n => path.join(users, n)).filter(isDir);
}

/** %APPDATA% and %LOCALAPPDATA% of a prefix's user (new and old Wine layouts). */
export function userAppData(userDir: string): { roaming: string; local: string } {
  const roaming = [path.join(userDir, 'AppData', 'Roaming'), path.join(userDir, 'Application Data')].find(isDir) ?? path.join(userDir, 'AppData', 'Roaming');
  const local = [path.join(userDir, 'AppData', 'Local'), path.join(userDir, 'Local Settings', 'Application Data')].find(isDir) ?? path.join(userDir, 'AppData', 'Local');
  return { roaming, local };
}

/** %APPDATA% of the prefix a game runs in: the user that matches $USER, else Proton's "steamuser", else the first. */
export function prefixRoaming(prefix: string, user = os.userInfo().username): string | undefined {
  const users = prefixUsers(prefix);
  const pick = users.find(u => path.basename(u) === user) ?? users.find(u => path.basename(u) === 'steamuser') ?? users[0];
  return pick ? userAppData(pick).roaming : undefined;
}

/** Steam installs (native, the older ~/.steam link, Flatpak) and the extra libraries listed in them. */
export function steamLibraries(home = os.homedir()): string[] {
  const roots = [path.join(home, '.local', 'share', 'Steam'), path.join(home, '.steam', 'steam'),
    path.join(home, '.var', 'app', 'com.valvesoftware.Steam', '.local', 'share', 'Steam'),
    path.join(home, '.var', 'app', 'com.valvesoftware.Steam', 'data', 'Steam')].filter(isDir);
  const out = new Set<string>();
  for (const root of roots) {
    let real = root;
    try { real = fs.realpathSync(root); } catch { /* keep as is */ }
    out.add(real);
    try {
      const vdf = fs.readFileSync(path.join(real, 'steamapps', 'libraryfolders.vdf'), 'utf8');
      for (const m of vdf.matchAll(/"path"\s+"([^"]+)"/g)) if (isDir(m[1].replace(/\\\\/g, '\\'))) out.add(m[1].replace(/\\\\/g, '\\'));
    } catch { /* no library list */ }
  }
  return [...out];
}

/**
 * Wine prefixes a game may run in: $WINEPREFIX, ~/.wine, Proton's (Steam compatdata), Bottles,
 * Heroic and Lutris (~/Games/<game>). Only folders that hold a drive_c.
 */
export function winePrefixes(home = os.homedir(), env: NodeJS.ProcessEnv = process.env): string[] {
  const out: string[] = [];
  const add = (dir: string) => { if (isDir(path.join(dir, 'drive_c'))) out.push(dir); };
  const children = (dir: string) => readdir(dir).map(n => path.join(dir, n));
  if (env.WINEPREFIX) add(env.WINEPREFIX);
  add(path.join(home, '.wine'));
  for (const lib of steamLibraries(home)) for (const d of children(path.join(lib, 'steamapps', 'compatdata'))) add(path.join(d, 'pfx'));
  for (const d of [path.join(home, '.local', 'share', 'bottles', 'bottles'), path.join(home, '.var', 'app', 'com.usebottles.bottles', 'data', 'bottles', 'bottles'),
    path.join(home, 'Games', 'Heroic', 'Prefixes'), path.join(home, 'Games', 'Heroic', 'Prefixes', 'default'), path.join(home, 'Games')]) {
    for (const c of children(d)) add(c);
  }
  return [...new Set(out)];
}
