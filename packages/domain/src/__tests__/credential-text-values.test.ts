import {
  TEXT_CREDENTIAL_TYPES,
  credentialInputKind,
  credentialPayloadPresent,
  credentialRequirementsForRole,
  credentialTypeLabel,
  documentProgressCounts,
  isTextCredentialType,
  mapCredentialStatusToChecklistStatus,
  requiredCredentialTypesForRole,
  validateCredentialTextValue,
  MAX_CREDENTIAL_TEXT_VALUE_LENGTH,
} from '../credential-requirements';

describe('credential text values', () => {
  it('marks tax and social insurance as required text credentials for all roles', () => {
    for (const role of [
      'registered_nurse',
      'ward_assistant',
      'physiotherapist',
    ] as const) {
      const required = requiredCredentialTypesForRole(role);
      expect(required).toContain('tax_identification_proof');
      expect(required).toContain('social_insurance_proof');
      for (const type of TEXT_CREDENTIAL_TYPES) {
        expect(credentialInputKind(type)).toBe('text');
        expect(isTextCredentialType(type)).toBe(true);
        expect(
          credentialRequirementsForRole(role).find(
            (r) => r.credentialType === type,
          )?.isRequired,
        ).toBe(true);
      }
    }
  });

  it('keeps every other role requirement as a file upload', () => {
    const types = new Set(
      (
        [
          'registered_nurse',
          'ward_assistant',
          'physiotherapist',
        ] as const
      ).flatMap((role) =>
        credentialRequirementsForRole(role).map((r) => r.credentialType),
      ),
    );
    for (const type of types) {
      if ((TEXT_CREDENTIAL_TYPES as readonly string[]).includes(type)) {
        expect(credentialInputKind(type)).toBe('text');
      } else {
        expect(credentialInputKind(type)).toBe('file');
      }
    }
    expect(credentialInputKind('nursing_licence')).toBe('file');
    expect(credentialInputKind('nursing_degree')).toBe('file');
    expect(credentialInputKind('cv')).toBe('file');
    expect(credentialInputKind('physiotherapy_degree')).toBe('file');
    expect(
      credentialInputKind('physiotherapist_registration_certificate'),
    ).toBe('file');
    expect(credentialInputKind('physiotherapy_practising_licence')).toBe(
      'file',
    );
  });

  it('uses identification labels rather than proof-upload labels', () => {
    expect(credentialTypeLabel('tax_identification_proof', 'en')).toBe(
      'Tax identification',
    );
    expect(credentialTypeLabel('social_insurance_proof', 'en')).toBe(
      'Social insurance',
    );
    expect(credentialTypeLabel('tax_identification_proof', 'el')).toBe(
      'Αριθμός φορολογικής ταυτότητας',
    );
    expect(credentialTypeLabel('social_insurance_proof', 'el')).toBe(
      'Αριθμός κοινωνικής ασφάλισης',
    );
  });

  it('validates and trims text values', () => {
    expect(validateCredentialTextValue('')).toEqual({
      ok: false,
      error: 'This field is required.',
    });
    expect(validateCredentialTextValue('   ')).toEqual({
      ok: false,
      error: 'This field is required.',
    });
    expect(validateCredentialTextValue('  123456  ')).toEqual({
      ok: true,
      value: '123456',
    });
    expect(
      validateCredentialTextValue('a'.repeat(MAX_CREDENTIAL_TEXT_VALUE_LENGTH + 1)),
    ).toMatchObject({ ok: false });
    expect(validateCredentialTextValue('bad\nvalue')).toMatchObject({
      ok: false,
    });
    expect(validateCredentialTextValue('uploaded')).toMatchObject({
      ok: false,
    });
    expect(validateCredentialTextValue('verified')).toMatchObject({
      ok: false,
    });
    expect(validateCredentialTextValue('n/a')).toMatchObject({ ok: false });
  });

  it('treats text values as payload for checklist completion', () => {
    expect(
      mapCredentialStatusToChecklistStatus('pending', false),
    ).toBe('not_uploaded');
    expect(
      mapCredentialStatusToChecklistStatus('pending', true),
    ).toBe('draft');
    expect(
      credentialPayloadPresent({ hasFile: false, hasTextValue: true }),
    ).toBe(true);
    expect(
      credentialPayloadPresent({ hasFile: true, hasTextValue: false }),
    ).toBe(true);
    expect(
      credentialPayloadPresent({ hasFile: false, hasTextValue: false }),
    ).toBe(false);

    const counts = documentProgressCounts({
      role: 'ward_assistant',
      credentials: [
        {
          credentialType: 'identity_document_front',
          status: 'pending',
          hasFile: true,
        },
        {
          credentialType: 'identity_document_back',
          status: 'pending',
          hasFile: true,
        },
        {
          credentialType: 'employment_certificate',
          status: 'pending',
          hasFile: true,
        },
        {
          credentialType: 'tax_identification_proof',
          status: 'pending',
          hasFile: false,
          hasTextValue: true,
        },
        {
          credentialType: 'social_insurance_proof',
          status: 'pending',
          hasFile: false,
          hasTextValue: true,
        },
      ],
    });
    expect(counts.missing).toBe(0);
    expect(counts.submitted).toBe(5);
  });
});
