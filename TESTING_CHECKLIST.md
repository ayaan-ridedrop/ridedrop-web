# End-to-End Testing Checklist — Option B Bidding MVP

## Test Flow: Sender → Carrier → Delivery → Review

**Setup:** 2 accounts needed (1 sender, 1 carrier with verified role)

---

### ✅ Phase 1: Job Creation

- [ ] Sender logs in, clicks "Send something" (/send)
- [ ] Form loads WITHOUT budget field (Option B)
- [ ] Fill: From station, To station, Package description, Size, Weight, Declared value, Deadline
- [ ] Submit → Job appears on dashboard
- [ ] Job appears on /jobs/browse for carriers

---

### ✅ Phase 2: Journey Creation & Bidding

- [ ] Carrier logs in, clicks "List a journey" (/journeys/new)
- [ ] Form shows operator picker with manual entry option (no Darwin)
- [ ] Create journey: From/To stations, Departure date/time, Operator, Min price
- [ ] Journey listed in My Journeys
- [ ] Carrier navigates to /jobs/browse, finds sender's job
- [ ] Clicks "View & bid" → Job detail page
- [ ] BidForm loads (no max budget field)
- [ ] Carrier selects their journey
- [ ] Enters bid amount (no ceiling validation!)
- [ ] Submits bid → Confirmation message

---

### ✅ Phase 3: Bid Acceptance & Payment

- [ ] Switch to sender account
- [ ] Dashboard shows job in "Active" tab or /jobs/your-jobs
- [ ] Click job → BidsList shows carrier's bid with price
- [ ] Accept bid → Booking created (status: 'accepted')
- [ ] Booking appears in sender dashboard
- [ ] Switch to carrier: Booking appears in carrier's bookings
- [ ] Click booking detail → "Test Payment" button visible
- [ ] Sender clicks test button → Payment test succeeds
- [ ] Payment confirmed without page refresh (test mode OK)

---

### ✅ Phase 4: PIN Verification (Pickup)

- [ ] Sender goes to booking detail
- [ ] PIN verification form appears
- [ ] Enters 4-digit pickup PIN
- [ ] PIN accepted → Booking status: 'picked_up'
- [ ] Photo form now appears (after PIN, not before)

---

### ✅ Phase 5: Photo Upload

- [ ] Photo input + GPS data capture
- [ ] Take/upload photo (or test with placeholder)
- [ ] Photo and GPS coordinates submitted
- [ ] Photo appears in booking detail

---

### ✅ Phase 6: Delivery & Final PIN

- [ ] Booking status changes to 'in_transit'
- [ ] Final delivery PIN form appears
- [ ] Carrier enters 4-digit delivery PIN
- [ ] Status: 'delivered'
- [ ] Final photo upload form appears
- [ ] Upload proof photo
- [ ] Status: 'completed'

---

### ✅ Phase 7: Reviews & Earnings

- [ ] Carrier goes to /profile/earnings
- [ ] Delivery appears in breakdown
- [ ] Shows: Charged price, Commission (20%), You keep (80%)
- [ ] Both users can rate each other (review form on booking detail)
- [ ] Reviews appear on /profile/reviews with star distribution
- [ ] Earnings dashboard updates immediately

---

### ✅ Phase 8: Dashboard & Expiry

- [ ] Dashboard shows tabs: Active, Completed, Archived
- [ ] Completed bookings move to "Completed" tab
- [ ] Wait 24h or manually test: Old jobs marked 'cancelled'
- [ ] Expired jobs move to "Archived" tab and hidden from browse

---

## Known Issues to Check

1. **One-way visibility** (was issue before) — Both users see booking? ✅
2. **Chat realtime** — Messages appear without refresh? ✅
3. **PIN/photo ordering** — Photo only after PIN? ✅
4. **Name capitalization** — "ayaan" → "Ayaan"? ✅
5. **Max budget removal** — No budget field anywhere? ✅

---

## Test Notes

- **Payment:** Test button is OK for MVP (real Stripe comes after)
- **Darwin API:** Skip for now (manual operator entry works)
- **Disputes:** Test dispute button on completed bookings
- **Mobile:** Test on actual phone (tabs, forms, inputs)

---

## Pass Criteria

✅ All 8 phases complete without 404 errors
✅ No "Payment must be made" false positives
✅ Bids can be any amount (no ceiling)
✅ Booking visible to both parties
✅ Chat works real-time both ways
✅ Dashboard filters work

**Estimated time:** 30-45 mins per full cycle
