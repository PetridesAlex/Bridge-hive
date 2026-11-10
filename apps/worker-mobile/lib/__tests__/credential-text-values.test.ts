jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
    storage: { from: jest.fn() },
    rpc: jest.fn(),
  },
}));

import {
  credentialInputKind,
  validateCredentialTextValue,
} from '@bridge-hive/domain';

import { buildCredentialChecklist } from '@/lib/credentials';

describe('mobile credential text values', () => {
  it('builds text checklist rows without upload file names for tax/social', () => {
    const checklist = buildCredentialChecklist({
      role: 'registered_nurse',
      locale: 'el',
      credentials: [
        {
          id: '1',
          worker_id: 'w',
          credential_type: 'tax_identification_proof',
          status: 'pending',
          expires_at: null,
          storage_path: null,
          storage_paths: [],
          text_value: '123456789',
          has_text_value: true,
          verified_by: null,
          verified_at: null,
          rejection_reason: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        } as never,
        {
          id: '2',
          worker_id: 'w',
          credential_type: 'nursing_licence',
          status: 'pending',
          expires_at: null,
          storage_path: 'w/nursing_licence/a.pdf',
          storage_paths: ['w/nursing_licence/a.pdf'],
          text_value: null,
          has_text_value: false,
          verified_by: null,
          verified_at: null,
          rejection_reason: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        } as never,
      ],
    });

    const tax = checklist.find(
      (r) => r.credentialType === 'tax_identification_proof',
    );
    const licence = checklist.find(
      (r) => r.credentialType === 'nursing_licence',
    );
    expect(tax?.inputKind).toBe('text');
    expect(tax?.hasTextValue).toBe(true);
    expect(tax?.fileName).toBeNull();
    expect(tax?.displayName).toContain('φορολογικής');
    expect(licence?.inputKind).toBe('file');
    expect(licence?.fileName).toBe('a.pdf');
    expect(credentialInputKind('social_insurance_proof')).toBe('text');
    expect(validateCredentialTextValue('n/a').ok).toBe(false);
  });
});
