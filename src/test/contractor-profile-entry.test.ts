import { describe, it, expect } from 'vitest';
import { contractorDraftName, normalizeContractorEntry, contractorProfileEntryPath } from '@/lib/contractorProfileEntry';

describe('existing contractor profile entry', () => {
  it('resumes a saved identity instead of silently replacing it from the entry URL', () => {
    expect(contractorDraftName('Incoming QA', 'Saved QA', 'Owned QA')).toBe('Saved QA');
  });
  it('uses the authenticated company when no matching draft exists', () => {
    expect(contractorDraftName('Incoming QA', null, 'Owned QA')).toBe('Owned QA');
  });
  it('retains a fresh guest declaration without an existing identity', () => {
    expect(contractorDraftName('Incoming QA', null, null)).toBe('Incoming QA');
  });
  it('normalizes a website and strips potentially sensitive query/hash', () => {
    expect(normalizeContractorEntry('example.com/services?token=synthetic#contact', 'website')).toEqual({ name: '', website: 'https://example.com/services' });
  });
  it('retains the declared company name without inferring services', () => {
    expect(normalizeContractorEntry('  Entreprise QA  ', 'name')).toEqual({ name: 'Entreprise QA', website: '' });
  });
  it.each(['', 'javascript:alert(1)', 'localhost', 'https://user:pass@example.com', 'http://127.0.0.1'])('rejects invalid or credential-bearing input %s', input => {
    expect(normalizeContractorEntry(input, 'website')).toBeNull();
  });
  it('uses the existing wizard, preserves attribution and separates English', () => {
    const url = new URL(contractorProfileEntryPath('?ref=qa&checkout=success&session_id=synthetic', 'en', { name: 'Entreprise QA', website: '' }), 'https://example.com');
    expect(url.pathname).toBe('/entrepreneurs/profil');
    expect(url.searchParams.get('lang')).toBe('en');
    expect(url.searchParams.get('ref')).toBe('qa');
    expect(url.searchParams.get('entreprise')).toBe('Entreprise QA');
    expect(url.searchParams.has('session_id')).toBe(false);
    expect(url.searchParams.has('checkout')).toBe(false);
  });
});