# RescueRelay: 2-minute demo (donor to impact)

This script walks the full hero flow: a caterer posts surplus food, a community kitchen claims it, the donor sees the pickup code, the receiver collects and delivers, and the donor's impact updates.

Everything here uses synthetic demo data. The organizations, people and addresses are fictional.

## Before you start

1. Backend is running on `http://localhost:8000` and the frontend on `http://localhost:5173`. See `HOW_TO_RUN.md`.
2. Start from a clean demo database. If you have run a demo before, reset it first:

   ```powershell
   cd backend
   python -m app.seed.reset_demo
   ```

   This deletes all rescues, offers, handoffs and impact records, restores receiver capacities, and re-seeds the demo accounts and the demo rescue. Stop the API first if you see a "database is locked" error.

3. Keep a browser window for the frontend and, if you want a backup view, Swagger at `http://localhost:8000/docs`.

**Timing note.** The seeded rescue `RR-DEMO0001` (Madhapur Grand Events) is created with times relative to the moment the seed runs: `prepared_at` 30 minutes earlier, `pickup_by` 50 minutes later. It stays in status `POSTED` and is not offered to anyone. The sequence below creates a *new* rescue, so it does not depend on that timing.

## The demo accounts used

| Step | Account | Password |
|---|---|---|
| Post surplus, donor view | `donor@rescuerelay.demo` (Madhapur Grand Events, donor) | `demo123` |
| Claim, collect, deliver | `hope@rescuerelay.demo` (Hope Community Kitchen, receiver) | `demo123` |

Demo only. Do not reuse these accounts or this password anywhere real.

## The sequence

Times are approximate. Aim for about 2 minutes end to end.

Screen names come from the frontend routes in `frontend/src/app/App.tsx`. Button and panel labels marked "confirm on screen" are not verified in the source; the API call next to each step is the reliable equivalent.

### 0:00: Log in as the donor (about 10 seconds)

1. Open `http://localhost:5173`. You are sent to `/login`.
2. Sign in as `donor@rescuerelay.demo` with password `demo123`.
3. You land on the donor home (`/donor`).

### 0:10: Post the surplus (about 30 seconds)

Open the new-rescue page (`/donor/rescue/new`) and enter:

| Item | Value |
|---|---|
| Food item 1 | Veg Biryani, **100** servings, vegetarian, allergen **dairy** |
| Food item 2 | Dal, **40** servings, vegetarian |
| Total | **140** servings (the server computes this from the items) |
| Untouched, not served or mixed with waste | **Yes** (`untouched_confirmed` true) |
| Packaging available | **Yes** |
| Handling type | **HOT_HELD** |
| Prepared | now |
| Pickup by | **50 minutes from now** |
| Handling attestation | Checked (`safety_attestation` true) |

Submit. The rescue detail page opens at `/donor/rescue/<id>` with the status **OFFERED**. The offer goes to Hope Community Kitchen first.

Why Hope is first, from the matching code: it is about 0.7 km from the donor, has capacity 180 (the rescue needs 140), accepts vegetarian food, has transport, and is marked high need. ShelterServe (capacity 80) is infeasible for 140 servings, so it is excluded. Confirm the order on screen before the demo.

### 0:40: Show the Rescue Clock and the matching explanation (about 20 seconds)

1. Point at the **RESCUE CLOCK** panel. It counts down to `pickup_by`, from the `seconds_remaining` field.
2. Open the matching explanation for the rescue. It lists each receiver, whether it is feasible, and the reasons (distance, travel time, capacity, need, reliability, fairness). The API equivalent is `GET /api/v1/rescues/<id>/matches`. Confirm the panel label on screen.

### 1:00: Log out, then claim as the receiver (about 25 seconds)

1. Click **Log out** in the top bar.
2. Sign in as `hope@rescuerelay.demo` with `demo123`.
3. The receiver home (`/receiver`) shows the open offer for the 140-serving rescue, with its "why" reasons and a countdown to respond (120 seconds by default).
4. Accept (claim) the offer with the accept or claim action on the offer card. The API call is `POST /api/v1/offers/<offer_id>/claim`. Confirm the button label on screen.

The claim returns status **CLAIMED**. Claiming the same offer again returns `409 OFFER_NOT_PENDING`.

### 1:25: Donor sees CLAIMED and the pickup code (about 15 seconds)

1. Click **Log out**, then sign in as `donor@rescuerelay.demo`.
2. Open the rescue (from `/donor/rescues`, or the rescue's link). The status is **CLAIMED**.
3. The **Pickup code** panel shows the 4-digit code. Read it out or note it. The code is shown only to the donor, and only while the rescue is CLAIMED or COLLECTED.

### 1:40: Collect 140 as the receiver (about 15 seconds)

1. Click **Log out**, sign in as `hope@rescuerelay.demo`.
2. Open the pickup page for the rescue (`/receiver/pickup/<rescue_id>`).
3. Enter the 4-digit code in **Pickup code (4 digits)**.
4. Enter **140** collected servings and submit. The status becomes **COLLECTED**.

API equivalent: `POST /api/v1/rescues/<id>/collect` with `{"pickup_code": "<code>", "collected_servings": 140}`.

### 1:50: Confirm delivery: 132 delivered, 8 rejected (about 15 seconds)

1. On the same pickup page, in the **Confirm delivery** section, enter **132** delivered and **8** rejected. The total is 140, which matches the collected count.
2. Click **Confirm delivery**. The status becomes **DELIVERED**.

API equivalent: `POST /api/v1/rescues/<id>/deliver` with `{"delivered_servings": 132, "rejected_servings": 8}`. The response has `impact_meals: 132`.

### 2:05: Donor impact shows 132 meals (about 10 seconds)

1. Click **Log out**, sign in as `donor@rescuerelay.demo`.
2. Open the impact page (`/donor/impact`).
3. **Total meals rescued** shows **132**, assuming you reset the database first. Impact is cumulative, so after earlier deliveries the total is higher. The number that moved is the 132 from this run.

API equivalent: `GET /api/v1/impact/summary`. The `methodology_note` in the response reads: "Meals rescued = receiver-confirmed delivered servings."

## Talking points

- **Feasibility is checked before ranking.** A receiver that cannot take the full 140 servings, or cannot reach the donor before pickup, is never offered the rescue.
- **Only one receiver can claim.** The claim is an atomic database update. If two receivers click at once, one wins and the other gets a clear conflict.
- **The address is hidden until a claim.** Before Hope claims, the donor's exact address is not in the receiver's view.
- **Impact counts only what the receiver confirms.** The 132 comes from the delivery confirmation, not from the 140 posted.
- **Safety is the donor's statement and the receiver's responsibility.** RescueRelay does not certify food safety. The app shows this notice on the offer and rescue screens.

## If something goes wrong during the demo

| Symptom | Fix |
|---|---|
| Offer does not appear for Hope | Check that the pickup time has not passed. Reload `/receiver`. If the rescue is stuck in `MATCHING`, call `POST /api/v1/rescues/<id>/dispatch` from Swagger as the donor. |
| Claim returns `OFFER_EXPIRED` | The 120-second window passed. Post a new rescue. |
| Pickup code rejected | Use the code shown on the donor's rescue page. Five wrong attempts lock the code. |
| Totals look too high | Run `python -m app.seed.reset_demo` (from `backend`) and start again. |
