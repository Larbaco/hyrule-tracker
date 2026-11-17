/**
 * Whether to force Electron to use X11. DISPLAY identifies the X server advertised by the session.
 * HYRULE_TRACKER_WAYLAND=1 lets Electron select the backend and takes priority over HYRULE_TRACKER_X11=1.
 */
export function useX11(env: Record<string, string | undefined>): boolean {
  if (env.HYRULE_TRACKER_WAYLAND) return false;
  if (env.HYRULE_TRACKER_X11) return true;
  return !!env.DISPLAY;
}