import { describe, expect, it, vi } from 'vitest';
import { currentLocale, fromSystem, languages, loadLocale, setLocale, t, type Locale } from '../src/renderer/i18n.js';

describe('first-run language', () => {
  it('picks the system language when the app has it', () => {
    expect(fromSystem(['fr-CA', 'en'])).toBe('fr-FR');
    expect(fromSystem(['pt-PT'])).toBe('pt-BR');
    expect(fromSystem(['ja'])).toBe('ja-JP');
  });
  it('tells traditional from simplified Chinese', () => {
    expect(fromSystem(['zh-TW'])).toBe('zh-TW');
    expect(fromSystem(['zh-Hant-HK'])).toBe('zh-TW');
    expect(fromSystem(['zh-CN'])).toBe('zh-CN');
    expect(fromSystem(['zh'])).toBe('zh-CN');
  });
  it('falls back to English', () => {
    expect(fromSystem(['sv-SE'])).toBe('en-US');
    expect(fromSystem([])).toBe('en-US');
  });
  it('has 12 languages', () => {
    expect(Object.keys(languages)).toHaveLength(12);
  });
});

it('keeps character names in localized labels and hints', async () => {
  const previous = currentLocale();
  vi.stubGlobal('document', { documentElement: { lang: previous } });
  try {
    for (const locale of Object.keys(languages) as Locale[]) {
      await loadLocale(locale);
      setLocale(locale);
      expect(t('Phantom Ganon'), locale).toBe('Phantom Ganon');
      expect(t('Dark Link'), locale).toBe('Dark Link');
      expect(t('In the Water Temple, after Dark Link.'), locale).toContain('Dark Link');
      expect(t("Dampé's race"), locale).toContain('Dampé');
    }
  } finally {
    setLocale(previous);
    vi.unstubAllGlobals();
  }
});
