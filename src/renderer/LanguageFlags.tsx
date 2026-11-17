import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { languages, t, type Locale } from './i18n';

/** A star with `points` tips (5 for the US and China, 12 for Taiwan's sun). */
function star(cx: number, cy: number, r: number, fill = '#fff', points = 5, inner = 0.4, turn = 0) {
  const pts = Array.from({ length: points * 2 }, (_, i) => {
    const a = -Math.PI / 2 + turn + i * Math.PI / points, rad = i % 2 ? r * inner : r;
    return `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`;
  });
  return <polygon key={`${cx}-${cy}`} points={pts.join(' ')} fill={fill} />;
}

/** One of the Korean flag's trigrams: three bars, broken (split in two) where `broken` says. */
function trigram(cx: number, cy: number, angle: number, broken: [boolean, boolean, boolean]) {
  return <g key={`${cx}-${cy}`} transform={`rotate(${angle} ${cx} ${cy})`} fill="#000">
    {broken.map((split, i) => {
      const y = cy - 1.6 + i * 1.2;
      return split
        ? <g key={i}><rect x={cx - 2.4} y={y} width="2.1" height=".8" /><rect x={cx + .3} y={y} width="2.1" height=".8" /></g>
        : <rect key={i} x={cx - 2.4} y={y} width="4.8" height=".8" />;
    })}
  </g>;
}

const usStars = Array.from({ length: 9 }, (_, row) => Array.from({ length: row % 2 ? 5 : 6 }, (_, col) => star(
  (row % 2 ? 3.2 : 1.6) + col * 3.2, 1.4 + row * 1.35, 0.5)));

export function Flag({ locale, size = 22 }: { locale: Locale; size?: number }) {
  const h = Math.round(size * 0.7);
  return <svg className="flag" width={size} height={h} viewBox="0 0 30 21" aria-hidden="true" focusable="false">
    <defs><clipPath id={`flag-${locale}`}><rect width="30" height="21" rx="3" /></clipPath></defs>
    <g clipPath={`url(#flag-${locale})`}>
      {locale === 'en-US' && <>
        <rect width="30" height="21" fill="#fff" />
        {[0, 2, 4, 6, 8, 10, 12].map(i => <rect key={i} y={i * 21 / 13} width="30" height={21 / 13} fill="#b22234" />)}
        <rect width="12" height={21 * 7 / 13} fill="#3c3b6e" />
        <g transform="scale(1)">{usStars}</g>
      </>}
      {locale === 'pt-BR' && <>
        <rect width="30" height="21" fill="#009c3b" />
        <polygon points="15,2.2 27.2,10.5 15,18.8 2.8,10.5" fill="#ffdf00" />
        <circle cx="15" cy="10.5" r="4.6" fill="#002776" />
        <path d="M10.6 9.6q4.6-1.2 8.9 1.3" stroke="#fff" strokeWidth=".8" fill="none" />
      </>}
      {locale === 'es-ES' && <>
        <rect width="30" height="21" fill="#aa151b" />
        <rect y="5.25" width="30" height="10.5" fill="#f1bf00" />
        <rect x="6.5" y="8.4" width="3" height="4.2" rx=".8" fill="#aa151b" opacity=".85" />
      </>}
      {VERTICAL[locale] && VERTICAL[locale]!.map((fill, i) => <rect key={i} x={i * 10} width="10" height="21" fill={fill} />)}
      {HORIZONTAL[locale] && HORIZONTAL[locale]!.map((fill, i) => <rect key={i} y={i * 7} width="30" height="7" fill={fill} />)}
      {locale === 'ja-JP' && <>
        <rect width="30" height="21" fill="#fff" />
        <circle cx="15" cy="10.5" r="6.3" fill="#bc002d" />
      </>}
      {locale === 'ko-KR' && <>
        <rect width="30" height="21" fill="#fff" />
        <g transform="rotate(33.7 15 10.5)">
          <path d="M9.75 10.5a5.25 5.25 0 0 1 10.5 0z" fill="#cd2e3a" />
          <path d="M9.75 10.5a5.25 5.25 0 0 0 10.5 0z" fill="#0047a0" />
          <circle cx="12.375" cy="10.5" r="2.625" fill="#cd2e3a" />
          <circle cx="17.625" cy="10.5" r="2.625" fill="#0047a0" />
        </g>
        {trigram(5.6, 4.4, -56.3, [false, false, false])}
        {trigram(24.4, 16.6, -56.3, [true, true, true])}
        {trigram(24.4, 4.4, 56.3, [true, false, true])}
        {trigram(5.6, 16.6, 56.3, [false, true, false])}
      </>}
      {locale === 'zh-CN' && <>
        <rect width="30" height="21" fill="#de2910" />
        {star(5, 5.25, 3.15, '#ffde00')}
        {star(10, 2.1, 1.05, '#ffde00', 5, .4, .9)}
        {star(12, 4.2, 1.05, '#ffde00', 5, .4, 1.3)}
        {star(12, 7.35, 1.05, '#ffde00', 5, .4, 1.8)}
        {star(10, 9.45, 1.05, '#ffde00', 5, .4, 2.2)}
      </>}
      {locale === 'zh-TW' && <>
        <rect width="30" height="21" fill="#fe0000" />
        <rect width="15" height="10.5" fill="#000095" />
        {star(7.5, 5.25, 3.75, '#fff', 12, .62)}
        <circle cx="7.5" cy="5.25" r="2.05" fill="#000095" />
        <circle cx="7.5" cy="5.25" r="1.75" fill="#fff" />
      </>}
    </g>
    <rect width="30" height="21" rx="3" fill="none" stroke="rgba(0,0,0,.35)" />
  </svg>;
}
/** Simple tricolour flags. */
const VERTICAL: Partial<Record<Locale, string[]>> = { 'fr-FR': ['#0055a4', '#fff', '#ef4135'], 'it-IT': ['#009246', '#fff', '#ce2b37'] };
const HORIZONTAL: Partial<Record<Locale, string[]>> = { 'de-DE': ['#000', '#dd0000', '#ffce00'], 'nl-NL': ['#ae1c28', '#fff', '#21468b'], 'ru-RU': ['#fff', '#0039a6', '#d52b1e'] };

/** Language picker: the current language; a click opens the list of all of them. */
export function LanguageSwitch({ locale, onChange, labelled = false }: { locale: Locale; onChange: (locale: Locale) => void; labelled?: boolean }) {
  const codes = Object.keys(languages) as Locale[];
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const pick = (code: Locale) => { close(); onChange(code); };
  const move = (e: ReactKeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...(list.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();
  };
  const label = `${t('Idioma')}: ${languages[locale]}`;
  return <div className={`language-menu${labelled ? ' labelled' : ''}`} ref={root} onBlur={e => {
    if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="language-switch" aria-label={label} title={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(o => !o)}>
      <Flag locale={locale} size={labelled ? 26 : 24} />{labelled && <span>{languages[locale]}</span>}
      <span className="language-caret" aria-hidden="true">▾</span>
    </button>
    {open && <ul className="language-list" role="listbox" aria-label={t('Idioma')} ref={list} onKeyDown={move}>
      {codes.map(code => <li key={code} role="option" tabIndex={-1} aria-selected={code === locale} lang={code}
        onClick={() => pick(code)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(code); } }}>
        <Flag locale={code} size={22} /><span>{languages[code]}</span>
      </li>)}
    </ul>}
  </div>;
}
