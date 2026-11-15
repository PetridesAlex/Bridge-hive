/**
 * BridgeHive Privacy Policy, Version 1.0 - Draft for Legal Review, 13 November 2026.
 *
 * The wording below is the client-supplied text. Only these changes were made:
 *  - chat export markers and stray line breaks from the pasted copy were removed;
 *  - the separator glyphs between header and articles were dropped;
 *  - list numbering and bullets are rendered by the page instead of typed in;
 *  - a clearly marked Tax ID placeholder line was added (see PRIVACY_POLICY_TAX_ID).
 *
 * Do not edit the text to fix substance. Technical discrepancies are tracked in a
 * separate review note, not in this file.
 */

import type { PolicyArticle } from '@/lib/legal-policy/types';

export type { PolicyArticle, PolicyBlock } from '@/lib/legal-policy/types';

/** The company has not supplied its Tax ID. Never guess it. */
export const PRIVACY_POLICY_TAX_ID: string | null = null;

/** Flip only after the client and legal approve publication and the Tax ID is filled. */
export const PRIVACY_POLICY_PUBLISH_APPROVED = false;

export const TAX_ID_PLACEHOLDER =
  '[TAX ID PLACEHOLDER - TO BE SUPPLIED BY THE COMPANY. DO NOT PUBLISH UNTIL FILLED]';

export const POLICY_HEADER = {
  company: 'BRIDGEHIVE MEDICAL RECRUITMENT LIMITED',
  title: 'PRIVACY POLICY',
  subtitle: 'Privacy and Personal Data Protection Policy',
  linesBeforeTaxId: [
    'Website: https://bridgehive.app',
    'Contact Email: info@bridgehive.app',
    'Company Registration Number: HE 498387',
  ],
  linesAfterTaxId: [
    'Registered Office: 237 Archbishop Makarios III Avenue, DIANA HOUSE, 5th Floor, Office 518, 3105 Limassol, Cyprus',
  ],
  version: 'Version: 1.0 \u2014 Draft for Legal Review',
  lastUpdated: 'Last Updated: 13 November 2026',
  end: 'END OF PRIVACY POLICY',
  endVersion: 'Version 1.0 \u2014 Draft for Legal Review \u2014 13 November 2026',
} as const;

