// Tells search engines what to crawl. Auth and app routes are excluded.

import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ridedrop.co.uk';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/privacy', '/terms', '/login', '/signup'],
      disallow: [
        '/api/',
        '/dashboard',
        '/send',
        '/journeys',
        '/jobs',
        '/bookings',
        '/profile',
        '/notifications',
        '/admin',
        '/logout',
      ],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
