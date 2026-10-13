import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bridge Hive',
    short_name: 'Bridge Hive',
    description:
      'Bridge Hive connects healthcare organizations with verified registered nurses, ward assistants, and physiotherapists.',
    start_url: '/',
    scope: '/',
    display: 'browser',
    background_color: '#F5F7F8',
    theme_color: '#0B2A43',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
