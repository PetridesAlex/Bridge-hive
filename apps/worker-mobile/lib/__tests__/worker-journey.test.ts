import { buildWorkerJourneySnapshot } from '../worker-journey';

describe('buildWorkerJourneySnapshot', () => {
  it('keeps marketplace locked until verification_status is verified', () => {
    const snap = buildWorkerJourneySnapshot({
      role: 'registered_nurse',
      verificationStatus: 'draft',
      credentials: [
        {
          credentialType: 'identity_card_front',
          status: 'verified',
          hasFile: true,
        },
      ],
      payoutStatus: null,
    });
    expect(snap.marketplaceUnlocked).toBe(false);
    expect(snap.accountStatus).not.toBe('fully_activated');
    expect(snap.primaryAction?.href).not.toBe('/(tabs)/shifts');
  });

  it('marks ready_to_submit when all required files are uploaded', () => {
    const snap = buildWorkerJourneySnapshot({
      role: 'ward_assistant',
      verificationStatus: 'draft',
      credentials: [
        { credentialType: 'identity_document_front', status: 'pending', hasFile: true },
        { credentialType: 'identity_document_back', status: 'pending', hasFile: true },
        { credentialType: 'employment_certificate', status: 'pending', hasFile: true },
        { credentialType: 'tax_identification_proof', status: 'pending', hasFile: true },
        { credentialType: 'social_insurance_proof', status: 'pending', hasFile: true },
      ],
      payoutStatus: null,
    });
    expect(snap.canSubmitPackage).toBe(true);
    expect(snap.accountStatus).toBe('ready_to_submit');
    expect(snap.primaryAction?.href).toBe('/auth/worker/pending');
    expect(snap.marketplaceUnlocked).toBe(false);
  });

  it('unlocks marketplace only when fully activated', () => {
    const snap = buildWorkerJourneySnapshot({
      role: 'registered_nurse',
      verificationStatus: 'verified',
      credentials: [],
      payoutStatus: 'verified',
    });
    expect(snap.accountStatus).toBe('fully_activated');
    expect(snap.marketplaceUnlocked).toBe(true);
    expect(snap.primaryAction?.href).toBe('/(tabs)/shifts');
  });

  it('treats submitted verification as submitted account status', () => {
    const snap = buildWorkerJourneySnapshot({
      role: 'registered_nurse',
      verificationStatus: 'submitted',
      credentials: [],
      payoutStatus: 'pending',
    });
    expect(snap.accountStatus).toBe('submitted');
    expect(snap.marketplaceUnlocked).toBe(false);
  });
});
