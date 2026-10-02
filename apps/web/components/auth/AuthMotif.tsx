/** Original clinical workflow motif for auth portals (not stock photography). */
export function AuthMotif({ accent = 'teal' }: { accent?: 'teal' | 'honey' }) {
  const stroke = accent === 'honey' ? '#e0aa18' : '#16a6b6';

  return (
    <div className="auth-portal-motif" aria-hidden="true">
      <svg viewBox="0 0 520 416" className="absolute inset-0 h-full w-full" role="img">
        <defs>
          <linearGradient id="authTeal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#16a6b6" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#087f8c" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="authHoney" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#e0aa18" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#c9920f" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="authPanel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#123a55" />
            <stop offset="100%" stopColor="#0a2438" />
          </linearGradient>
        </defs>

        <circle cx="430" cy="72" r="90" fill={stroke} opacity="0.12" />
        <circle cx="70" cy="340" r="70" fill="#e0aa18" opacity="0.1" />

        <rect x="40" y="44" width="196" height="132" rx="18" fill="url(#authTeal)" opacity="0.28" />
        <rect x="56" y="64" width="110" height="10" rx="5" fill="#edf3f5" opacity="0.55" />
        <rect x="56" y="88" width="148" height="8" rx="4" fill="#dce8ee" opacity="0.35" />
        <rect x="56" y="108" width="96" height="8" rx="4" fill="#dce8ee" opacity="0.28" />
        <rect x="56" y="136" width="64" height="22" rx="11" fill="#e0aa18" opacity="0.85" />

        <rect x="256" y="56" width="220" height="108" rx="18" fill="#123a55" opacity="0.9" />
        <rect x="276" y="78" width="72" height="8" rx="4" fill="#91a8b5" opacity="0.55" />
        <rect x="276" y="98" width="168" height="10" rx="5" fill="#dce8ee" opacity="0.45" />
        <rect x="276" y="120" width="120" height="8" rx="4" fill={stroke} opacity="0.55" />

        <rect
          x="48"
          y="200"
          width="300"
          height="168"
          rx="22"
          fill="url(#authPanel)"
          stroke={stroke}
          strokeOpacity="0.35"
        />
        <circle cx="108" cy="268" r="28" fill="url(#authHoney)" />
        <rect x="156" y="248" width="148" height="12" rx="6" fill="#edf3f5" opacity="0.7" />
        <rect x="156" y="274" width="112" height="9" rx="4.5" fill="#91a8b5" opacity="0.55" />
        <rect x="156" y="300" width="176" height="9" rx="4.5" fill="#91a8b5" opacity="0.35" />
        <rect x="72" y="332" width="88" height="18" rx="9" fill={stroke} opacity="0.75" />
        <rect x="172" y="332" width="72" height="18" rx="9" fill="#dce8ee" opacity="0.2" />

        <path
          d="M372 236c36-52 92-62 132-24"
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.75"
        />
        <circle cx="504" cy="212" r="11" fill={stroke} />
        <circle cx="392" cy="248" r="6" fill="#e0aa18" opacity="0.9" />

        <rect x="372" y="280" width="116" height="88" rx="16" fill="#0f334c" opacity="0.95" />
        <rect x="390" y="302" width="80" height="8" rx="4" fill="#dce8ee" opacity="0.4" />
        <rect x="390" y="322" width="56" height="8" rx="4" fill={stroke} opacity="0.5" />
        <rect x="390" y="342" width="68" height="8" rx="4" fill="#91a8b5" opacity="0.35" />
      </svg>
    </div>
  );
}
