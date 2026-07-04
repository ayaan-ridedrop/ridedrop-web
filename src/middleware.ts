import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ── Rate limiting (Upstash Redis) ──────────────────────────────────
// Protects the public/auth-adjacent endpoints from spam, enumeration and
// brute force. Fails OPEN by design: if the Upstash env vars aren't set
// (e.g. local dev, or before the keys are configured in Netlify), requests
// pass through untouched — the app never breaks because of the limiter.
//
// Env vars (set in Netlify → Site settings → Environment variables):
//   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
const upstashConfigured =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const limiters = upstashConfigured
  ? {
      // public form — spammable, keep tight
      waitlist: new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(5, '60 s'),
        prefix: 'rl:waitlist',
      }),
      // unauthenticated compute
      track: new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(30, '60 s'),
        prefix: 'rl:track',
      }),
      // payment intent creation — authenticated, but don't allow hammering
      payments: new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(10, '60 s'),
        prefix: 'rl:payments',
      }),
      // cron endpoints — legit callers hit these ~hourly; this throttles
      // secret-guessing attempts
      cron: new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(10, '60 s'),
        prefix: 'rl:cron',
      }),
    }
  : null;

function limiterFor(pathname: string): Ratelimit | null {
  if (!limiters) return null;
  if (pathname.startsWith('/api/waitlist')) return limiters.waitlist;
  if (pathname.startsWith('/api/track')) return limiters.track;
  if (pathname.startsWith('/api/payments')) return limiters.payments;
  if (pathname.startsWith('/api/cron')) return limiters.cron;
  return null;
}

export async function middleware(request: NextRequest) {
  const limiter = limiterFor(request.nextUrl.pathname);
  if (limiter) {
    const ip =
      request.ip ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown';
    const { success } = await limiter.limit(ip);
    if (!success) {
      return new NextResponse('Too many requests', {
        status: 429,
        headers: { 'Retry-After': '60' },
      });
    }
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on every path except static assets and Next.js internals.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
