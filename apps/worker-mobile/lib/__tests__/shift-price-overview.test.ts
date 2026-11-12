import fs from 'node:fs';
import path from 'node:path';

import { commissionFromGross, DEFAULT_COMMISSION_RATE_BPS } from '@bridge-hive/domain';

const root = path.resolve(__dirname, '../..');

function source(rel: string) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('shift price overview presentation', () => {
  it('keeps browsing card free of commission debit / net rows', () => {
    const card = source('components/shifts/ShiftPriceBreakdown.tsx');
    expect(card).toContain('estimatedGrossPay');
    expect(card).toContain('paymentDetails');
    expect(card).toContain('durationMinutes');
    expect(card).not.toContain('commissionMinor');
    expect(card).not.toContain('netMinor');
    expect(card).not.toContain('After commission');
    expect(card).not.toContain('rowDebit');
    expect(card).not.toMatch(/−\$\{/);
  });

  it('shows fee disclosure before accept confirmation', () => {
    const screen = source('app/(tabs)/shifts/[id].tsx');
    expect(screen).toContain('ConfirmModal');
    expect(screen).toContain('claimConfirmVisible');
    expect(screen).toContain('acceptConfirmFee');
    expect(screen).toContain('setClaimConfirmVisible(true)');
    expect(screen).not.toContain('acceptConfirmEstimate');
    expect(screen).not.toContain('formatMoney(commissionMinor');
    expect(screen).not.toContain('DEFAULT_COMMISSION_RATE_BPS');
    // Claim still uses the same RPC after confirm.
    expect(screen).toContain('claimShift(id)');
  });

  it('preserves authoritative 17% commission math helpers', () => {
    expect(DEFAULT_COMMISSION_RATE_BPS).toBe(1700);
    expect(commissionFromGross(10_000)).toBe(1_700);
    expect(commissionFromGross(1)).toBe(0);
  });

  it('includes English and Greek price-overview strings without rate numerals', () => {
    const en = source('i18n/translations/en.ts');
    const el = source('i18n/translations/el.ts');
    for (const src of [en, el]) {
      expect(src).toContain('estimatedGrossPay:');
      expect(src).toContain('estimatedGrossPayHint:');
      expect(src).toContain('paymentDetails:');
      expect(src).toContain('paymentDetailsCommission:');
      expect(src).toContain('acceptConfirmFee:');
      expect(src).not.toContain('%{percent}');
    }
    expect(en).not.toMatch(/Platform commission is 17%/);
  });
});
