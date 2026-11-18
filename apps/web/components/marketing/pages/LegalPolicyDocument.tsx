import type { ReactNode } from 'react';

import { Reveal } from '@/components/marketing/Reveal';
import { Section } from '@/components/marketing/Section';
import type { PolicyArticle, PolicyBlock } from '@/lib/legal-policy/types';
import type { MarketingLocale } from '@/lib/marketing-i18n/locales';

const CONTENTS_LABEL = { en: 'Contents', el: 'Περιεχόμενα' } as const;

const LINK_PATTERN =
  /(https?:\/\/[\w./-]+[\w/-]|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

/** Turns web addresses and emails into links. The visible text is unchanged. */
function Linkified({ text }: { text: string }) {
  const parts = text.split(LINK_PATTERN);
  return (
    <>
      {parts.map((part, index) => {
        if (index % 2 === 0) return part;
        const href = part.includes('@') ? `mailto:${part}` : part;
        const external = !part.includes('@');
        return (
          <a
            key={`${part}-${index}`}
            href={href}
            className="m-policy-link"
            {...(external
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
          >
            {part}
          </a>
        );
      })}
    </>
  );
}

function splitLabel(line: string): { label: string; value: string } | null {
  const match = /^([A-Z][A-Za-z ]{1,40}):\s+(.+)$/.exec(line);
  return match ? { label: match[1], value: match[2] } : null;
}

function FactRows({
  lines,
  taxIdSlot,
}: {
  lines: readonly string[];
  /** When set, insert this node after the Company Registration Number row. */
  taxIdSlot?: ReactNode;
}) {
  return (
    <dl className="m-policy-facts">
      {lines.map((line) => {
        const parts = splitLabel(line);
        const taxRow =
          taxIdSlot && line.startsWith('Company Registration Number')
            ? taxIdSlot
            : null;
        const row = parts ? (
          <div className="m-policy-fact" key={line}>
            <dt>{`${parts.label}:`}</dt>
            <dd>
              <Linkified text={parts.value} />
            </dd>
          </div>
        ) : (
          <div className="m-policy-fact m-policy-fact--plain" key={line}>
            <dd>
              <Linkified text={line} />
            </dd>
          </div>
        );
        return taxRow ? [row, taxRow] : row;
      })}
    </dl>
  );
}

function Block({
  block,
  taxIdSlot,
}: {
  block: PolicyBlock;
  taxIdSlot?: ReactNode;
}) {
  if (typeof block === 'string') {
    return (
      <p>
        <Linkified text={block} />
      </p>
    );
  }
  switch (block.kind) {
    case 'h3':
      return <h3 className="m-policy-h3">{block.text}</h3>;
    case 'ul':
      return (
        <ul className="m-policy-list">
          {block.items.map((item) => (
            <li key={item}>
              <Linkified text={item} />
            </li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="m-policy-list m-policy-list--ordered">
          {block.items.map((item) => (
            <li key={item}>
              <Linkified text={item} />
            </li>
          ))}
        </ol>
      );
    case 'lines':
      return (
        <FactRows
          lines={block.lines}
          taxIdSlot={
            block.withTaxId === 'after-registration' ? taxIdSlot : undefined
          }
        />
      );
    default: {
      const _never: never = block;
      return _never;
    }
  }
}

function splitTitle(title: string): { number: string; name: string } {
  const [number, ...rest] = title.split(' \u2014 ');
  return { number, name: rest.join(' \u2014 ') };
}

function ContentsList({ articles }: { articles: PolicyArticle[] }) {
  return (
    <ol className="m-policy-toc-list">
      {articles.map((article) => {
        const { number, name } = splitTitle(article.title);
        const badge = number.replace(/^Article\s+/, '');
        return (
          <li key={article.id}>
            <a
              href={`#${article.id}`}
              aria-label={`${number} \u2014 ${name}`}
            >
              <span className="m-policy-toc-no" aria-hidden="true">
                {badge}
              </span>
              <span className="m-policy-toc-name" aria-hidden="true">
                {name}
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

export type LegalPolicyDocumentProps = {
  locale: MarketingLocale;
  company: string;
  title: string;
  subtitle?: string;
  chips?: readonly string[];
  draftBannerEn?: string;
  draftBannerEl?: string;
  greekNote: string;
  /** Label for the Tax ID / TIN / ΑΦΤ row (without trailing colon). */
  taxIdLabel?: string;
  identity?: {
    /** Lines shown above an optional Tax ID row. */
    beforeTaxId?: readonly string[];
    /** Standalone Tax ID value node. When set, a Tax ID row is rendered. */
    taxIdValue?: ReactNode;
    /** Lines shown below the Tax ID row (or as the only identity block). */
    afterTaxId?: readonly string[];
    /** Simple identity lines when there is no Tax ID (cookie policy). */
    lines?: readonly string[];
  };
  articles: PolicyArticle[];
  end: string;
  endVersion: string;
};

export function LegalPolicyDocument({
  locale,
  company,
  title,
  subtitle,
  chips,
  draftBannerEn,
  draftBannerEl,
  greekNote,
  taxIdLabel = 'Tax ID',
  identity,
  articles,
  end,
  endVersion,
}: LegalPolicyDocumentProps) {
  const isGreek = locale === 'el';
  const contentsLabel = CONTENTS_LABEL[locale];
  const taxDt = `${taxIdLabel}:`;

  const taxIdSlot =
    identity?.taxIdValue !== undefined ? (
      <div className="m-policy-fact m-policy-fact--tax" key="tax-id">
        <dt>{taxDt}</dt>
        <dd>{identity.taxIdValue}</dd>
      </div>
    ) : undefined;

  const hasIdentityCard =
    Boolean(identity?.lines?.length) ||
    Boolean(identity?.beforeTaxId?.length) ||
    Boolean(identity?.afterTaxId?.length) ||
    identity?.taxIdValue !== undefined;

  return (
    <>
      <Section band="teal" className="m-policy-hero !pb-0">
        <Reveal>
          <p className="m-eyebrow">{company}</p>
          <h1 className="m-policy-hero-title">{title}</h1>
          {subtitle ? <p className="m-policy-hero-sub">{subtitle}</p> : null}
          {chips && chips.length > 0 ? (
            <ul className="m-policy-chips" aria-label="Document details">
              {chips.map((chip) => (
                <li key={chip}>{chip}</li>
              ))}
            </ul>
          ) : null}
        </Reveal>
      </Section>

      <Section band="porcelain" className="m-policy-band">
        <div className="m-policy">
          {draftBannerEn || draftBannerEl || isGreek ? (
            <div className="m-policy-notices">
              {(isGreek ? draftBannerEl : draftBannerEn) ? (
                <p className="m-policy-banner" role="note">
                  {isGreek ? draftBannerEl : draftBannerEn}
                </p>
              ) : null}
              {isGreek ? (
                <p className="m-policy-note" role="note">
                  {greekNote}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="m-policy-layout">
            <aside className="m-policy-aside" aria-label={contentsLabel}>
              <p className="m-policy-aside-title">{contentsLabel}</p>
              <ContentsList articles={articles} />
            </aside>

            <div lang="en" className="m-policy-body">
              <details className="m-policy-toc-mobile">
                <summary>{contentsLabel}</summary>
                <ContentsList articles={articles} />
              </details>

              {hasIdentityCard ? (
                <section
                  className="m-policy-card m-policy-card--identity"
                  aria-label="Company details"
                >
                  {identity?.lines ? (
                    <FactRows lines={identity.lines} />
                  ) : (
                    <>
                      {identity?.beforeTaxId ? (
                        <FactRows
                          lines={identity.beforeTaxId}
                          taxIdSlot={undefined}
                        />
                      ) : null}
                      {identity?.taxIdValue !== undefined ? (
                        <dl className="m-policy-facts m-policy-facts--tax">
                          <div className="m-policy-fact m-policy-fact--tax">
                            <dt>{taxDt}</dt>
                            <dd>{identity.taxIdValue}</dd>
                          </div>
                        </dl>
                      ) : null}
                      {identity?.afterTaxId ? (
                        <FactRows lines={identity.afterTaxId} />
                      ) : null}
                    </>
                  )}
                </section>
              ) : null}

              {articles.map((article) => {
                const { number, name } = splitTitle(article.title);
                return (
                  <article
                    key={article.id}
                    id={article.id}
                    className="m-policy-card m-policy-article"
                    aria-labelledby={`${article.id}-title`}
                  >
                    <h2 className="m-policy-h2" id={`${article.id}-title`}>
                      <span className="m-policy-art-no">{number}</span>
                      <span className="sr-only">{' \u2014 '}</span>
                      <span className="m-policy-art-name">{name}</span>
                    </h2>
                    {article.blocks.map((block, index) => (
                      <Block
                        key={`${article.id}-${index}`}
                        block={block}
                        taxIdSlot={taxIdSlot}
                      />
                    ))}
                  </article>
                );
              })}

              <footer className="m-policy-end">
                <p>{end}</p>
                <p>{endVersion}</p>
              </footer>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
