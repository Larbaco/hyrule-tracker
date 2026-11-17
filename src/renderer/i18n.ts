/// <reference types="vite/client" />
import entries from './strings.txt?raw';

export const languages = { 'pt-BR': 'Português', 'en-US': 'English', 'es-ES': 'Español' } as const;
export type Locale = keyof typeof languages;
const storage = 'hyrule-tracker.locale';
function initial(): Locale {
  try {
    const saved = localStorage.getItem(storage);
    if (saved && Object.hasOwn(languages, saved)) return saved as Locale;
  } catch { /* browser storage unavailable */ }
  return 'pt-BR';
}
let locale = initial();
const translations = new Map(entries.trim().split('\n').map(row => {
  const [source, pt, en, es] = row.trim().split('|');
  return [source, { 'pt-BR': pt, 'en-US': en, 'es-ES': es }] as const;
}));
export function t(source: string): string {
  const direct = translations.get(source)?.[locale];
  if (direct) return direct;
  const numbered = /^(Pensamento de fada|Chamado de Pierre|Entrada de gruta|Pedra falante|Rupees prateadas) (\d+)$/.exec(source);
  return numbered ? `${t(numbered[1])} ${numbered[2]}` : source;
}
export const currentLocale = () => locale;
export function setLocale(next: Locale) {
  locale = next;
  document.documentElement.lang = next;
  try { localStorage.setItem(storage, next); } catch { /* browser storage unavailable */ }
}
export const number = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
export const date = (value: number) => new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(value);
export const hour = (value: number) => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(value);
