/**
 * Local/dev-only provenance for verifying the loaded client matches the
 * release candidate. Values are injected at process start by bh-dev-launch.sh.
 * Production builds must not depend on these env vars.
 */

export type DevProvenance = {
  candidateLabel: string;
  branch: string;
  baseSha: string;
  dirtyFingerprint: string;
  stripeMode: string;
  supabaseHost: string;
  startedAt: string;
};

function read(name: string): string {
  if (typeof process === 'undefined' || !process.env) return '';
  // Next client needs NEXT_PUBLIC_*; Expo needs EXPO_PUBLIC_*.
  const bare = name.replace(/^EXPO_PUBLIC_/, '').replace(/^NEXT_PUBLIC_/, '');
  return (
    process.env[name] ||
    process.env[`NEXT_PUBLIC_${bare}`] ||
    process.env[`EXPO_PUBLIC_${bare}`] ||
    process.env[bare] ||
    ''
  ).trim();
}

export function getDevProvenance(): DevProvenance | null {
  const baseSha = read('BH_DEV_BASE_SHA');
  if (!baseSha) return null;
  return {
    candidateLabel: read('BH_DEV_CANDIDATE') || 'unknown',
    branch: read('BH_DEV_BRANCH') || 'unknown',
    baseSha,
    dirtyFingerprint: read('BH_DEV_DIRTY_FP') || 'unknown',
    stripeMode: read('BH_DEV_STRIPE_MODE') || 'unset',
    supabaseHost: read('BH_DEV_SUPABASE_HOST') || 'unknown',
    startedAt: read('BH_DEV_STARTED_AT') || '',
  };
}

export function formatDevProvenanceLine(p: DevProvenance): string {
  return `BH-RC ${p.branch}@${p.baseSha.slice(0, 7)} dirty=${p.dirtyFingerprint.slice(0, 12)} stripe=${p.stripeMode} sb=${p.supabaseHost}`;
}
