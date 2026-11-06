import { Noto_Serif_Display } from 'next/font/google';

export const orgDisplayFont = Noto_Serif_Display({
  subsets: ['latin', 'greek'],
  weight: ['600', '700'],
  variable: '--font-org-display',
  display: 'swap',
});
