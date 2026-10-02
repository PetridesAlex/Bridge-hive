import type { Metadata } from 'next';

export const metadata: Metadata = {
  referrer: 'no-referrer',
  title: 'Organization invitation',
};

export default function AcceptInvitationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
