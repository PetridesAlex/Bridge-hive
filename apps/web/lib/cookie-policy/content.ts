/**
 * BridgeHive Cookie Policy, Version 1.0 — Final, 18 November 2026.
 *
 * Finalised against the 12 November 2026 public-website technical inventory
 * and the 18 November 2026 local recheck on the release-candidate website.
 * Company Tax Identification Number (TIN) 60418646N is supplied for identity.
 *
 * This Policy covers the BridgeHive website (https://bridgehive.app).
 * It does not claim to describe every native mobile SDK storage technology.
 */

import type { PolicyArticle } from '@/lib/legal-policy/types';

/** Company TIN used in Cookie Policy identity (same legal entity as Privacy). */
export const COOKIE_POLICY_TAX_ID: string = '60418646N';

/** Flip back to false only if the page must be taken offline again. */
export const COOKIE_POLICY_PUBLISH_APPROVED = true;

export const COOKIE_POLICY_HEADER = {
  company: 'BRIDGEHIVE MEDICAL RECRUITMENT LIMITED',
  title: 'COOKIE POLICY',
  subtitle: 'Cookies and similar technologies',
  linesBeforeTaxId: [
    'Website: https://bridgehive.app',
    'Contact: info@bridgehive.app',
    'Company Registration Number: HE 498387',
  ],
  linesAfterTaxId: [
    'Registered Office: 237 Archbishop Makarios III Avenue, DIANA HOUSE, 5th Floor, Office 518, 3105 Limassol, Cyprus',
  ],
  version: 'Version: 1.0',
  lastUpdated: 'Last Updated: 18 November 2026',
  end: 'END OF COOKIE POLICY',
  endVersion: 'Version 1.0 \u2014 18 November 2026',
} as const;

export const COOKIE_POLICY_ARTICLES: PolicyArticle[] = [
  {
    id: 'section-1',
    title: '1 \u2014 Introduction',
    blocks: [
      'BridgeHive Medical Recruitment LIMITED (\u201cBridgeHive\u201d, \u201cwe\u201d, \u201cus\u201d, or \u201cour\u201d) is committed to transparency regarding the use of cookies and similar technologies on our website and digital platform.',
      'This Cookie Policy explains what cookies are, how they are used on the BridgeHive website at https://bridgehive.app, and how visitors can manage their browser preferences.',
      'This Policy addresses browser cookies and similar web storage used by the website. It does not claim that the website storage notice covers every native mobile application SDK or device storage technology.',
    ],
  },
  {
    id: 'section-2',
    title: '2 \u2014 What Are Cookies?',
    blocks: [
      'Cookies are small text files that websites may store on a user\u2019s device. Similar technologies, including local storage and session storage, may also be used to support website functionality.',
      'These technologies can help websites maintain secure sessions, enable account authentication and remember certain user preferences.',
    ],
  },
  {
    id: 'section-3',
    title: '3 \u2014 Essential Cookies and Technologies',
    blocks: [
      'Based on the current public-website configuration, BridgeHive uses first-party essential cookies and browser storage for the following purposes:',
      {
        kind: 'ul',
        items: [
          'Secure user authentication and login sessions (Supabase authentication cookies, named with the pattern sb-<project-ref>-auth-token, including chunked names where required, set only after sign-in).',
          'Recording the organisation \u201cRemember me\u201d sign-in preference (HttpOnly cookie named bh_org_remember).',
          'Short-lived organisation invitation and worker password-recovery session cookies (bh_org_invitation_id and bh_worker_recovery) used only during those flows.',
          'Remembering dismissal of the informational website storage notice (localStorage key bh:m-storage-notice).',
          'Supporting essential website and platform operations required for the requested account or page functions.',
        ],
      },
      'Anonymous visits to public marketing pages do not set authentication cookies. Decorative sessionStorage flags previously used for the logo intro and recruitment promo are no longer written and are cleared if still present.',
      'The website storage notice is informational. Selecting \u201cUnderstood\u201d (or the Greek equivalent \u201cΚατάλαβα\u201d) is an acknowledgement that the notice was seen; it is not consent to analytics or advertising tracking.',
      'Strictly necessary technologies do not generally require prior consent where an applicable exemption applies, but users must still receive appropriate information about their use.',
      'No optional analytics or advertising storage is currently active on the public website. If optional storage is introduced, BridgeHive will implement the required choice control before activation rather than labelling it as necessary.',
    ],
  },
  {
    id: 'section-4',
    title: '4 \u2014 Analytics and Advertising Cookies',
    blocks: [
      'Based on the technical review of the public BridgeHive website conducted on 12 November 2026, and reconfirmed on the release-candidate website on 18 November 2026, Google Analytics, Google Tag Manager and Meta Pixel were not detected.',
      'Vercel Analytics and Vercel Speed Insights packages are not installed for the public website, and no advertising or analytics tags are loaded.',
      'BridgeHive does not currently identify these technologies as active on its public website.',
      'If non-essential analytics, advertising or tracking technologies are introduced in the future, BridgeHive will update this Policy and implement the necessary consent mechanisms before using them.',
    ],
  },
  {
    id: 'section-5',
    title: '5 \u2014 Cookie Notice',
    blocks: [
      'BridgeHive displays an informational notice on public marketing pages explaining the use of essential cookies and similar technologies.',
      'Selecting \u201cUnderstood\u201d acknowledges the notice and stores a first-party localStorage preference (bh:m-storage-notice, versioned information acknowledgement) so the notice is not displayed repeatedly in that browser.',
      'This acknowledgement does not constitute consent to analytics or advertising tracking.',
      'Visitors can reopen the notice details at any time from the website footer control labelled \u201cStorage details\u201d (Greek: \u201cΛεπτομέρειες αποθήκευσης\u201d).',
      'The website notice does not cover every native mobile SDK storage technology used by the BridgeHive worker application.',
    ],
  },
  {
    id: 'section-6',
    title: '6 \u2014 Cookie Duration and Browser Storage',
    blocks: [
      'The following inventory describes the technologies currently used on the BridgeHive website:',
      {
        kind: 'ul',
        items: [
          'bh:m-storage-notice (localStorage): set after the visitor selects \u201cUnderstood\u201d. Purpose: remember notice acknowledgement. No automatic expiry in code; remains until site data is cleared or the notice version changes.',
          'sb-<project-ref>-auth-token (and chunked names where required) (cookie): set only after sign-in. Purpose: keep organisation and worker account sessions working. On the server and middleware path used for organisation sign-in, lifetime is thirty (30) days when Remember me is enabled, or a session cookie when Remember me is disabled. Live Set-Cookie attributes from an authorised test session were not available at finalisation; values above are from the configured application source.',
          'bh_org_remember (HttpOnly cookie): set on organisation sign-in. Purpose: record the Remember me preference that selects the auth-cookie lifetime above. Lifetime is thirty (30) days when Remember me is enabled, or a session cookie when disabled (source configuration).',
          'bh_org_invitation_id (HttpOnly cookie): set only during organisation invitation / activation flows. Lifetime thirty (30) minutes (source configuration).',
          'bh_worker_recovery (HttpOnly cookie): set only during worker password-recovery flows. Lifetime thirty (30) minutes (source configuration).',
        ],
      },
      'Some browser-client session writes performed by the authentication library outside the organisation Remember me override may use the library default lifetime. BridgeHive will keep this inventory accurate as configurations change.',
      'Users may delete cookies and site data through their browser settings at any time.',
    ],
  },
  {
    id: 'section-7',
    title: '7 \u2014 Managing Cookies',
    blocks: [
      'Users can manage or delete cookies through their browser settings.',
      'Disabling certain essential cookies or storage technologies may prevent account login or affect the functionality of the website and platform.',
    ],
  },
  {
    id: 'section-8',
    title: '8 \u2014 Third-Party Service Providers',
    blocks: [
      'BridgeHive uses technical infrastructure providers, including Vercel and Supabase.',
      'These providers may support hosting, authentication, database services and other technical functions.',
      'Any cookies or browser storage associated with these services are assessed according to their actual use and configuration on the BridgeHive website, as described in this Policy.',
    ],
  },
  {
    id: 'section-9',
    title: '9 \u2014 Changes to This Policy',
    blocks: [
      'BridgeHive may update this Cookie Policy to reflect technical changes, new website functionality or applicable legal requirements.',
      'The updated version will be published on the website with a revised date.',
    ],
  },
  {
    id: 'section-10',
    title: '10 \u2014 Contact',
    blocks: [
      'For questions about cookies, browser storage or personal data protection, please contact:',
      {
        kind: 'lines',
        withTaxId: 'after-registration',
        lines: [
          'BridgeHive Medical Recruitment LIMITED',
          'Email: info@bridgehive.app',
          'Website: https://bridgehive.app',
          'Company Registration Number: HE 498387',
          'Registered Office: 237 Archbishop Makarios III Avenue, DIANA HOUSE, 5th Floor, Office 518, 3105 Limassol, Cyprus',
        ],
      },
    ],
  },
];

