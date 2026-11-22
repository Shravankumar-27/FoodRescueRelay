# RescueRelay Hackathon Guide

**Codebenders ACE Builders’ Hackathon 2026 · Problem Statement 2 · Society and Environment**

RescueRelay helps event caterers in Hyderabad get untouched surplus to a nearby community kitchen before the pickup deadline. It connects one donor listing to a compatible receiver, verifies the pickup handoff, and records how many servings were delivered. The walkthrough uses synthetic data.

**Start here.** Open the local app at [localhost:5173/home](http://localhost:5173/home). The [README](README.md) provides setup and demo accounts.

## Working Product · 

The main test is a complete rescue across two roles. Use separate browser profiles or different browsers for the donor and receiver so both sessions stay available. Sign in as `donor@rescuerelay.demo` and `hope@rescuerelay.demo`. The demo password is `demo123`.

| Step | What to do | verification |
| --- | --- | --- |
| 1. Post as the donor | Choose **Post food**. Enter **40 servings of veg biryani**, **Cooked meal**, **Veg**, and **dairy** as the sample allergen. Confirm untouched surplus and choose **Kept hot**. Enter a preparation time about 15 minutes ago and a pickup deadline about 60 minutes from now. Review the consume-by estimate, confirm the handling details and post. | The listing has a rescue code, a pickup deadline and a matching timeline. Use a new listing so the demo’s relative deadlines are current. |
| 2. Claim as the receiver | Find the new rescue on **Available** by its donor or food description. Accept it and choose **Mark on the way**. | The offer shows approximate location before acceptance. The assigned receiver sees the exact pickup details after acceptance. |
| 3. Confirm pickup | In **Pickup logistics**, confirm that the receiver can provide containers and transport for this synthetic walkthrough. Complete the pickup checks, enter the pickup code from the donor’s rescue page, and record **40 collected**. | The rescue updates to **Collected**. Both sides can follow the handoff through the timeline. |
| 4. Record delivery | Enter **38 delivered** and **2 rejected**, then confirm delivery. | The timeline shows **Delivered**. Only the 38 confirmed delivered servings contribute to meal impact. |
| 5. Show the result | Return to the donor’s rescue and choose **Create shareable event report**. Open the report or its print preview. | The report shows **38 meals**, approximately **15.2 kg** of food, and an estimated **38 kg CO₂e**, using displayed assumptions. It shows the receiving organization name without an address. |

Other working paths include timed offer rotation, manual claim release and rematching, receiver capacity controls, pickup logistics providers, private allocation planning, CSV exports and appreciation posters. To demonstrate automatic escalation live, enable the admin demo clock on a separate synthetic database and advance an unclaimed listing past 40% and then 70% of its pickup window. The first stage widens the search and can alert volunteers and the next receiver. The second marks it urgent. [Runbook](HOW_TO_RUN.md) · [Escalation and sharing tests](backend/tests/test_spoilage_event_impact.py)

## Business Viability · 

The initial pilot would pair repeat event caterers in Madhapur with nearby community kitchens. The payer hypothesis is that frequent donors would pay for coordination savings and client reporting, while neighbourhood sponsors would help fund transport and report confirmed outcomes. **Receiving stays free.** [Pricing and donor ROI](http://localhost:5173/pricing) · [Sponsor dashboard](http://localhost:5173/business/sponsors) · [Unit economics](http://localhost:5173/business/economics)

| Proposal | inspection |
| --- | --- |
| Community · Free | Core posting, claiming and delivery tracking. |
| Donor Pro · ₹999 per month | The pricing page compares estimated staff and disposal savings with the proposed price. Reusable templates, reminders and client reports support repeat use. |
| Neighbourhood sponsor · ₹4,999 per month | The sponsor view shows illustrative trips funded, cost per delivered meal and impact with assumptions. we can create a demo pledge and preview a branded report. |

**Illustrative proposal. Billing is not active.** At the donor calculator’s defaults, 30 kg a week × ₹10 saved per kg plus 45 minutes a week × ₹300 an hour gives ₹525 per week, or ₹2,275 per average month. Subtracting the proposed ₹999 plan gives ₹1,276 per month in modeled value. Meal counts are tracked separately from these savings. The unit economics page lets us change fixed cost, variable cost, paid donor share and delivered meals to see how break-even changes. [Pricing and ROI code](frontend/src/pages/PricingPage.tsx) · [Unit economics code](frontend/src/pages/BusinessPage.tsx)

A four-week pilot would compare coordination minutes with the current process and track claim time, delivered servings, repeat donors, missed pickups and transport cost per delivered meal. Those results and direct willingness-to-pay conversations would guide the next decision on pricing. The **Pilot feedback** page is reserved for real conversation notes.

## Problem and User Clarity · 

The first user is the caterer or venue operations lead who needs to act as an event ends. The receiving user is the kitchen coordinator who needs to decide whether the food fits available capacity, dietary requirements, transport and timing. The two parties need different information at different points in the same handoff.

| User question | Product response |
| --- | --- |
| **Donor** · Who can collect this before the deadline? | Compatible receiver ranking, a pickup cutoff and dispatch that can widen the search. |
| **Receiver** · Can our team use and collect this donation? | Food and handling details, capacity and preference controls, travel estimates and pickup logistics. |
| **Both** · How much was actually delivered? | Code-confirmed collection, separate delivered and rejected counts, and a delivery-based impact record. |
| **Coordinator** · Where are the coverage gaps? | Admin rescue and partner views, plus an illustrative neighbourhood surplus-and-need heatmap. |

The workflow is designed for a targeted city pilot. The live walkthrough demonstrates coordination with synthetic data. The impact assumptions are illustrative. Receiving partners still assess suitability before collection. **Not a food-safety certification.**

## Build Quality and Use of Codebenders · 

The build separates responsive UI, API authorization, rescue services and the dispatch worker. SQL migrations track schema changes. The workflow uses deterministic matching, a conditional claim and a database constraint that prevents more than one accepted offer per rescue. Collection and delivery quantities are validated in the API.

| Engineering decision | Evidence |
| --- | --- |
| The complete handoff is reproducible. | [Post-to-delivery integration test](backend/tests/test_hero_flow.py) |
| Concurrent claims resolve to one winner. | [Claim and concurrency tests](backend/tests/test_dispatch_claim.py) |
| Unclaimed windows can escalate once, and release removes access to exact pickup details. | [Clock, privacy and event report tests](backend/tests/test_spoilage_event_impact.py) |
| The pickup UI updates from the delivery response. | [Pickup UI regression tests](frontend/src/tests/ActivePickupDelivery.test.tsx) |
