# Food Rescue Relay - 5-Minute Demo Script

**Target runtime:** 4:50-5:00  
**Demo story:** one Hyderabad caterer posts surplus, a nearby community kitchen claims it, and both confirm the result.  
**Format:** follow the screen actions and read the narration for each timed section.

## Prepare before recording

- Open the app in three separate browser profiles/windows and sign in so switching roles is instant:
  - **Donor:** `donor@rescuerelay.demo` / `demo123` — Madhapur Grand Events
  - **Receiver:** `hope@rescuerelay.demo` / `demo123` — Hope Community Kitchen
  - **Admin:** `admin@rescuerelay.demo` / `demo123` — Food Rescue Relay Admin
- Confirm the receiver is available and has capacity. Use a fresh rescue with a future pickup window; old seeded listings may have expired.
- Keep the donor posting page ready. Use synthetic sample data only. Don't expose private pickup details, credentials or database secrets on camera.
- Smart paste requires a clock time. Replace the example times below with a recent preparation time and a valid pickup time about an hour later. Have your donor and receiver windows side by side so the handoff is quick.
- Use a seeded completed rescue for history/poster screens if the new rescue hasn't generated those records yet. Identify it as a separate synthetic example.

---

## 0:00-0:35 | Problem and solution

**Do:** Open `/home`. Keep the landing page visible; point to the problem and the donor/receiver workflow.

**Say:**

> Caterers often finish an event with edible surplus, while community kitchens nearby may need meals. The hard part is connecting the right partners before the food window closes, coordinating collection, and confirming what was actually delivered. Food Rescue Relay brings that workflow together. Our pilot focuses on event caterers and community kitchens in Hyderabad. This is a synthetic demo, and the platform coordinates partners; it does not certify food safety.

## 0:35-1:30 | Donor dashboard and post food

**Do:** In the donor window, click **Post food**. In **Smart paste**, type `40 servings veg biryani, cooked [recent time], pickup by [time about one hour later]`; click **Fill form for review**. Check the parsed item, quantity, vegetarian type, category and allergen information. Click **Next**. Confirm the untouched-food statement only if true, choose the accurate holding option, then click **Next**. Confirm **Prepared at**, choose **1 hr** under **Pickup window**, enter locality `Madhapur`, check the accuracy attestation if true, then click **Post & find a match**. Briefly show the donor dashboard metrics and nearby receiver map/list.

**Say:**

> The donor dashboard summarizes delivered meals, available receivers, estimated food rescued and estimated climate impact. A donor can find nearby receivers on a receiver-only map, filter by food fit or availability, and compare distance, need and trust signals. Posting is a short three-step flow: food and servings, handling and allergens, then preparation and pickup timing. Smart paste drafts the details, but the donor reviews them before posting. The app calculates a consume-by estimate and pickup buffer as guidance, not a safety guarantee.

## 1:30-2:10 | Matching and receiver view

**Do:** Switch to the receiver window. On **Available rescues**, show compatible listings, active pickups and meal totals. Show the donor-only map/list and open the fresh Veg Biryani listing's **Food and pickup details**. Click **Accept rescue**. On the pickup page, point to the claimed status, timeline, countdown and chat/logistics section. Keep the exact address off camera.

**Say:**

> The receiver sets capacity, dietary preferences, allergen exclusions, transport, containers and refrigeration. Matching filters offers against those needs, time remaining and pickup feasibility. This receiver sees donor listings only. Before a claim, location is approximate; after accepting, exact pickup details are available only to the assigned receiver. The pickup page keeps both teams aligned with a status timeline and a short coordination chat.

## 2:10-3:05 | Pickup and delivery status

**Do:** On the receiver pickup page, click **Mark on the way** if shown. Confirm available pickup logistics. Check all four pickup checks. Switch to the donor window, show the fresh rescue's four-digit pickup code, then return and enter it with `40` in **Servings collected**; click **Confirm collection**. In **Record delivery**, enter `38` delivered and `2` rejected; click **Confirm delivery**. Show the **Delivery confirmed** card and **How was the handoff?** feedback. Switch back to donor and confirm the rescue now shows **Delivered**.

