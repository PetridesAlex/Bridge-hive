/**
 * BridgeHive Cookie Policy — Draft, 13 November 2026.
 *
 * The wording below is the client-supplied text. Only these changes were made:
 *  - list bullets are rendered by the page instead of typed in;
 *  - section titles use an en-dash separator for the shared legal layout.
 *
 * Do not edit the text to fix substance.
 */

import type { PolicyArticle } from '@/lib/legal-policy/types';

/** Flip back to false only if the page must be taken offline again. */
export const COOKIE_POLICY_PUBLISH_APPROVED = true;

export const COOKIE_POLICY_HEADER = {
  company: 'BRIDGEHIVE MEDICAL RECRUITMENT LIMITED',
  title: 'COOKIE POLICY',
  subtitle: 'Cookies and similar technologies',
  identityLines: [
    'Website: https://bridgehive.app',
    'Contact: info@bridgehive.app',
  ],
  version: 'Draft for Legal Review',
  lastUpdated: 'Last Updated: 13 November 2026',
  end: 'END OF COOKIE POLICY',
  endVersion: 'Draft for Legal Review \u2014 13 November 2026',
} as const;

export const COOKIE_POLICY_ARTICLES: PolicyArticle[] = [
  {
    id: 'section-1',
    title: '1 \u2014 Introduction',
    blocks: [
      'BridgeHive Medical Recruitment LIMITED (\u201cBridgeHive\u201d, \u201cwe\u201d, \u201cus\u201d, or \u201cour\u201d) is committed to transparency regarding the use of cookies and similar technologies on our website and digital platform.',
      'This Cookie Policy explains what cookies are, how they are used, and how visitors can manage their browser preferences.',
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
      'BridgeHive uses, or may use where necessary for the relevant functionality, essential cookies and browser storage for purposes including:',
      {
        kind: 'ul',
        items: [
          'Secure user authentication and login sessions.',
          'Maintaining account and session functionality.',
          'Protecting the website against unauthorised access.',
          'Remembering cookie notice acknowledgement.',
          'Supporting essential website and platform operations.',
        ],
      },
      'Strictly necessary technologies do not generally require prior consent where an applicable exemption applies, but users must still receive appropriate information about their use.',
    ],
  },
  {
    id: 'section-4',
    title: '4 \u2014 Analytics and Advertising Cookies',
    blocks: [
      'Based on the technical review of the public BridgeHive website conducted on 12 November 2026, Google Analytics, Google Tag Manager and Meta Pixel were not detected.',
      'BridgeHive does not currently identify these technologies as active on its public website.',
      'If non-essential analytics, advertising or tracking technologies are introduced in the future, BridgeHive will update this Policy and implement the necessary consent mechanisms before using them.',
    ],
  },
  {
    id: 'section-5',
    title: '5 \u2014 Cookie Notice',
    blocks: [
      'BridgeHive may display an informational notice explaining the use of essential cookies and similar technologies.',
      'Selecting \u201cUnderstood\u201d acknowledges the notice and may store a preference preventing the notice from being displayed repeatedly.',
      'This acknowledgement does not constitute consent to analytics or advertising tracking.',
    ],
  },
  {
    id: 'section-6',
    title: '6 \u2014 Cookie Duration and Browser Storage',
    blocks: [
      'The duration of cookies and browser storage depends on their technical purpose and configuration.',
      'Some session technologies expire when the session ends, while other necessary preferences may be retained for a defined period.',
      'The exact names, purposes and lifetimes of authentication cookies and browser storage technologies are subject to final technical verification.',
      'BridgeHive will maintain an accurate inventory of these technologies as part of its privacy documentation.',
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
      'Any cookies or browser storage associated with these services must be assessed according to their actual use and configuration.',
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
        lines: [
          'BridgeHive Medical Recruitment LIMITED',
          'Email: info@bridgehive.app',
          'Website: https://bridgehive.app',
        ],
      },
    ],
  },
];

export function cookiePolicyIsPublishable(): boolean {
  return COOKIE_POLICY_PUBLISH_APPROVED;
}

/** Hosted production must not serve the draft until it is approved. */
export function cookiePolicyIsBlockedHere(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.VERCEL_ENV === 'production' && !cookiePolicyIsPublishable();
}
