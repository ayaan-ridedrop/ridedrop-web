// src/lib/supabase.ts
// Shared browser Supabase client (singleton) for client components that
// do `import { supabase } from '@/lib/supabase'`.
// Client components ONLY — server code should use '@/lib/supabase/server'.

import { createBrowserClient } from '@supabase/ssr';

// NOTE: intentionally untyped — src/lib/types.ts predates the v3 payments
// migration and doesn't know the new tables/RPCs yet. Once types.ts is
// regenerated from the live schema, add `<Database>` back here.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
