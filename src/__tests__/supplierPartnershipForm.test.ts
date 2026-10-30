import { describe, it, expect } from 'vitest';
import { validateSupplierForm } from '@/lib/supplierPartnershipForm';

const ok = { company: 'Peintures Test', first_name: 'A', last_name: 'B', email: 'a@example.test', org_type: 'supplier', network_size: '', message: '', privacy_consent: true };

describe('supplier partnership form', () => {
  it('accepts a complete form with optional fields empty', () => {
    expect(validateSupplierForm(ok)).toEqual({});
  });
  it('requires consent, valid email, company and org type', () => {
    const e = validateSupplierForm({ ...ok, privacy_consent: false, email: 'bad', company: '', org_type: '' });
    expect(Object.keys(e).sort()).toEqual(['company', 'email', 'org_type', 'privacy_consent']);
  });
});
