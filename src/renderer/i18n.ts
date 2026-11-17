/// <reference types="vite/client" />
import entries from './strings.txt?raw';
import catalogEntries from './catalog-strings.json';

export const languages = { 'en-US': 'English', 'pt-BR': 'Português', 'es-ES': 'Español' } as const;
export type Locale = keyof typeof languages;
const storage = 'hyrule-tracker.locale';
function initial(): Locale {
  try {
    const saved = localStorage.getItem(storage);
    if (saved && Object.hasOwn(languages, saved)) return saved as Locale;
  } catch { /* browser storage unavailable */ }
  return 'en-US';
}
let locale = initial();
const translations = new Map(entries.trim().split('\n').map(row => {
  const [source, pt, en, es] = row.trim().split('|');
  return [source, { 'pt-BR': pt, 'en-US': en, 'es-ES': es }] as const;
}));
const catalog: Record<string, string[]> = catalogEntries;
export function t(source: string): string {
  const direct = translations.get(source)?.[locale];
  if (direct) return direct;
  if (locale !== 'en-US') {
    const labels = Object.hasOwn(catalog, source) ? catalog[source] : undefined;
    const translated = labels?.[locale === 'pt-BR' ? 0 : 1];
    if (translated) return translated;
    const age = /^(.+) \((child|adult)\)$/.exec(source);
    if (age) return `${t(age[1])} (${t(age[2])})`;
    const floor = /^(B)?(\d+)F$/.exec(source);
    if (floor) return t(floor[1] ? '{n} basement' : '{n} floor').replace('{n}', floor[2]);
    const tokens = /^(\d+) Gold Skulltula tokens$/.exec(source);
    if (tokens) return t('{n} Gold Skulltula tokens').replace('{n}', tokens[1]);
  }
  const numbered = /^(Pensamento de fada|Chamado de Pierre|Entrada de gruta|Pedra falante|Rupees prateadas) (\d+)$/.exec(source);
  if (numbered) return `${t(numbered[1])} ${numbered[2]}`;
  const heading = source.indexOf(': ');
  if (heading > 0 && !/[.!?]$/.test(source)) return `${t(source.slice(0, heading))}: ${t(source.slice(heading + 2))}`;
  return source;
}
export const currentLocale = () => locale;
export function setLocale(next: Locale) {
  locale = next;
  document.documentElement.lang = next;
  try { localStorage.setItem(storage, next); } catch { /* browser storage unavailable */ }
}
export const number = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
export function message(source: string, values: Record<string, string | number> = {}) {
  return t(source).replace(/\{(\w+)\}/g, (placeholder, key: string) => {
    const value = Object.hasOwn(values, key) ? values[key] : undefined;
    return typeof value === 'number' ? number(value) : value === undefined ? placeholder : t(value);
  });
}
export const date = (value: number) => new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(value);
export const hour = (value: number) => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(value);
