import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';

import Script from 'next/script';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://bridgehive.app'),
  title: {
    default: 'Bridge Hive',
    template: '%s | Bridge Hive',
  },
  description:
    'Bridge Hive connects healthcare organizations with verified registered nurses and ward assistants.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-bh-canvas text-bh-text antialiased`}
      >
        <Script id="bh-m-intro-session" strategy="beforeInteractive">
          {`(function(){try{var p=location.pathname;if(/^\\/(org|admin|sign-in|sign-up|auth|dashboard|activate-organization-account|organization-invitations)\\b/.test(p))return;if(sessionStorage.getItem('bh:m-intro')==='1'){document.documentElement.setAttribute('data-m-intro','done');}}catch(e){}})();`}
        </Script>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
