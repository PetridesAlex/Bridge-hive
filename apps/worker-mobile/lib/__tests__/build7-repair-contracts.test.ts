import { readFileSync } from 'fs';
import { join } from 'path';

import { formatDevProvenanceLine } from '../../../../packages/dev-provenance';

const root = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('build-7 messaging repair contracts (source level; not a native test)', () => {
  const thread = read('app/messages/[id].tsx');

  it('uses expo-crypto for client message ids', () => {
    expect(read('lib/secure-uuid.ts')).toMatch(/from 'expo-crypto'/);
    expect(thread).toMatch(/newClientMessageId\(createSecureClientMessageId\)/);
  });

  it('retains one UUID across retries and releases the lock in finally', () => {
    expect(thread).toMatch(/logicalSendRef/);
    expect(thread).toMatch(/send\(message\.clientMessageId, message\.body/);
    expect(thread).toMatch(/finally \{\s*sendLockRef\.current\.release\(\);/);
  });

  it('keeps the draft until the server accepts and never clears a newer draft', () => {
    expect(thread).toMatch(/setDraft\(\(current\) => \(current === draftAtSend \? '' : current\)\)/);
    expect(thread).not.toMatch(/setDraft\(''\);\s*\n\s*const result/);
  });

  it('separates send errors from load errors', () => {
    expect(thread).toMatch(/setSendError\(t\('messages\.sendFailed'\)\)/);
    expect(thread).not.toMatch(/setError\(t\('messages\.sendFailed'\)\)/);
    expect(thread).toMatch(/sendError=\{/);
    expect(read('components/messages/ThreadView.tsx')).toMatch(/sendError \?/);
  });

  it('swallows optional reaction failures', () => {
    expect(thread).toMatch(/Reactions are optional/);
    expect(thread).toMatch(/REACTION_FAILED/);
  });
});

describe('build-7 money repair contracts (source level)', () => {
  const money = read('app/(tabs)/payments.tsx');

  it('never shows a verified earnings or invoice total for a failed/denied read', () => {
    expect(money).toMatch(/earningsReady/);
    expect(money).toMatch(/amountLabel=\{earningsReady \? undefined/);
    expect(money).toMatch(/amountLabel=\{invoiceTotalsReady \? undefined/);
  });

  it('uses a single vertical scroll surface for every segment', () => {
    expect(money).toMatch(/<FlatList/);
    expect(money).not.toMatch(/<ScrollView/);
  });
});

describe('build-7 backend configuration and read-failure contracts (source level)', () => {
  const supabaseClient = read('lib/supabase.ts');

  it('has no localhost, placeholder-key or production fallback in the mobile client', () => {
    expect(supabaseClient).not.toMatch(/54321/);
    expect(supabaseClient).not.toMatch(/\.invalid/);
    expect(supabaseClient).not.toMatch(/hfnymqjrbppculcofaag/);
    expect(supabaseClient).not.toMatch(/process\.env\.EXPO_PUBLIC_SUPABASE_[A-Z_]+\s*\?\?/);
    expect(supabaseClient).toMatch(/throw new Error\(/);
  });

  it('turns a thrown payout read into a failed read instead of a permanent spinner', () => {
    const hook = read('hooks/usePayouts.ts');
    expect(hook).toMatch(/catch \(e\)/);
    expect(hook).toMatch(/finally \{\s*setLoading\(false\);/);
  });

  it('renders the dev provenance badge in development only', () => {
    expect(read('components/dev/DevProvenanceBadge.tsx')).toMatch(/!__DEV__\) return null/);
  });
});

describe('dev provenance staging label', () => {
  const base = {
    candidateLabel: 'x',
    branch: 'b',
    baseSha: '1234567890',
    dirtyFingerprint: 'abcdef',
    stripeMode: 'sandbox',
    startedAt: '',
  };
  it('flags the Bridge-Hive-Test project', () => {
    expect(
      formatDevProvenanceLine({ ...base, supabaseHost: 'egtpiprwqgmkogthkmew.supabase.co' }),
    ).toMatch(/^STAGING \(Bridge-Hive-Test\)/);
  });
  it('flags the production project as live data in dev', () => {
    expect(
      formatDevProvenanceLine({ ...base, supabaseHost: 'hfnymqjrbppculcofaag.supabase.co' }),
    ).toMatch(/^PRODUCTION DATA/);
  });
  it('does not label other hosts as staging', () => {
    expect(
      formatDevProvenanceLine({ ...base, supabaseHost: '127.0.0.1:54321' }),
    ).not.toMatch(/STAGING/);
  });
});
