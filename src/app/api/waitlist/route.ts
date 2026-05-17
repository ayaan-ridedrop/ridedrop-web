// Public endpoint that captures waitlist signups from the landing page.
// Uses the service-role Supabase client (server-side only) so RLS
// doesn't reject the insert. Validates input with zod before writing.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';

const schema = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  role_interest: z.enum(['sender', 'carrier', 'both']).optional(),
  source: z.string().max(60).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('waitlist')
      .upsert(
        {
          email: parsed.data.email.toLowerCase().trim(),
          name: parsed.data.name ?? null,
          city: parsed.data.city ?? null,
          role_interest: parsed.data.role_interest ?? null,
          source: parsed.data.source ?? 'landing',
        },
        { onConflict: 'email', ignoreDuplicates: false },
      );

    if (error) {
      console.error('[waitlist] insert failed:', error);
      return NextResponse.json({ error: 'Could not save signup' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[waitlist] unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
