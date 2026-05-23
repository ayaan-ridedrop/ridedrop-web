# RideDrop MVP Testing Checklist

**App URL:** https://ridedrop.co.uk  
**Test Date:** [Today]  
**Tester Name:** [Your name]

---

## 1. Signup & Authentication

- [ ] Sign up as sender (use email format: tester+sender@example.com)
  - Confirm email verification link works
  - Redirects to dashboard after signup
- [ ] Sign up as carrier (use different email: tester+carrier@example.com)
  - Complete carrier profile setup
  - Can toggle to "Become a carrier" → carrier mode on
- [ ] Test password reset flow
  - Request reset link via email
  - Confirm link works and lets you set new password

---

## 2. Sender: Post a Job

**Login as sender**

- [ ] Click "Send something" on dashboard
- [ ] Fill in form:
  - **From:** London King's Cross
  - **To:** Doncaster
  - **Travel date:** Tomorrow (or any future date)
  - **Description:** "Test package - fragile glass"
  - **Size:** Medium
  - **Weight:** 2.5kg
  - **Declared value:** £30
  - **Max budget:** £50
  - **Deadline:** Tomorrow at 2pm
  - **Declaration:** Check the checkbox
- [ ] Click "Post job"
- [ ] Confirm job appears on dashboard under "Your jobs"
- [ ] Confirm status shows as "open"

---

## 3. Carrier: List a Journey

**Login as carrier**

- [ ] Click "List a journey" on dashboard
- [ ] Fill in form step-by-step:
  - **From:** London King's Cross
  - **To:** Doncaster
  - **Travel date:** Same as job (tomorrow)
  - **Train operator:** Pick any operator from dropdown
  - **Departure time:** Pick any time from list
  - **Capacity:** 2 slots
  - **Min price:** Check that "Suggested: £25" appears (pricing feature)
  - **Train number:** Optional, skip it
  - **Max weight:** 10kg
  - **Food items:** Check or uncheck
  - **Ticket photo:** Upload any image (simulates ticket)
- [ ] Click "List journey"
- [ ] Confirm journey appears on dashboard under "Your journeys"

---

## 4. Sender: Browse Journeys & Book

**Login as sender**

- [ ] Click "Find a carrier"
- [ ] See the carrier's journey listed (London King's Cross → Doncaster)
- [ ] Click on journey card
- [ ] Journey detail page shows:
  - [ ] Journey info (time, operator, price)
  - [ ] Carrier name and rating
  - [ ] "Book this journey" form on side
  - [ ] Your posted job in dropdown
- [ ] Select your job from dropdown
- [ ] Enter agreed price: £35
- [ ] Click "Book now"
- [ ] Redirected to booking page

---

## 5. Carrier: Browse Jobs & Accept

**Login as carrier**

- [ ] Click "Browse open jobs"
- [ ] See sender's job listed (King's Cross → Doncaster, £50 budget)
- [ ] Click "Accept job" button
- [ ] Modal appears showing:
  - [ ] Your journeys dropdown (showing the journey you listed)
  - [ ] Agreed price input
  - [ ] "You keep 80% of this price" note
- [ ] Select your journey from dropdown
- [ ] Enter agreed price: £35
- [ ] Click "Confirm"
- [ ] Redirected to booking page

---

## 6. Chat System

**Both users in booking page**

- [ ] Message input field visible at bottom
- [ ] Sender types: "Hi, when will you pick up?"
- [ ] Message appears in chat immediately
- [ ] Switch to carrier account (new tab/window)
- [ ] Carrier sees sender's message
- [ ] Carrier types reply
- [ ] Messages show timestamps and sender name

---

## 7. Photo Uploads (Pickup & Delivery)

**Carrier on booking page**

- [ ] See "Pickup" photo section
- [ ] Click "Choose photo"
- [ ] Upload any image
- [ ] Confirm upload message: "File selected: [filename]"
- [ ] After pickup photo uploaded:
  - [ ] See "Delivery" section appear
  - [ ] Click "Choose photo"
  - [ ] Upload different image
  - [ ] Confirm success message

---

## 8. Delivery Confirmation

**Sender on booking page**

- [ ] See "Confirm delivery" section after carrier uploads delivery photo
- [ ] Click "Confirm delivery"
- [ ] Booking status changes to "delivered"
- [ ] Both users see delivery is complete

---

## 9. Dashboard: Active Deliveries

**Both users on dashboard**

- [ ] See booking in "Active deliveries" section
- [ ] Click booking → goes to booking page
- [ ] Booking status displays correctly

---

## 10. Job/Journey Cancellation

**Sender on dashboard**

- [ ] Post a new job (don't book it)
- [ ] Click "Cancel job" button
- [ ] Confirmation popup appears: "Are you sure? This cannot be undone."
- [ ] Click "Cancel" → nothing happens
- [ ] Click "Cancel job" again
- [ ] Click "OK" on popup → job disappears

**Carrier on dashboard**

- [ ] List a new journey (don't accept any jobs)
- [ ] Click "Cancel journey" button
- [ ] Confirmation popup appears
- [ ] Click "OK" → journey disappears

---

## 11. No Results States

**Sender**

- [ ] Go to "Browse journeys"
- [ ] Filter for route with no journeys: e.g., London → Plymouth
- [ ] See message: "No journeys match your route right now"
- [ ] See link: "Post a job instead"

**Carrier**

- [ ] Go to "Browse jobs"
- [ ] See message if no jobs: "No open jobs match your search"
- [ ] See link: "Browse journeys instead"

---

## 12. Job Expiration

- [ ] Post a job with deadline in the **past** (e.g., today instead of tomorrow)
- [ ] Confirm job does **not** appear in browse
- [ ] Confirm job shows as "cancelled" on dashboard

---

## 13. Error Handling

- [ ] Try to post job without filling required fields
  - [ ] See error messages for each missing field
- [ ] Try to book with price exceeding job budget
  - [ ] See error: "Price must be ≤ job's max budget"
- [ ] Try to submit forms while loading
  - [ ] Buttons disabled, show "Loading…" state

---

## 14. Mobile Experience

Test on phone/mobile viewport (375px width)

- [ ] All pages readable
- [ ] Forms don't overflow
- [ ] Buttons clickable (not too small)
- [ ] Chat interface works
- [ ] Photo upload works

---

## Bug Report Template

If you find an issue:

```
**Title:** [Short description]
**Route:** [Which page/flow]
**Steps to reproduce:**
1. ...
2. ...
3. ...
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Browser:** [Chrome/Safari/etc]
**Screenshots:** [Attach if possible]
```

---

## Critical Path (Quick 10-min test)

If short on time, test **only this**:

1. Sign up as sender
2. Post job (London → Doncaster, tomorrow, £50)
3. Sign up as carrier
4. List journey (same route, tomorrow)
5. Sender: Browse journeys → Book with job
6. Carrier: Browse jobs → Accept with journey
7. Chat back and forth
8. Carrier uploads 2 photos
9. Sender confirms delivery
10. Both see updated dashboard

---

**Questions?** Message Ayaan directly.  
**Done testing?** Reply with bugs found or "All clear ✓"
