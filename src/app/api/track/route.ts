// GET /api/track?from=..&to=..&departureAt=..&arrivalAt=..&operator=..
// Returns the live progress of the train carrying a booking's parcel.
//
// Today this returns a time-based mock (see getLiveJourneyProgress). When a
// real train API token (TRAIN_API_TOKEN) is added, the real call goes inside
// getLiveJourneyProgress server-side — the token never reaches the browser.
//
// Only public train info (stations + scheduled times) is passed in/out — no
// booking IDs, no personal data — so this endpoint exposes nothing sensitive.

import { NextRequest, NextResponse } from 'next/server';
import { getLiveJourneyProgress } from '@/lib/darwin-api';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const from = sp.get('from');
  const to = sp.get('to');
  const departureAt = sp.get('departureAt');

  if (!from || !to || !departureAt) {
    return NextResponse.json({ error: 'from, to and departureAt are required' }, { status: 400 });
  }

  try {
    const progress = getLiveJourneyProgress({
      from,
      to,
      departureAt,
      arrivalAt: sp.get('arrivalAt'),
      operator: sp.get('operator'),
    });
    return NextResponse.json(progress, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'could not compute progress' }, { status: 500 });
  }
}
