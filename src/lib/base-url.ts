// Single source of truth for the app's public base URL.
//
// WHY THIS EXISTS: the codebase previously read the base URL from two
// different env vars — NEXT_PUBLIC_APP_URL and NEXT_PUBLIC_SITE_URL — and
// production only had the latter set. Everything reading the former silently
// fell back to http://localhost:3000 in production, which broke Stripe
// redirect URLs, email links, and SEO/OG canonical URLs.
//
// This resolves both names, preferring an explicit APP_URL, then SITE_URL,
// and only falling back to localhost for local development (where neither is
// set). Use BASE_URL everywhere a public, absolute URL is needed.

export const BASE_URL: string =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  'http://localhost:3000';
