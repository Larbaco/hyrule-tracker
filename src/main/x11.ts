// Linux (X11 / XWayland): which process owns a window, from its _NET_WM_PID property (Wine sets it
// too). Used to pick the game's window for a screenshot. Loaded once through koffi; if libX11 or the
// display isn't there, it answers "don't know".
type Owner = (xid: number) => number | undefined;
let owner: Promise<Owner | null> | undefined;

export function x11WindowOwner(): Promise<Owner | null> {
  owner ??= import('koffi').then(({ default: koffi }) => {
    const lib = koffi.load('libX11.so.6');
    const XOpenDisplay = lib.func('void *XOpenDisplay(const char *name)');
    const XInternAtom = lib.func('unsigned long XInternAtom(void *dpy, const char *name, int onlyIfExists)');
    const XGetWindowProperty = lib.func('int XGetWindowProperty(void *dpy, unsigned long w, unsigned long prop, long offset, long length, int del, unsigned long reqType, _Out_ unsigned long *actualType, _Out_ int *actualFormat, _Out_ unsigned long *nitems, _Out_ unsigned long *bytesAfter, _Out_ void **data)');
    const XFree = lib.func('int XFree(void *data)');
    const dpy = XOpenDisplay(null);
    if (!dpy) return null;
    const pidAtom = XInternAtom(dpy, '_NET_WM_PID', 1);
    if (!pidAtom) return null;
    const CARDINAL = 6;
    return (xid: number) => {
      const type = [0], format = [0], items = [0], after = [0], data: unknown[] = [null];
      if (XGetWindowProperty(dpy, xid, pidAtom, 0, 1, 0, CARDINAL, type, format, items, after, data) !== 0 || !data[0]) return undefined;
      try {
        // Format-32 properties come back as C longs.
        return Number(items[0]) >= 1 && format[0] === 32 ? Number(koffi.decode(data[0], 'unsigned long')) : undefined;
      } finally { XFree(data[0]); }
    };
  }).catch(e => { console.error('x11 unavailable', e); return null; });
  return owner;
}