export function cookiePolicyIsPublishable(): boolean {
  return COOKIE_POLICY_PUBLISH_APPROVED;
}

/** True when header metadata no longer carries Draft status and TIN is set. */
export function cookiePolicyIsFinal(): boolean {
  return (
    Boolean(COOKIE_POLICY_TAX_ID) &&
    !/draft/i.test(COOKIE_POLICY_HEADER.version) &&
    !/draft/i.test(COOKIE_POLICY_HEADER.endVersion)
  );
}

/**
 * Release/build assertion for the current final Cookie Policy output only.
 */
export function assertFinalCookiePolicyContent(): void {
  const problems: string[] = [];
  if (!COOKIE_POLICY_TAX_ID) {
    problems.push('COOKIE_POLICY_TAX_ID is missing');
  }
  if (COOKIE_POLICY_TAX_ID !== '60418646N') {
    problems.push('COOKIE_POLICY_TAX_ID is not the approved company TIN');
  }
  for (const [name, text] of [
    ['version', COOKIE_POLICY_HEADER.version],
    ['lastUpdated', COOKIE_POLICY_HEADER.lastUpdated],
    ['endVersion', COOKIE_POLICY_HEADER.endVersion],
  ] as const) {
    if (/draft/i.test(text)) problems.push(`${name} contains Draft`);
    if (/PLACEHOLDER/i.test(text)) problems.push(`${name} contains PLACEHOLDER`);
  }
  const corpus = COOKIE_POLICY_ARTICLES.map((a) =>
    a.blocks
      .map((b) =>
        typeof b === 'string'
          ? b
          : b.kind === 'h3'
            ? b.text
            : b.kind === 'lines'
              ? b.lines.join('\n')
              : b.items.join('\n'),
      )
      .join('\n'),
  ).join('\n');
  if (/subject to final technical verification/i.test(corpus)) {
    problems.push('corpus still claims final technical verification is pending');
  }
  if (/Draft for Legal Review/i.test(corpus)) {
    problems.push('corpus contains Draft for Legal Review');
  }
  if (problems.length) {
    throw new Error(
      `Final Cookie Policy content failed assertion: ${problems.join('; ')}`,
    );
  }
}

/** Hosted production must not serve the draft until it is approved. */
export function cookiePolicyIsBlockedHere(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.VERCEL_ENV === 'production' && !cookiePolicyIsPublishable();
}