export const POLICY_ARTICLES: PolicyArticle[] = [
  {
    id: 'article-1',
    title: 'Article 1 \u2014 Introduction',
    blocks: [
      'BridgeHive Medical Recruitment LIMITED (\u201cBridgeHive\u201d, \u201cthe Company\u201d, \u201cwe\u201d, \u201cus\u201d, or \u201cour\u201d) is committed to respecting individuals\u2019 privacy and protecting personal data processed in connection with its healthcare staffing, recruitment and digital platform services.',
      'This Privacy Policy explains how we collect, use, disclose, store, secure, retain and delete personal data through our website at https://bridgehive.app, our administrative and organisation dashboards, our mobile application when available, and our related professional communications.',
      'We process personal data in accordance with Regulation (EU) 2016/679, the General Data Protection Regulation (\u201cGDPR\u201d), and applicable legislation in the Republic of Cyprus, including relevant rules governing electronic communications.',
      'This Policy applies to healthcare professionals, nursing candidates, representatives of healthcare organisations, website visitors and individuals who contact or otherwise interact with BridgeHive.',
    ],
  },
  {
    id: 'article-2',
    title: 'Article 2 \u2014 Identity of the Data Controller',
    blocks: [
      'For processing activities for which it determines the purposes and means, the data controller is:',
      {
        kind: 'lines',
        withTaxId: 'after-registration',
        lines: [
          'Legal Name: BridgeHive Medical Recruitment LIMITED',
          'Company Registration Number: HE 498387',
          'Registered Address: 237 Archbishop Makarios III Avenue, DIANA HOUSE, 5th Floor, Office 518, 3105 Limassol, Cyprus',
          'Email: info@bridgehive.app',
          'Website: https://bridgehive.app',
        ],
      },
      'BridgeHive acts as a data controller for its platform administration, account management, professional verification, candidate management, recruitment activities and related services.',
      'Healthcare organisations may act as independent data controllers for their own hiring decisions, employment relationships, payment processing, workforce administration and other activities carried out for their own purposes.',
      'Individuals may contact BridgeHive at the email address above regarding privacy questions, complaints or the exercise of their data protection rights.',
    ],
  },
  {
    id: 'article-3',
    title: 'Article 3 \u2014 Scope of Services',
    blocks: [
      'BridgeHive provides healthcare staffing and professional recruitment services, initially focused on Cyprus.',
      'Our principal service areas are:',
      { kind: 'h3', text: '3.1 Flexible Shifts Marketplace' },
      'A digital marketplace intended to connect healthcare organisations with eligible professionals for temporary or flexible staffing opportunities. The professional categories covered are:',
      { kind: 'ul', items: ['Registered Nurses.', 'Ward Assistants.', 'Physiotherapists.'] },
      { kind: 'h3', text: '3.2 Nursing Recruitment' },
      'A recruitment service exclusively for nurses, including experienced registered nurses, newly qualified nurses and nursing graduates from Cyprus and Greece seeking employment opportunities in Cyprus.',
      'Ward assistants and physiotherapists are not included in the Nursing Recruitment service.',
      'Services may be delivered through our website, secure dashboards, mobile application when available, and direct professional communication.',
      'A reference to a planned service or application feature does not mean that the feature is already operational.',
    ],
  },
  {
    id: 'article-4',
    title: 'Article 4 \u2014 Categories of Personal Data',
    blocks: [
      'Depending on the services requested and the individual\u2019s relationship with BridgeHive, we may process the following information.',
      { kind: 'h3', text: '4.1 Identification and Contact Information' },
      'Full name, email address, telephone number, preferred city or work location, and other relevant contact details.',
      { kind: 'h3', text: '4.2 Professional and Educational Information' },
      'Professional category, university degree, academic qualifications, employment history, clinical experience, language skills, availability, work preferences and curriculum vitae.',
      { kind: 'h3', text: '4.3 Professional Verification Documents' },
      'Professional registration certificates, licences to practise, diplomas, educational certificates, relevant identity documents where necessary, and supporting evidence required to assess professional eligibility.',
      { kind: 'h3', text: '4.4 Financial Information' },
      'IBAN and other limited payment-related details where necessary for an identified payment process.',
      { kind: 'h3', text: '4.5 Healthcare Organisation Information' },
      'Organisation name, professional contact information of authorised representatives, business position, staffing requirements, recruitment requests and relevant correspondence.',
      { kind: 'h3', text: '4.6 Technical and Security Information' },
      'IP address, login and authentication information, browser or device details, session data and technical security logs where generated through the use of our services.',
      { kind: 'h3', text: '4.7 Communications' },
      'Emails, messages, enquiries, support requests and other information voluntarily supplied to BridgeHive.',
      'BridgeHive applies the principle of data minimisation and seeks to avoid collecting information that is not necessary for a defined lawful purpose.',
      'Medical information and other special categories of personal data are not routinely requested. Where such information is exceptionally necessary, it will be processed only where the applicable requirements of Articles 6 and 9 GDPR are satisfied.',
    ],
  },
  {
    id: 'article-5',
    title: 'Article 5 \u2014 Purposes of Personal Data Processing',
    blocks: [
      'BridgeHive may process personal data to:',
      {
        kind: 'ol',
        items: [
          'Create, manage and secure user accounts.',
          'Verify professional qualifications, registration and eligibility.',
          'Manage participation in the Flexible Shifts Marketplace.',
          'Connect eligible professionals with relevant staffing opportunities.',
          'Assess and manage nursing recruitment candidates.',
          'Prepare candidate shortlists and share relevant profiles with healthcare organisations where lawful.',
          'Communicate about shifts, recruitment opportunities, applications and partnerships.',
          'Support necessary payment-related arrangements.',
          'Comply with applicable legal, accounting, tax and regulatory obligations.',
          'Prevent fraud, unauthorised access and misuse of the platform.',
          'Maintain system security, reliability and technical functionality.',
          'Respond to privacy requests, disputes and legal claims.',
        ],
      },
      'Personal data will not be used for incompatible purposes without an appropriate assessment and any additional legal requirements being satisfied.',
    ],
  },
  {
    id: 'article-6',
    title: 'Article 6 \u2014 Legal Bases for Processing',
    blocks: [
      'BridgeHive processes personal data under one or more of the legal bases established by Article 6 GDPR.',
      { kind: 'h3', text: '6.1 Performance of a Contract \u2014 Article 6(1)(b)' },
      'Processing may be necessary to provide services requested by an individual, administer their account, manage their participation in staffing or recruitment activities, or take requested steps before entering into a contract.',
      { kind: 'h3', text: '6.2 Compliance with a Legal Obligation \u2014 Article 6(1)(c)' },
      'Processing may be necessary to comply with applicable legal, tax, accounting or regulatory obligations.',
      { kind: 'h3', text: '6.3 Legitimate Interests \u2014 Article 6(1)(f)' },
      'Where appropriate, BridgeHive may rely on legitimate interests for system security, fraud prevention, necessary business administration, professional communications and the establishment, exercise or defence of legal claims, subject to the required balancing assessment.',
      { kind: 'h3', text: '6.4 Consent \u2014 Article 6(1)(a)' },
      'Where consent is required, it must be freely given, specific, informed and unambiguous. Consent may be withdrawn at any time without affecting the lawfulness of processing carried out before withdrawal.',
      { kind: 'h3', text: '6.5 Candidate Profile Sharing' },
      'BridgeHive may offer candidates two methods of authorising participation in recruitment disclosures:',
      {
        kind: 'ul',
        items: [
          'A general choice allowing their profile to be considered for presentation to suitable partner healthcare organisations.',
          'A specific approval for presenting their profile to an identified healthcare organisation.',
        ],
      },
      'The legal basis for each disclosure depends on the actual purpose and processing arrangement. Operational approval is not automatically equivalent to GDPR consent.',
      { kind: 'h3', text: '6.6 Special Categories of Data' },
      'Where information falls within Article 9 GDPR, BridgeHive will process it only where an appropriate Article 9(2) condition applies in addition to a valid Article 6 basis, with suitable safeguards.',
      'Acceptance of general platform terms does not automatically constitute consent for every processing activity.',
    ],
  },
  {
    id: 'article-7',
    title: 'Article 7 \u2014 Nursing Recruitment and Candidate Management',
    blocks: [
      'The Nursing Recruitment service is exclusively intended for nursing professionals and nursing candidates.',
      'BridgeHive may collect and assess CVs, qualifications, employment history, professional registration details, language skills, availability and preferred employment locations.',
      'Candidate assessment, professional eligibility verification and decisions about presenting candidate profiles to partner organisations are carried out by an authorised BridgeHive administrator.',
      'Where appropriate and lawful, BridgeHive may prepare shortlists and disclose relevant candidate information to healthcare organisations.',
      'Healthcare organisations do not automatically receive unrestricted access to all personal documents or candidate records.',
      'Information shared will be limited to what is necessary for the relevant recruitment purpose, subject to the candidate\u2019s applicable choices and legal rights.',
      'The final hiring decision remains with the healthcare organisation, which is responsible for its own recruitment and employment procedures.',
      'BridgeHive does not guarantee employment, an offer of work or professional licensing approval.',
    ],
  },
  {
    id: 'article-8',
    title: 'Article 8 \u2014 Flexible Shifts Marketplace',
    blocks: [
      'The Flexible Shifts Marketplace is intended for nurses, ward assistants and physiotherapists.',
      'BridgeHive may process professional profiles, qualifications, availability, work preferences, relevant experience and information associated with staffing requests.',
      'Authorised healthcare organisations may view information necessary to assess suitable professionals, including their full names, in accordance with the platform\u2019s access permissions.',
      'Professional documents may be requested or disclosed where necessary for a specific lawful eligibility verification or staffing arrangement.',
      'IBAN information is not intended to be displayed in general professional searches or ordinary profile views. It may be disclosed only to an appropriately authorised party where necessary for a specific payment process.',
      'Healthcare organisations are responsible for their own lawful processing of information received for staffing, employment and payment purposes.',
      'The actual platform permissions governing access to professional documents and financial information must correspond to these restrictions.',
    ],
  },
  {
    id: 'article-9',
    title: 'Article 9 \u2014 Data Recipients and Service Providers',
    blocks: [
      'Where necessary and lawful, BridgeHive may disclose personal data to:',
      {
        kind: 'ul',
        items: [
          'Authorised BridgeHive administrators.',
          'Healthcare organisations participating in relevant staffing or recruitment activities.',
          'Hosting, authentication, database, storage and other technical service providers.',
          'Legal, accounting or other professional advisers where necessary.',
          'Competent public authorities where disclosure is required by law.',
        ],
      },
      'Internal candidate management and professional approval are currently handled by the authorised BridgeHive administrator.',
      'External technical providers may process information in accordance with their contractual roles, service arrangements and applicable security measures.',
      'BridgeHive uses infrastructure providers including Vercel and Supabase.',
      'Where a provider acts as a data processor, appropriate arrangements under Article 28 GDPR are required.',
      'BridgeHive does not sell personal data to third parties.',
    ],
  },
  {
    id: 'article-10',
    title: 'Article 10 \u2014 Access Control and Confidentiality',
    blocks: [
      'BridgeHive seeks to ensure that access to personal data is limited to persons who require it for legitimate operational purposes.',
      'Administrative access to candidate records and professional verification functions is restricted to authorised BridgeHive administration.',
      'Healthcare organisations may receive role-based access to relevant information, rather than unrestricted access to all platform data.',
      'Access permissions should distinguish between general professional information, supporting documents, recruitment records and payment details.',
      'Users are responsible for maintaining the confidentiality of their account credentials.',
      'BridgeHive may restrict or suspend access where reasonably necessary to address security risks, misuse or unauthorised activity.',
    ],
  },
  {
    id: 'article-11',
    title: 'Article 11 \u2014 Information Security',
    blocks: [
      'BridgeHive implements and seeks to maintain appropriate technical and organisational measures in accordance with Article 32 GDPR.',
      'Such measures include, where applicable:',
      {
        kind: 'ul',
        items: [
          'HTTPS/TLS protection for data transmitted through the website.',
          'Authentication and account access controls.',
          'Role-based access permissions.',
          'Restricted administrative access.',
          'Database backup arrangements.',
          'Human verification of professional qualifications.',
          'Security measures intended to prevent unauthorised access, loss, alteration or disclosure.',
        ],
      },
      'The Company assesses its security arrangements in light of the nature of the data, the risks involved and the services provided.',
      'No internet-based system can be guaranteed to be completely secure.',
      'Where a security incident occurs, BridgeHive will assess the appropriate technical, organisational and legal response.',
    ],
  },
  {
    id: 'article-12',
    title: 'Article 12 \u2014 Data Retention and Professional Document Review',
    blocks: [
      'BridgeHive retains personal data only for as long as necessary for the purposes for which it was collected, subject to applicable legal obligations, legitimate claims and documented retention requirements.',
      'Retention periods depend on the category of data, the relevant purpose, the legal basis and the individual\u2019s relationship with the Company.',
      { kind: 'h3', text: 'Professional Document Review' },
      'BridgeHive\u2019s intended administrative procedure is to review professional documentation every four years from the professional\u2019s initial registration date.',
      'Earlier verification may be required where a professional licence or certificate expires, where relevant information changes, or where updated evidence is necessary.',
      'The four-year review interval does not result in automatic account deletion and does not justify indefinite retention of all personal data.',
      'Document reviews may be conducted manually by an authorised administrator.',
      'Where professional documents become outdated, expired or unnecessary, BridgeHive may request updated evidence, restrict eligibility pending verification, or delete superseded information where appropriate.',
      'Account deletion and erasure requests are addressed under Article 22.',
    ],
  },
  {
    id: 'article-13',
    title: 'Article 13 \u2014 Hosting, Data Storage and International Transfers',
    blocks: [
      'BridgeHive uses external technical infrastructure providers to operate its digital services.',
      'Vercel provides website and web dashboard hosting and deployment services.',
      'Supabase provides database infrastructure, user authentication and storage of uploaded documents and files.',
      'BridgeHive operates from Cyprus and uses European-region infrastructure for relevant services as configured.',
      'However, the location of hosting or database infrastructure does not necessarily mean that all processing, technical support access, logs or subprocessors are located exclusively within the European Economic Area (\u201cEEA\u201d).',
      'Where personal data is transferred outside the EEA, BridgeHive will assess the requirements of Chapter V GDPR and implement an appropriate transfer mechanism where required, such as an adequacy decision or Standard Contractual Clauses, together with supplementary safeguards where necessary.',
      'Actual provider arrangements, subprocessors and international transfers are subject to verification against the services and contractual terms in use.',
    ],
  },
  {
    id: 'article-14',
    title: 'Article 14 \u2014 Cookies and Browser Storage',
    blocks: [
      'The BridgeHive website may use cookies and similar browser storage technologies necessary for authentication, session management, security, technical functionality and remembering certain interface preferences.',
      'According to the technical review reported for the public website on 12 November 2026, Google Analytics, Google Tag Manager and Meta Pixel were not detected.',
      'The existing website notice is informational.',
      'Selecting \u201cUnderstood\u201d or the equivalent acknowledgement option records dismissal of the notice and does not constitute consent to analytics or advertising tracking.',
      'Strictly necessary cookies and equivalent technologies may be used without consent where permitted by applicable law, subject to transparency requirements.',
      'If non-essential analytics, advertising or tracking technologies are introduced, BridgeHive will assess and implement the applicable consent requirements before activation.',
      'The precise names, purposes and actual lifetimes of authentication cookies and browser storage technologies are subject to completion of the technical inventory.',
      'Any revised notice must be verified on the production website before its deployment is represented as completed.',
      'Users may manage cookies through their browser settings, although disabling necessary technologies may affect the functionality of the website or platform.',
    ],
  },
  {
    id: 'article-15',
    title: 'Article 15 \u2014 Rights of Data Subjects',
    blocks: [
      'Subject to applicable legal conditions, individuals have the following rights under the GDPR:',
      {
        kind: 'ol',
        items: [
          'Right of Access: To request information about personal data processed and obtain a copy where applicable.',
          'Right to Rectification: To request correction of inaccurate information.',
          'Right to Erasure: To request deletion where the requirements of Article 17 GDPR are satisfied.',
          'Right to Restriction: To request restriction of processing in applicable circumstances.',
          'Right to Data Portability: To receive certain data in a structured, commonly used, machine-readable format and transmit it to another controller where applicable.',
          'Right to Object: To object to processing based on legitimate interests, subject to applicable conditions.',
          'Right to Withdraw Consent: To withdraw consent where processing relies on consent.',
          'Rights Relating to Automated Decisions: To benefit from the safeguards provided by Article 22 GDPR where applicable.',
        ],
      },
      'Requests may be submitted to info@bridgehive.app.',
      'BridgeHive may request reasonable identity verification where necessary to prevent unauthorised disclosure.',
      'Requests will be handled without undue delay and generally within one month, subject to any lawful extension.',
    ],
  },
  {
    id: 'article-16',
    title: 'Article 16 \u2014 Automated Decision-Making',
    blocks: [
      'BridgeHive does not currently use solely automated decision-making producing legal or similarly significant effects on individuals within the meaning of Article 22 GDPR.',
      'Professional qualification checks, eligibility assessments and administrative approvals are performed by an authorised human administrator.',
      'Digital search tools or filters may assist in identifying professionals or candidates but do not replace the Company\u2019s human approval process.',
      'If qualifying automated decision-making is introduced in the future, BridgeHive will provide the required information and safeguards before such processing begins.',
    ],
  },
  {
    id: 'article-17',
    title: 'Article 17 \u2014 Protection of Minors',
    blocks: [
      'BridgeHive\u2019s staffing and recruitment services are intended for adults who satisfy the applicable professional and legal eligibility requirements.',
      'The platform is not designed to knowingly collect personal data from children.',
      'If BridgeHive becomes aware that personal data has been collected from a minor without an appropriate lawful basis, it will assess the circumstances and take appropriate action, including deletion where required.',
    ],
  },
  {
    id: 'article-18',
    title: 'Article 18 \u2014 Universities and Nursing Graduates',
    blocks: [
      'BridgeHive may cooperate with universities and educational institutions in Cyprus and Greece to inform nursing students and graduates about professional opportunities.',
      'Interested candidates generally submit their own personal data, CVs and supporting documents directly to BridgeHive.',
      'Collaboration with an educational institution does not, by itself, authorise the automatic transfer of students\u2019 personal information to BridgeHive.',
      'Any alternative data-sharing arrangement must be assessed separately for lawful basis, transparency, necessity and appropriate safeguards.',
      'Participation in BridgeHive recruitment activities is voluntary.',
    ],
  },
  {
    id: 'article-19',
    title: 'Article 19 \u2014 Marketing and Professional Communications',
    blocks: [
      'BridgeHive may communicate with professionals, candidates and healthcare organisations regarding services, staffing opportunities, recruitment activities and business partnerships.',
      'Communications necessary to administer accounts or provide requested services are distinguished from promotional messages.',
      'Where direct marketing requires consent under applicable data protection and electronic communications legislation, BridgeHive will obtain the required consent.',
      'Where another lawful route is available, BridgeHive will comply with the relevant conditions, including applicable objection and opt-out rights.',
      'Individuals may request that promotional communications cease by contacting info@bridgehive.app or using an unsubscribe option where provided.',
    ],
  },
  {
    id: 'article-20',
    title: 'Article 20 \u2014 Personal Data Breaches',
    blocks: [
      'BridgeHive seeks to maintain appropriate arrangements for identifying, assessing, containing and responding to suspected personal data breaches.',
      'Where an incident occurs, the Company will assess its nature, the information affected, the risks to individuals and the measures necessary to reduce potential harm.',
      'Where notification is required under Article 33 GDPR, BridgeHive will notify the competent supervisory authority without undue delay and, where feasible, within 72 hours of becoming aware of a notifiable breach.',
      'Where a breach is likely to result in a high risk to individuals\u2019 rights and freedoms, affected individuals will be informed in accordance with Article 34 GDPR, unless a relevant exception applies.',
      'BridgeHive may cooperate with technical providers, professional advisers and competent authorities in investigating and managing incidents.',
    ],
  },
  {
    id: 'article-21',
    title: 'Article 21 \u2014 Third-Party Websites and Services',
    blocks: [
      'The BridgeHive website or platform may contain links to third-party websites, educational institutions, professional organisations or other external services.',
      'Such third parties may maintain independent privacy policies and data processing practices.',
      'BridgeHive is not responsible for the independent privacy practices of third-party websites outside its control.',
      'Users are encouraged to review the privacy notices of external services before submitting personal information.',
      'Where BridgeHive directly integrates a third-party service into its own processing operations, the applicable GDPR responsibilities will be assessed according to the actual arrangement.',
    ],
  },
  {
    id: 'article-22',
    title: 'Article 22 \u2014 Account Deletion, Backup Retention and Erasure of Personal Data',
    blocks: [
      { kind: 'h3', text: '22.1 Account Deletion' },
      'BridgeHive provides for users to request deletion of their accounts and associated personal data, including through a relevant platform function where available.',
      'Account deletion is initiated by the user. Ending a professional relationship with BridgeHive or a cooperating healthcare organisation does not automatically result in account deletion.',
      'Following a deletion request, BridgeHive will take the necessary steps to erase the account and associated personal data where the requirements of Article 17 GDPR are met.',
      'Depending on the circumstances, this may include account information, professional profiles, CVs, qualifications, certificates and uploaded documents, except where continued retention is legally justified.',
      'Certain records may be retained for a limited period where necessary to comply with legal obligations or for the establishment, exercise or defence of legal claims.',
      { kind: 'h3', text: '22.2 Database Backup Retention' },
      'BridgeHive uses Supabase Pro as part of its database infrastructure.',
      'Under the reported service configuration, daily database backups are available for a rolling period of seven (7) days.',
      'These backups do not include the actual files uploaded to Supabase Storage, which are managed separately.',
      'Any independently created manual backups or database exports require their own documented retention periods and access restrictions.',
      { kind: 'h3', text: '22.3 Backup Access Control' },
      'Based on the Company\u2019s current project access configuration, access to Supabase database backups and restoration functions is restricted to the authorised project Owner.',
      'No additional BridgeHive project members are currently authorised to manage or restore these backups.',
      'These permissions relate to Supabase project-level administration and are separate from the user roles within the BridgeHive application.',
      'This restriction does not exclude processing or access by Supabase as the infrastructure provider under its applicable service and security arrangements.',
      { kind: 'h3', text: '22.4 Deleted Data in Backups' },
      'Deleting personal data from active systems does not automatically remove that information from backups created before the deletion.',
      'Such information may remain temporarily in existing backups until the applicable backup retention period expires.',
      'Restoring an earlier backup may reintroduce information that was previously deleted.',
      'BridgeHive recognises the need for a controlled restoration procedure to identify and address previously deleted information before restored data is returned to active processing.',
      'The technical implementation and testing of this procedure have not yet been completed. Accordingly, BridgeHive does not represent that prevention of reintroduction of deleted data following backup restoration has been fully implemented.',
      { kind: 'h3', text: '22.5 Requests and Legal Exceptions' },
      'Individuals may contact info@bridgehive.app to request deletion or obtain information about the handling of their personal data.',
      'BridgeHive will assess and respond to such requests without undue delay and within the time limits established by the GDPR.',
      'Any exceptions to deletion must be based on applicable law and limited to the data and period genuinely necessary for the relevant purpose.',
    ],
  },
  {
    id: 'article-23',
    title: 'Article 23 \u2014 Changes to This Privacy Policy',
    blocks: [
      'BridgeHive may amend this Privacy Policy to reflect changes in legislation, regulatory guidance, business operations, platform features or data processing practices.',
      'The latest version will be made available through the Company\u2019s website or another appropriate communication channel.',
      'Where a material change affects the processing of personal data, BridgeHive will provide additional information or obtain consent where required.',
      'The date of the latest revision will be displayed at the beginning of the Policy.',
      'Continued use of the platform does not replace any consent or other legal requirement applicable to new processing activities.',
    ],
  },
  {
    id: 'article-24',
    title: 'Article 24 \u2014 Complaints and Supervisory Authority',
    blocks: [
      'Individuals who believe their personal data has been processed unlawfully may contact BridgeHive at info@bridgehive.app.',
      'Individuals also have the right to lodge a complaint with a competent data protection supervisory authority.',
      'For Cyprus, the relevant authority is:',
      {
        kind: 'lines',
        lines: [
          'Office of the Commissioner for Personal Data Protection',
          'Republic of Cyprus',
          'Website: https://www.dataprotection.gov.cy',
        ],
      },
      'Individuals may also have the right to seek an effective judicial remedy under applicable law.',
    ],
  },
  {
    id: 'article-25',
    title: 'Article 25 \u2014 Contact Information',
    blocks: [
      'For questions about this Privacy Policy, personal data processing, GDPR rights, account deletion or privacy-related complaints, please contact:',
      {
        kind: 'lines',
        withTaxId: 'after-registration',
        lines: [
          'BridgeHive Medical Recruitment LIMITED',
          'Company Registration Number: HE 498387',
          '237 Archbishop Makarios III Avenue',
          'DIANA HOUSE, 5th Floor, Office 518',
          '3105 Limassol, Cyprus',
          'Email: info@bridgehive.app',
          'Website: https://bridgehive.app',
        ],
      },
      'BridgeHive aims to process personal data lawfully, fairly, transparently and securely while respecting the rights of healthcare professionals, nursing candidates, healthcare organisations and other individuals who interact with its services.',
    ],
  },
];

export function privacyPolicyIsPublishable(): boolean {
  return PRIVACY_POLICY_TAX_ID !== null && PRIVACY_POLICY_PUBLISH_APPROVED;
}

/** Hosted production must not serve the draft until it is approved and the Tax ID is filled. */
export function privacyPolicyIsBlockedHere(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.VERCEL_ENV === 'production' && !privacyPolicyIsPublishable();
}

export function taxIdLine(): string {
  return PRIVACY_POLICY_TAX_ID
    ? `Tax ID: ${PRIVACY_POLICY_TAX_ID}`
    : `Tax ID: ${TAX_ID_PLACEHOLDER}`;
}
