// Linux: read-only access to another process's memory through /proc/<pid>/mem (plain Node, no native
// code). The file is opened read-only: it cannot write to, or otherwise change, the process.
// The kernel only allows it like a debugger would (same user, and Yama's ptrace_scope permitting),
// so a refusal is reported as MemoryAccessDenied for the window to explain.
import fs from 'node:fs';
import path from 'node:path';
import type { GameProcess, MemRegion } from './procmem.js';
import { isWindowsPath, prefixFromEnv, prefixRoaming, toUnixPath } from '../gamedata/wine.js';

/** The system refused to let the tracker read the game (ptrace rules). */
export class MemoryAccessDenied extends Error {}

/** Memory block types, the same numbers Windows uses (see sweepRanges). */
const PRIVATE = 0x20000, MAPPED = 0x40000, IMAGE = 0x1000000;

/**
 * Parse /proc/<pid>/maps into readable blocks. Shared mappings (an emulator's guest memory: memfd,
 * or Wine's file-backed sections) count as "mapped"; private file mappings (binaries, libraries)
 * as "image"; private anonymous memory as "private".
 */
export function parseMaps(text: string): MemRegion[] {
  const out: MemRegion[] = [];
  for (const line of text.split('\n')) {
    const m = /^([0-9a-f]+)-([0-9a-f]+)\s+(\S{4})\s+\S+\s+\S+\s+(\d+)\s*(.*)$/i.exec(line.trim());
    if (!m) continue;
    const [, lo, hi, perms, inode, name] = m;
    if (perms[0] !== 'r') continue;
    const base = BigInt('0x' + lo), size = BigInt('0x' + hi) - base;
    if (size <= 0n || name === '[vvar]' || name === '[vsyscall]') continue;
    const type = perms[3] === 's' ? MAPPED : inode !== '0' && name.startsWith('/') ? IMAGE : PRIVATE;
    out.push({ base, size, type });
  }
  return out;
}

/** The start time field of /proc/<pid>/stat (tells a process apart from a later one given the same pid). */
export function parseStartTime(stat: string): string | undefined {
  // The name (2nd field) is in parentheses and may hold spaces: count fields after the last ')'.
  const rest = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
  return rest[19]; // field 22 overall
}

/** Base name of a path written either way ("C:\Games\hookshot.exe" or "/opt/hookshot"). */
const baseName = (p: string) => p.split(/[\\/]/).pop() ?? p;
const stripExt = (n: string) => n.toLowerCase().replace(/\.(exe|appimage|x86_64)$/, '');

export interface ProcInfo { pid: number; comm: string; argv0: string; exe: string }

/**
 * Whether this process runs the program `image` (e.g. "hookshot.exe"): the Windows exe under
 * Wine/Proton (its name or argv[0]), or a native build of the same name without ".exe".
 * The kernel cuts process names to 15 characters, so a cut name matches the start of `image`.
 */
export function matchesImage(p: Pick<ProcInfo, 'comm' | 'argv0' | 'exe'>, image: string): boolean {
  const want = image.toLowerCase(), bare = stripExt(want);
  const names = [p.comm, baseName(p.argv0), baseName(p.exe)].filter(Boolean).map(n => n.toLowerCase());
  return names.some(n => n === want || stripExt(n) === bare) ||
    (p.comm.length === 15 && want.startsWith(p.comm.toLowerCase()));
}

const read = (file: string) => { try { return fs.readFileSync(file, 'utf8'); } catch { return ''; } };

/** All processes this user can see, read once per second at most (the game list asks for several names in a row). */
let cache: { at: number; list: ProcInfo[] } | undefined;
function processes(): ProcInfo[] {
  if (cache && Date.now() - cache.at < 1000) return cache.list;
  const list: ProcInfo[] = [];
  let names: string[] = [];
  try { names = fs.readdirSync('/proc'); } catch { /* no procfs */ }
  for (const name of names) {
    if (!/^\d+$/.test(name)) continue;
    const comm = read(`/proc/${name}/comm`).trim();
    if (!comm) continue;
    const argv0 = read(`/proc/${name}/cmdline`).split('\0')[0] ?? '';
    let exe = '';
    try { exe = fs.readlinkSync(`/proc/${name}/exe`); } catch { /* other user's, or a kernel thread */ }
    list.push({ pid: Number(name), comm, argv0, exe });
  }
  cache = { at: Date.now(), list };
  return list;
}

export function findLinuxProcesses(image: string): Promise<number[]> {
  return Promise.resolve(processes().filter(p => p.pid !== process.pid && matchesImage(p, image)).map(p => p.pid));
}

function environ(pid: number): Record<string, string> {
  const env: Record<string, string> = {};
  for (const kv of read(`/proc/${pid}/environ`).split('\0')) {
    const i = kv.indexOf('=');
    if (i > 0) env[kv.slice(0, i)] = kv.slice(i + 1);
  }
  return env;
}

export class LinuxProcessMemory implements GameProcess {
  private fd: number | undefined;
  private readonly started: string | undefined;
  constructor(readonly pid: number) {
    this.started = parseStartTime(read(`/proc/${pid}/stat`));
    try {
      this.fd = fs.openSync(`/proc/${pid}/mem`, 'r');
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === 'EACCES' || code === 'EPERM') throw new MemoryAccessDenied(`Not allowed to read process ${pid}`);
      throw new Error(`Couldn't open process ${pid} for reading`);
    }
  }
  read(addr: bigint, len: number): Buffer | null {
    if (this.fd === undefined) return null;
    const buf = Buffer.alloc(len);
    try {
      // Like ReadProcessMemory: all of it or nothing (a gap in the range fails the read).
      return fs.readSync(this.fd, buf, 0, len, addr) === len ? buf : null;
    } catch { return null; }
  }
  /** Wine's processes have the Windows exe in argv[0]: turned into the real path inside the prefix. */
  private wine(): { prefix: string; argv0: string } | undefined {
    const argv0 = read(`/proc/${this.pid}/cmdline`).split('\0')[0] ?? '';
    return isWindowsPath(argv0) ? { prefix: prefixFromEnv(environ(this.pid)), argv0 } : undefined;
  }
  imagePath(): string | undefined {
    const wine = this.wine();
    if (wine) return toUnixPath(wine.argv0, wine.prefix);
    try { return fs.readlinkSync(`/proc/${this.pid}/exe`); } catch { return undefined; }
  }
  /** Under Wine/Proton: %APPDATA% inside the game's prefix, where it keeps its saves. */
  appData(): string | undefined {
    const wine = this.wine();
    return wine ? prefixRoaming(wine.prefix, environ(this.pid).USER) : undefined;
  }
  regions(): MemRegion[] {
    return parseMaps(read(`/proc/${this.pid}/maps`));
  }
  alive(): boolean {
    if (this.fd === undefined) return false;
    const now = parseStartTime(read(`/proc/${this.pid}/stat`));
    return !!now && now === this.started;
  }
  close() {
    if (this.fd !== undefined) try { fs.closeSync(this.fd); } catch { /* already gone */ }
    this.fd = undefined;
  }
}

/** Yama's ptrace_scope (0 classic, 1 only a parent may read, 2 admin only, 3 nobody), if the kernel has it. */
export function ptraceScope(): number | undefined {
  const v = read(path.join('/proc', 'sys', 'kernel', 'yama', 'ptrace_scope')).trim();
  return v ? Number(v) : undefined;
}
