// Tells search engines what to crawl. Auth and app routes are excluded.

import type { MetadataRoute } from 'next';
import { BASE_URL } from '@/lib/base-url';

const APP_URL = BASE_URL;

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
