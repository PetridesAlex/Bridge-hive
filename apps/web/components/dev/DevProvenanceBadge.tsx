'use client';

import {
  formatDevProvenanceLine,
  getDevProvenance,
} from '../../../../packages/dev-provenance';

/**
 * Dev-only floating marker. Renders nothing when BH_DEV_BASE_SHA is unset
 * (production / unmarked local runs).
 */
export function DevProvenanceBadge() {
  if (process.env.NODE_ENV === 'production' && !process.env.BH_DEV_BASE_SHA) {
    return null;
  }
  const p = getDevProvenance();
  if (!p) return null;

  return (
    <div
      data-bh-dev-provenance={p.baseSha}
      data-bh-dev-dirty={p.dirtyFingerprint}
      data-bh-dev-stripe={p.stripeMode}
      style={{
        position: 'fixed',
        zIndex: 2147483646,
        left: 8,
        bottom: 8,
        maxWidth: 'min(92vw, 520px)',
        padding: '6px 10px',
        borderRadius: 8,
        background: 'rgba(11, 42, 67, 0.88)',
        color: '#F4FBFC',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 11,
        lineHeight: 1.35,
        pointerEvents: 'none',
      }}
    >
      {formatDevProvenanceLine(p)}
    </div>
  );
}
