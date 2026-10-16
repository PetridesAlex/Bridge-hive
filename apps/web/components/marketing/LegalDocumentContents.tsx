'use client';

import type { LegalSection } from '@/content/legal/types';

/** Mobile expandable table of contents for legal documents. */
export function LegalDocumentContentsMobile({
  sections,
}: {
  sections: LegalSection[];
}) {
  return (
    <details className="m-legal-toc-mobile">
      <summary className="m-legal-toc-mobile-summary">Contents</summary>
      <nav aria-label="Document contents" className="m-legal-toc-mobile-nav">
        <ol className="m-legal-toc-list">
          {sections.map((section) => (
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
    </details>
  );
}
