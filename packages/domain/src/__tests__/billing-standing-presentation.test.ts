import {
  billingStandingLabel,
  marketplacePausedForLiveBillingStanding,
  presentWorkerBillingStanding,
  sandboxPaymentEligibilityIndependentOfLiveStanding,
} from '../account-hub';

describe('billing standing vs sandbox payment presentation', () => {
  it('keeps sandbox payment eligibility independent of live standing', () => {
    expect(sandboxPaymentEligibilityIndependentOfLiveStanding()).toBe(true);
    // Overdue live standing still pauses marketplace access.
    expect(marketplacePausedForLiveBillingStanding('restricted')).toBe(true);
    expect(marketplacePausedForLiveBillingStanding('good_standing')).toBe(false);
    expect(marketplacePausedForLiveBillingStanding(null)).toBe(false);
  });

  it('surfaces live restricted standing on a sandbox payment build (overdue obligation)', () => {
    const presented = presentWorkerBillingStanding({
      paymentsMode: 'sandbox',
      standing: 'restricted',
    });
    expect(presented.kind).toBe('sandbox_restricted');
    expect(presented.label).toBe('Live standing · restricted');
    expect(presented.label.toLowerCase()).not.toContain('good standing');
    expect(presented.tone).toBe('danger');
    expect(marketplacePausedForLiveBillingStanding('restricted')).toBe(true);
  });

  it('never returns unqualified Good standing for sandbox payments + clear live standing', () => {
    const presented = presentWorkerBillingStanding({
      paymentsMode: 'sandbox',
      standing: 'good_standing',
    });
    expect(presented.kind).toBe('sandbox_good_standing');
    expect(presented.label).toBe('Live standing clear · sandbox payments');
    expect(presented.label).not.toBe('Good standing');
    expect(presented.tone).toBe('info');
  });

  it('shows Billing status unavailable for failed or denied standing reads', () => {
    expect(
      presentWorkerBillingStanding({
        paymentsMode: 'sandbox',
        standing: null,
        readFailed: true,
      }),
    ).toMatchObject({
      kind: 'unavailable',
      label: 'Billing status unavailable',
    });
    expect(
      presentWorkerBillingStanding({
        paymentsMode: 'live',
        standing: undefined,
        readFailed: true,
      }).label,
    ).toBe('Billing status unavailable');
    expect(billingStandingLabel(null)).toBe('Billing status unavailable');
    expect(billingStandingLabel('not_authorized')).toBe('Billing status unavailable');
  });

  it('keeps live payment mode labels and separates sandbox invoice state from standing', () => {
    expect(
      presentWorkerBillingStanding({
        paymentsMode: 'live',
        standing: 'good_standing',
      }),
    ).toMatchObject({
      kind: 'good_standing',
      label: 'Good standing',
      tone: 'success',
    });
    expect(
      presentWorkerBillingStanding({
        paymentsMode: 'live',
        standing: 'restricted',
      }),
    ).toMatchObject({
      kind: 'restricted',
      label: 'Billing restricted',
      tone: 'danger',
    });
    // Contract: sandbox payments may still be eligible while live standing is restricted.
    expect(sandboxPaymentEligibilityIndependentOfLiveStanding()).toBe(true);
    expect(
      presentWorkerBillingStanding({
        paymentsMode: 'sandbox',
        standing: 'restricted',
      }).kind,
    ).toBe('sandbox_restricted');
  });
});
