import { createClient } from '@/lib/supabase/server';

/**
 * Get a user's trust tier from the user_trust view
 */
export async function getTrustTier(userId: string) {
  const supabase = createClient() as any;

  const { data } = await supabase
    .from('user_trust')
    .select('trust_tier, total_deliveries, average_rating')
    .eq('id', userId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    tier: data.trust_tier as 'basic' | 'verified' | 'trusted',
    deliveries: data.total_deliveries || 0,
    rating: data.average_rating || 0,
  };
}

/**
 * Get multiple users' trust tiers (batch query)
 */
export async function getTrustTiers(userIds: string[]) {
  if (userIds.length === 0) return {};

  const supabase = createClient() as any;

  const { data } = await supabase
    .from('user_trust')
    .select('id, trust_tier, total_deliveries, average_rating')
    .in('id', userIds);

  const result: Record<string, { tier: 'basic' | 'verified' | 'trusted'; deliveries: number; rating: number }> = {};

  (data || []).forEach((row: any) => {
    result[row.id] = {
      tier: row.trust_tier,
      deliveries: row.total_deliveries || 0,
      rating: row.average_rating || 0,
    };
  });

  return result;
}
