import Link from 'next/link';

import { Section } from '@/components/marketing/Section';
import { getDictionary } from '@/lib/marketing-i18n/get-dictionary';
import { localizePath } from '@/lib/marketing-i18n';

export default function GreekNotFound() {
  const d = getDictionary('el');
  const notFoundCopy = d.notFound;

  return (
    <Section band="porcelain">
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-[length:var(--m-title)] font-extrabold tracking-tight text-[color:var(--m-navy)]">
          {notFoundCopy.title}
        </h1>
        <p className="m-lede mt-4">{notFoundCopy.body}</p>
        <Link
          href={localizePath('/', 'el')}
          className="m-btn m-btn--primary mt-8 inline-flex"
        >
          {notFoundCopy.homeCta}
        </Link>
      </div>
    </Section>
  );
}
