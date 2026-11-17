import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type MouseEvent, type ReactNode } from 'react';
import { t } from './i18n';

interface View { z: number; x: number; y: number }
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

/**
 * Resize the layer when zooming so percentage positions track the map and markers keep their size.
 * The overlay stays anchored to the viewport.
 */
export function ZoomPan({ ratio, className = '', children, overlay }: { ratio: number; className?: string; children: ReactNode; overlay?: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ z: 1, x: 0, y: 0 });
  const dragged = useRef(false);
  const gesture = useRef<AbortController | null>(null);
  // Zoom the layer is drawn at right now: its size in the DOM includes it.
  const drawnZoom = useRef(1);
  drawnZoom.current = view.z;

  const clamp = useCallback((v: View): View => {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.z));
    const b = box.current, l = layer.current;
    if (z <= MIN_ZOOM || !b || !l) return { z, x: 0, y: 0 };
    const mx = Math.abs(l.offsetWidth / drawnZoom.current * z - b.clientWidth) / 2 + 60;
    const my = Math.abs(l.offsetHeight / drawnZoom.current * z - b.clientHeight) / 2 + 60;
    return { z, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) };
  }, []);

  /** Zooms by `factor` keeping the point (qx, qy), relative to the box center, in place. */
  const zoomAt = useCallback((factor: number, qx = 0, qy = 0) => {
    setView(v => {
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.z * factor));
      const k = z / v.z;
      return clamp({ z, x: qx - (qx - v.x) * k, y: qy - (qy - v.y) * k });
    });
  }, [clamp]);

  // React registers wheel listeners as passive, so page scrolling can only be stopped with a native one.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (e.deltaY > 0 && drawnZoom.current <= MIN_ZOOM) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [zoomAt]);

  // The box can change size (window resized): keep the map inside it.
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setView(v => clamp(v)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [clamp]);

  useEffect(() => () => gesture.current?.abort(), []);

  function startDrag(e: PointerEvent<HTMLDivElement>) {
    if (!e.isPrimary || e.button !== 0) return;
    gesture.current?.abort();
    dragged.current = false;
    if (view.z <= MIN_ZOOM) return;
    const controller = new AbortController();
    gesture.current = controller;
    const { pointerId } = e;
    const start = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    const move = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
      if (!dragged.current && Math.hypot(dx, dy) < 4) return;
      dragged.current = true;
      setView(v => clamp({ z: v.z, x: start.vx + dx, y: start.vy + dy }));
    };
    const end = (ev: globalThis.PointerEvent) => { if (ev.pointerId === pointerId) controller.abort(); };
    const options = { signal: controller.signal };
    window.addEventListener('pointermove', move, options);
    window.addEventListener('pointerup', end, options);
    window.addEventListener('pointercancel', end, options);
    window.addEventListener('blur', () => controller.abort(), options);
  }
  // A drag ends in a click on whatever is under the cursor: swallow it.
  function swallowDragClick(e: MouseEvent<HTMLDivElement>) {
    if (!e.detail || !dragged.current) return;
    dragged.current = false;
    e.stopPropagation();
    e.preventDefault();
  }

  const style = { '--ratio': ratio } as CSSProperties;
  const layerStyle = { '--zoom': view.z, transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px)` } as CSSProperties;
  return <div ref={box} className={view.z > MIN_ZOOM ? 'zoom-viewport zoomed' : 'zoom-viewport'} style={style} onPointerDown={startDrag} onClickCapture={swallowDragClick}>
    <div ref={layer} className={`zoom-layer ${className}`} style={layerStyle}>{children}</div>
    <div className="zoom-controls" onPointerDown={e => {
      dragged.current = false;
      e.stopPropagation();
    }}>
      <button type="button" aria-label={t('Ampliar')} title={t('Ampliar')} disabled={view.z >= MAX_ZOOM} onClick={() => zoomAt(1.5)}>+</button>
      <button type="button" aria-label={t('Reduzir')} title={t('Reduzir')} disabled={view.z <= MIN_ZOOM} onClick={() => zoomAt(1 / 1.5)}>−</button>
      <button type="button" aria-label={t('Reiniciar zoom')} title={t('Reiniciar zoom')} disabled={view.z <= MIN_ZOOM && !view.x && !view.y} onClick={() => setView({ z: 1, x: 0, y: 0 })}>⌖</button>
    </div>
    <span className="zoom-hint">{Math.round(view.z * 100)}% · {t('Role para ampliar · Arraste para mover')}</span>
    {overlay}
  </div>;
}
