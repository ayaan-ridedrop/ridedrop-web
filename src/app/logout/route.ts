// POST /logout — sign the user out and redirect home.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  const url = new URL('/', req.url);
  return NextResponse.redirect(url, { status: 303 });
}
