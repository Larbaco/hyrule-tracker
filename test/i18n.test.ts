import { describe, expect, it } from 'vitest';
import { fromSystem, languages } from '../src/renderer/i18n.js';

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
