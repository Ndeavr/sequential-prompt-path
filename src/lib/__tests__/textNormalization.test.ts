import { describe, it, expect } from 'vitest';
import {
  repairMojibake,
  normalizeText,
  sanitizeImportedText,
  cleanText,
} from '../textNormalization';

describe('repairMojibake', () => {
  const cases: Array<[string, string]> = [
    ['TÃ©lÃ©phone', 'Téléphone'],
    ['MontrÃ©al', 'Montréal'],
    ['BÃ©ton', 'Béton'],
    ['PavÃ©', 'Pavé'],
    ['franÃ§ais', 'français'],
    ['ExtÃ©rieures', 'Extérieures'],
    ['DÃ©neigement', 'Déneigement'],
    ['expÃ©rience', 'expérience'],
    ['Ã€ contacter', 'À contacter'],
    ['â€"', '—'],
  ];
  it.each(cases)('repairs %s → %s', (input, expected) => {
    expect(repairMojibake(input)).toBe(expected);
  });

  it('is idempotent', () => {
    const once = repairMojibake('MontrÃ©al');
    expect(repairMojibake(once)).toBe(once);
  });

  it('leaves clean French accents alone', () => {
    const clean = 'éèêëàâçîïôùûü À É Ç';
    expect(repairMojibake(clean)).toBe(clean);
  });

  it('preserves phones, emails, URLs, RBQ untouched', () => {
    expect(repairMojibake('514-503-9606')).toBe('514-503-9606');
    expect(repairMojibake('info@x.ca')).toBe('info@x.ca');
    expect(repairMojibake('excavationsicard.ca')).toBe('excavationsicard.ca');
    expect(repairMojibake('5836-5529-01')).toBe('5836-5529-01');
  });
});

describe('normalizeText', () => {
  it('strips zero-width chars and BOM', () => {
    expect(normalizeText('a\u200Bb\uFEFFc')).toBe('abc');
  });
  it('trims and collapses spaces', () => {
    expect(normalizeText('  hello   world  ')).toBe('hello world');
  });
  it('converts NBSP to space', () => {
    expect(normalizeText('a\u00a0b')).toBe('a b');
  });
  it('preserves accents', () => {
    expect(normalizeText('Montréal — Québec')).toBe('Montréal — Québec');
  });
});

describe('sanitizeImportedText', () => {
  it('flags high confidence on clean repair', () => {
    const r = sanitizeImportedText('MontrÃ©al');
    expect(r.value).toBe('Montréal');
    expect(r.repaired).toBe(true);
    expect(r.confidence).toBe('high');
  });
  it('handles null/undefined', () => {
    expect(sanitizeImportedText(null).value).toBe('');
    expect(sanitizeImportedText(undefined).value).toBe('');
  });
  it('preserves original on residual mojibake (low confidence)', () => {
    // Garbage that won't fully repair
    const weird = 'Ã\u0099\u0099\u0099';
    const r = sanitizeImportedText(weird);
    expect(r.confidence).toBe('low');
  });
  it('cleanText returns just the string', () => {
    expect(cleanText('TÃ©lÃ©phone')).toBe('Téléphone');
  });
});
