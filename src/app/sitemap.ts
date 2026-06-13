// Static sitemap for the public-facing pages. Submit to Google Search
// Console + Bing Webmaster Tools after deploying.

import type { MetadataRoute } from 'next';
import { BASE_URL } from '@/lib/base-url';

const APP_URL = BASE_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = ['', '/privacy', '/terms', '/login', '/signup'];
  return pages.map((p) => ({
    url: `${APP_URL}${p}`,
    lastModified: now,
    changeFrequency: p === '' ? 'weekly' : 'monthly',
    priority: p === '' ? 1 : 0.5,
  }));
}
