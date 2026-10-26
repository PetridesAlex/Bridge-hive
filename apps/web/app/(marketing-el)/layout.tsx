import type { Metadata } from 'next';

import { MarketingDocument } from '@/components/marketing/MarketingDocument';
import { getDictionary } from '@/lib/marketing-i18n/get-dictionary';
import { buildMarketingLayoutMetadata } from '@/lib/marketing-i18n/metadata';

import '../globals.css';
import '../marketing.css';

export const metadata: Metadata = buildMarketingLayoutMetadata('el');

export default function MarketingElLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dictionary = getDictionary('el');
  return (
    <MarketingDocument locale="el" dictionary={dictionary}>
      {children}
    </MarketingDocument>
  );
}
