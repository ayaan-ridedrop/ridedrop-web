// Health check endpoint for uptime monitoring (UptimeRobot, BetterStack, the
// GitHub Actions cron, etc.). Returns 200 when the app is up and can reach the
// database, 503 otherwise. Deliberately exposes NO secrets or internal detail.
//
// Usage: GET https://ridedrop.co.uk/api/health

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, 'ok' | 'fail'> = {};

  // Lightweight DB reachability check — a HEAD count on a tiny public table.
  try {
    const supabase = createClient() as any;
    const { error } = await supabase
      .from('waitlist')
      .select('id', { count: 'exact', head: true });
    checks.database = error ? 'fail' : 'ok';
  } catch {
    checks.database = 'fail';
  }

  const healthy = Object.values(checks).every((v) => v === 'ok');

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      time: new Date().toISOString(),
      checks,
    },
    { status: healthy ? 200 : 503 },
  );
}
