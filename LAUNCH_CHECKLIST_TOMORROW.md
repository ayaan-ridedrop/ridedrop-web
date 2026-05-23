# RideDrop MVP Launch — Tomorrow

## 1. DEPLOY (10 mins)
- [ ] Remove git lock file:
  ```bash
  rm -f /Users/a/Desktop/APP\ DEV/ridedrop-web/.git/index.lock
  ```
- [ ] Commit all changes:
  ```bash
  cd /Users/a/Desktop/APP\ DEV/ridedrop-web
  git add -A
  git commit -m "Complete MVP: photo verification, booking flow, notifications"
  git push origin main
  ```
- [ ] Check Netlify build at https://app.netlify.com
  - Wait for build to complete (should take 2-3 mins)
  - Confirm no errors

---

## 2. POST-DEPLOY CHECKS (5 mins)

- [ ] Visit https://ridedrop.co.uk
- [ ] Confirm page loads (not 404)
- [ ] Check that it's the latest version (look for any visual changes from today)

---

## 3. FULL END-TO-END TEST (30 mins)

### Sender Flow:
- [ ] Sign up as sender (email: tester+sender1@example.com)
- [ ] Upload profile photo at signup — confirm it uploads
- [ ] Post a job:
  - From: London King's Cross
  - To: Doncaster
  - Tomorrow, 2pm deadline
  - £50 budget
  - Package: "Test fragile item"
- [ ] Confirm job shows on dashboard with "open" status
- [ ] Go to "Find a carrier" and confirm no journeys yet

### Carrier Flow:
- [ ] Sign up as carrier (email: tester+carrier1@example.com)
- [ ] Upload profile photo at signup
- [ ] Switch to carrier mode in profile
- [ ] List a journey:
  - Same route (King's Cross → Doncaster)
  - Tomorrow
  - Pick operator & time
  - Suggested price should show (£25)
  - Upload ticket photo
- [ ] Confirm journey on dashboard

### Booking Flow:
- [ ] Switch to sender account
- [ ] Go to "Find a carrier"
- [ ] **CRITICAL:** Click journey → see carrier's PHOTO on detail page
- [ ] Book with your posted job
- [ ] Price: £35
- [ ] Confirm redirected to booking page
- [ ] **Booking page shows:**
  - [ ] Carrier's photo in profile card (top of page)
  - [ ] Chat interface on right
  - [ ] All delivery details

### Chat:
- [ ] Sender types message in booking: "Hi, when will you pick up?"
- [ ] Switch to carrier account (new tab)
- [ ] Confirm message appears in chat
- [ ] Carrier replies: "I'll be there at 2pm"
- [ ] Switch back to sender — confirm message appears

### Photos & Delivery:
- [ ] Carrier uploads pickup photo
- [ ] Confirm photo shows on both accounts
- [ ] Carrier uploads delivery photo
- [ ] Sender sees both photos
- [ ] Sender clicks "Confirm delivery"
- [ ] Status changes to "completed"

---

## 4. CRITICAL BUG CHECKS

**If any of these fail, fix them before telling testers:**

- [ ] Can you actually accept a job? (test as carrier)
- [ ] Does booking page show carrier photo? (without photo = fail)
- [ ] Does chat work both ways?
- [ ] Can you upload photos without errors?
- [ ] Does job expiration work? (post job with PAST deadline — should not appear)

---

## 5. SEND TO TESTERS (5 mins)

- [ ] Send this URL: https://ridedrop.co.uk
- [ ] Send the TESTER_CHECKLIST.md file
- [ ] Tell them: "Test the critical path (10 min version) first, then full checklist"
- [ ] Ask them to report bugs with screenshots

---

## 6. MONITOR (30 mins)

- [ ] Watch for tester feedback/bugs
- [ ] Fix critical bugs if they appear
- [ ] If bugs found:
  - Fix locally
  - Commit + push
  - Wait for Netlify rebuild
  - Test fix
  - Tell testers to refresh

---

## Notes

- **Profile photo is REQUIRED** — if signup doesn't ask for photo, something's broken
- **Booking page photo display is CRITICAL** — without it, no verification
- **AcceptJobButton must work** — if carrier can't accept, core flow is broken
- **Chat must be bidirectional** — test both directions before declaring success

---

**Estimated total time: 60 mins**  
**Success = all end-to-end test steps pass + tester feedback is positive**

Good luck! 🚀
