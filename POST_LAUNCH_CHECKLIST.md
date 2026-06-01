# RideDrop Post-Launch Checklist

## Priority 1 (Next 2 weeks)

### Features
- [ ] **Job/Booking Cancellation** — Allow senders to cancel open jobs, carriers to cancel bookings before payment
  - Schema support exists, needs UI forms and state logic
  - Add cancel buttons to job detail + booking detail pages
- [ ] **Dispute Resolution UI** — Build out dispute form + admin panel
  - Schema exists (`disputes` table), UI is stubbed
  - Add dispute button to booking detail page
  - Create `/admin/disputes` page to review + resolve
- [ ] **Real Stripe Integration** — Replace test payment button with live Stripe
  - Create actual payment intent on backend
  - Handle Stripe webhooks for payment confirmation
  - Test with real Stripe test cards
- [ ] **Journey Creation UX** — Improve carrier onboarding flow
  - Add real train data integration (Darwin API stub exists)
  - Better form validation (date, capacity, pricing)
  - Show matching jobs after journey creation

### Bugs & Polish
- [ ] **Better error messages** — Add specific error feedback throughout app
  - Form validation errors (budget, weight limits, etc.)
  - Network/API errors
  - RLS permission errors (show helpful message)
- [ ] **Loading states** — Add spinners/skeletons
  - Job browse page
  - Bidding form submission
  - Payment processing
  - Photo upload
- [ ] **Mobile responsiveness audit** — Test on actual phones
  - Dashboard layout on small screens
  - Form inputs (especially PIN, amounts)
  - Image galleries (photos)
- [ ] **Performance** — Optimize queries, cache strategically
  - Activity page might be slow with 1000+ bookings
  - Consider pagination on job browse

---

## Priority 2 (Weeks 3-4)

### User Experience
- [ ] **Reviews Visibility** — Show user's rating + all reviews they've received
  - Add `/profile/reviews` or section on profile page
  - Display aggregate rating (avg + count)
  - Link to individual booking reviews
- [ ] **Earnings Dashboard** (carriers)
  - Total earnings, commission breakdown
  - Per-delivery breakdown
  - Payout history (once Stripe Connect is live)
- [ ] **Activity Page Filtering** — Better sorting/filtering
  - Filter by status (active, completed, disputed)
  - Filter by route
  - Search by sender/carrier name
- [ ] **Email Notifications** — Notify users of important events
  - New bid received
  - Bid accepted/rejected
  - Payment confirmed
  - Delivery confirmed
  - Review received
- [ ] **SMS Notifications** (nice-to-have)
  - PIN delivery via SMS
  - Key alerts

### Data & Admin
- [ ] **Auto-delete/archive old jobs** — Enforce 48h expiry rule
  - Currently jobs/journeys are just hidden after 24/48h
  - Implement actual archive/delete logic
  - Add cron job or scheduled function
- [ ] **Admin Dashboard** — Moderation & analytics
  - Review disputes
  - View platform metrics (bookings, revenue, users)
  - Manage user accounts (suspend, verify, etc.)
- [ ] **Analytics & Logging** — Track platform health
  - Booking success rate
  - Cancellation rate
  - Revenue per delivery
  - Error rates

---

## Priority 3 (Post-MVP, future releases)

### Features
- [ ] **Ratings/Trust Tiers** — Full implementation of user trust system
  - Currently calculates trust tier (basic/verified/trusted)
  - Implement carrier scoring (on-time, damage, etc.)
  - Badge system for trusted carriers
- [ ] **Advanced Bidding** (Option 3 long-term)
  - Counter-offers from senders on carrier bids
  - Auto-matching algorithm
  - Price negotiation UI
- [ ] **Insurance** — Damage/loss protection
  - Integration with insurance provider
  - Claims UI
  - Premium handling
- [ ] **Subscriptions** — Premium carrier accounts
  - Priority in job matching
  - Reduced commission
  - Branded profile
- [ ] **International** — Support non-UK routes
  - Carrier selection beyond trains
  - Multiple currencies
  - Localization
- [ ] **Real-time Tracking** — GPS tracking during delivery
  - Carrier shares location during transit
  - Estimated delivery time
  - Proof of location at pickup/delivery

### Infrastructure
- [ ] **Stripe Connect** (full implementation)
  - Carrier bank account onboarding
  - Automated payouts (daily, weekly, or on-demand)
  - 1099 tax forms
- [ ] **Scaling** — Prepare for growth
  - Database optimization (indexing, partitioning)
  - CDN for images (photos)
  - Rate limiting & DDoS protection
  - Load testing
- [ ] **Monitoring** — Production observability
  - Error tracking (Sentry)
  - Performance monitoring
  - Uptime monitoring
  - Alert thresholds

---

## Testing Checklist (Before each deployment)

- [ ] End-to-end bidding flow (post job → bid → accept → payment → delivery)
- [ ] Mobile responsiveness (iOS Safari, Android Chrome)
- [ ] Error cases (network failure, RLS errors, validation)
- [ ] Chat realtime (both directions)
- [ ] PIN verification + photo upload
- [ ] Profile updates (name, photo, role)
- [ ] Performance (page load times < 2s)

---

## Known Limitations (MVP)

- Stripe integration is test-only (no real payments yet)
- No email/SMS notifications
- No dispute resolution admin UI
- Jobs/journeys don't actually auto-delete (just hidden)
- No earnings dashboard for carriers
- Reviews only visible on booking detail page
- No admin moderation tools
- Darwin API is stubbed (no real train data)

---

## Deployment & Launch

- [ ] Test in production with real users
- [ ] Gather feedback on UX
- [ ] Monitor error rates & performance
- [ ] Set up support channel (email/chat)
- [ ] Create onboarding guide for carriers
- [ ] Create FAQ for common issues

---

**Owner:** Your Dev  
**Last Updated:** June 1, 2026  
**Next Review:** After week 1 of MVP launch