**Say:**

> The receiver confirms the pickup conditions and code, then records the quantity collected. Collected and delivered are different statuses. Here, forty servings were collected, thirty-eight delivered and two rejected. Both partner dashboards update from the same rescue record. Only receiver-confirmed delivered servings count toward meals, impact and contribution recognition.

## 3:05-3:45 | Receiver planning, impact and recognition

**Do:** Click **Open allocation planner**. Add two generic community groups, show the suggested split and packing-list action. Then show the donor **Impact** page, **Kindness Club** (`/contribution`) and **Overall appreciation** (`/contribution?view=poster`). Point to the meal/CO₂ estimates, coins, medal progress and lifetime poster. If the new rescue has no poster yet, open one from a completed synthetic rescue.

**Say:**

> The receiver planner divides a received batch among groups and prepares a packing list; it is a plan, not proof of who received meals. Impact counts one confirmed serving as one meal, estimates 0.4 kilograms of food per meal and 2.5 kilograms of CO₂e per estimated kilogram of food. These are illustrative assumptions, not measurements; transport emissions are excluded. Both partners earn ten non-cash kindness coins per confirmed meal and progress toward medals. Delivery posters and lifetime appreciation posters help partners share their contribution. They are recognition, not safety certificates, tax receipts or CSR credits.

## 3:45-4:15 | Admin and business case

**Do:** Switch to the admin window. Show **Overview**, then click **Organizations**, **Rescues** and **Certificates** quickly. Open `/pricing`; point to the proposal label and the ROI calculator. If time, flash `/business/sponsors` and `/business/city`.

**Say:**

> Admins monitor the rescue pipeline, review partner identity, inspect logistics and manage appreciation records. Identity checks do not certify food. The business pages explore a possible model: receiving stays free, while donor coordination tools or sponsor-funded neighbourhood routes could support operations. ROI, sponsor and city figures are proposals based on editable synthetic assumptions; billing is inactive and no tax benefit is claimed.

## 4:15-4:45 | Technology and Neon

**Do:** Show a simple architecture slide or diagram: `React + TypeScript → FastAPI → SQLAlchemy → Neon PostgreSQL`. In Neon, open the SQL Editor and run this aggregate query (never open secrets or personal rows):

```sql
SELECT status, COUNT(*) AS rescue_count
FROM rescues
GROUP BY status
ORDER BY status;
```

**Say:**

> The frontend is React and TypeScript. It calls a FastAPI REST backend, where SQLAlchemy services manage matching, dispatch, handoffs, impact and recognition. PostgreSQL on Neon persists hosted data; SQLite supports the local demo, and Alembic manages schema migrations. The browser never receives the database credentials. Matching and smart paste are rule-based; timed background escalation depends on a separate dispatch worker.

## 4:45-5:00 | Close

**Do:** Return to the delivered rescue or clean landing page. Keep private details and dialogs out of frame.

**Say:**

> Food Rescue Relay connects surplus to nearby need, coordinates the handoff and makes confirmed community impact visible. The next step is validating the workflow and proposed business model with real caterers and community kitchens. Thank you.

---

## Keep these claims accurate

- All organizations and activity in the demo are synthetic. Never show exact pickup addresses or database credentials.
- Food-handling guidance and identity checks are not food-safety certification.
- Impact is estimated from confirmed deliveries; it is not a measured landfill diversion.
- Coins have no cash redemption. Posters do not certify safety or provide tax, legal or CSR benefits.
- Prices, sponsor figures and unit economics are a proposal. Billing is inactive.
- Do not claim AI or LangGraph powers matching. The core matching and smart-paste behavior is deterministic/rule-based.
- If the dispatch worker is not running in the hosted setup, describe escalation as a designed capability, not a currently running background process.
