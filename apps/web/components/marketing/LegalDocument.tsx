import Image from 'next/image';

import { LegalDocumentContentsMobile } from '@/components/marketing/LegalDocumentContents';
import {
  LEGAL_DRAFT_BANNER,
  LEGAL_SECTION_PLACEHOLDER,
  showLegalDraftBanner,
} from '@/content/legal/publication';
import type { LegalDocumentContent } from '@/content/legal/types';

const MARK_SRC = '/brand/bridge-hive-logo-v2-512.png';

function formatMetaValue(value: string | null): string {
  return value?.trim() ? value : 'Not yet set';
}

export function LegalDocument({ content }: { content: LegalDocumentContent }) {
  const showBanner = showLegalDraftBanner();

  return (
    <article className="m-legal">
      {showBanner ? (
        <aside className="m-legal-banner" role="status">
          {LEGAL_DRAFT_BANNER}
        </aside>
      ) : null}

      <header className="m-legal-header">
        <div className="m-legal-header-brand">
          <Image
            src={MARK_SRC}
            alt=""
            width={56}
            height={56}
            className="m-legal-mark"
            priority
          />
          <div>
            <p className="m-legal-eyebrow">BridgeHive Medical Recruitment Limited</p>
            <h1 className="m-legal-title">{content.documentTitle}</h1>
          </div>
        </div>
        <dl className="m-legal-meta">
          <div>
            <dt>Last updated</dt>
            <dd>{formatMetaValue(content.lastUpdated)}</dd>
          </div>
          <div>
            <dt>Effective date</dt>
            <dd>{formatMetaValue(content.effectiveDate)}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{formatMetaValue(content.version)}</dd>
          </div>
        </dl>
      </header>

      <div className="m-legal-layout">
        <nav className="m-legal-toc-desktop" aria-label="Document contents">
          <p className="m-legal-toc-heading">Contents</p>
          <ol className="m-legal-toc-list">
            {content.sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>
                  <span className="m-legal-toc-num" aria-hidden="true">
                    {section.number}.
                  </span>
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="m-legal-body">
          <LegalDocumentContentsMobile sections={content.sections} />

          {content.sections.map((section) => {
            const paragraphs =
              section.paragraphs.length > 0
                ? section.paragraphs
                : [LEGAL_SECTION_PLACEHOLDER];
            const isPlaceholder = section.paragraphs.length === 0;

            return (
              <section
                key={section.id}
                id={section.id}
                className="m-legal-section"
                aria-labelledby={`${section.id}-heading`}
              >
                <h2 id={`${section.id}-heading`} className="m-legal-section-title">
                  <span className="m-legal-section-num" aria-hidden="true">
                    {section.number}.
                  </span>
                  {section.heading}
                </h2>
                {paragraphs.map((paragraph, index) => (
                  <p
                    key={`${section.id}-${index}`}
                    className={
                      isPlaceholder
                        ? 'm-legal-section-placeholder'
                        : 'm-legal-section-copy'
                    }
                  >
                    {paragraph}
                  </p>
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </article>
  );
}
