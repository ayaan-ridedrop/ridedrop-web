import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';

export default async function ReviewsPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .maybeSingle();

  // Fetch all reviews for this user
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, reviewer_id, rating, body, created_at')
    .eq('subject_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch reviewer profiles
  const reviewerIds = [...new Set((reviews ?? []).map((r: any) => r.reviewer_id))];
  let reviewerMap: Record<string, any> = {};
  if (reviewerIds.length > 0) {
    const { data: reviewers } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .in('id', reviewerIds);
    reviewerMap = Object.fromEntries((reviewers ?? []).map((p: any) => [p.id, p]));
  }

  // Calculate aggregate rating
  const totalReviews = reviews?.length ?? 0;
  const averageRating = totalReviews > 0
    ? (reviews!.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : 0;

  // Count by star
  const starsCount = {
    5: reviews?.filter((r: any) => r.rating === 5).length ?? 0,
    4: reviews?.filter((r: any) => r.rating === 4).length ?? 0,
    3: reviews?.filter((r: any) => r.rating === 3).length ?? 0,
    2: reviews?.filter((r: any) => r.rating === 2).length ?? 0,
    1: reviews?.filter((r: any) => r.rating === 1).length ?? 0,
  };

  return (
    <AppShell user={{ email: user.email!, firstName: profile?.first_name }}>
      <Link href="/profile" className="text-sm text-accent underline mb-6 inline-block">
        ← Back to profile
      </Link>

      <h1 className="text-4xl font-display font-bold mb-2">Reviews</h1>
      <p className="text-ink-soft mb-10">
        Feedback from people you've delivered for.
      </p>

      {totalReviews === 0 ? (
        <div className="bg-blue-50 border border-blue-300 rounded-xl p-6 text-center">
          <p className="text-ink-muted mb-4">No reviews yet. Complete a delivery to get one!</p>
          <Link href="/jobs/browse" className="text-accent underline font-medium">
            Browse jobs →
          </Link>
        </div>
      ) : (
        <>
          {/* AGGREGATE RATING */}
          <div className="bg-white border border-rail rounded-2xl p-8 mb-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-xs text-ink-muted uppercase tracking-wider mb-2">
                  Overall rating
                </div>
                <div className="flex items-baseline gap-3">
                  <div className="font-display font-extrabold text-5xl">{averageRating}</div>
                  <div className="text-lg text-ink-soft">
                    out of 5 · {totalReviews} review{totalReviews === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
              {/* STAR DISTRIBUTION */}
              <div className="space-y-2 text-sm">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = starsCount[stars as keyof typeof starsCount];
                  const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2">
                      <div className="w-12 text-right text-ink-soft">
                        {stars}★
                      </div>
                      <div className="w-32 h-2 bg-rail rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-8 text-right text-ink-muted text-xs">
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* INDIVIDUAL REVIEWS */}
          <section>
            <h2 className="text-2xl font-display font-bold mb-4">All reviews</h2>
            <div className="space-y-4">
              {reviews?.map((review: any) => {
                const reviewer = reviewerMap[review.reviewer_id];
                const stars = Array.from({ length: 5 }, (_, i) => i < review.rating ? '★' : '☆').join('');
                return (
                  <div key={review.id} className="bg-white border border-rail rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {reviewer?.avatar_url && (
                          <img
                            src={reviewer.avatar_url}
                            alt={reviewer?.first_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <div className="font-medium">
                            {reviewer?.first_name || 'Anonymous'}
                          </div>
                          <div className="text-xs text-ink-soft">
                            {new Date(review.created_at).toLocaleDateString('en-GB')}
                          </div>
                        </div>
                      </div>
                      <div className="text-lg text-accent font-bold">
                        {stars}
                      </div>
                    </div>
                    {review.body && (
                      <p className="text-sm text-ink-soft leading-relaxed">
                        {review.body}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
