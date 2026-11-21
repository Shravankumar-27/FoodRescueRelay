# RescueRelay: business notes

**All financial figures in this document are hypotheses. None has been validated with customers, sponsors or payment data.** They are working assumptions to test, not forecasts or quotes.

## Problem and target customer

Surplus cooked food is a daily cost for multi-event caterers and banquet operations, and receivers such as community kitchens, NGOs and shelters often cannot find it fast enough. Today the handoff runs on phone calls and group messages, and nobody records what was delivered.

Primary target customers (hypotheses to test):

- **Multi-event caterers** who serve several events a week and produce surplus regularly.
- **Banquet chains** with several halls, where surplus is generated per location.
- **Venue operators** who host events and want a documented, routine way to handle what is left over.

Primary receivers (the other side of the marketplace, not the payer): community kitchens, NGOs and shelters in Hyderabad, the initial city.

## Core workflow: free for rescue

The core rescue workflow is free for donors and receivers. A donor posts a rescue, the platform ranks receivers, an offer goes out with a 120-second response window, a receiver claims it, and the handoff and delivery are recorded.

Keeping the core free is deliberate. A donor who must pay before the first rescue is unlikely to adopt the platform, and the impact record depends on receivers using it.

## Pilot pricing hypothesis

Pilot pricing hypothesis: ₹1,999/month per organization

This is a single hypothesis about what a multi-location caterer or venue operator might pay for paid features. It has not been tested with any customer, and it may be wrong in either direction.

Candidate paid features (not built as paywalls yet):

- **Multi-location reporting:** rolled-up impact and rescue figures across several sites under one organization.
- **Impact reports:** exportable summaries for an organization's own records or for a sponsor.
- **Organization analytics:** completion rates, time from posting to delivery, and which receivers respond fastest.
- **Event templates:** saved food-item lists and handling settings for recurring events.
- **Priority support:** a faster response channel for operational problems during events.

The current codebase has the impact summary (`GET /api/v1/impact/summary`) and the completion figures it returns. It does not have multi-location reporting, exports, analytics, templates or support tooling.

## CSR sponsors as secondary payer

A hypothesis: corporate social responsibility (CSR) budgets may fund rescues or impact reporting, so that sponsors pay where the donor does not. Sponsors would be a **secondary payer**, buying impact reports or sponsoring a receiver's capacity, rather than funding the core rescue flow.

This has not been tested. It depends on whether sponsors want reports in a form they can use, and on the impact figures being credible. The impact figures count only receiver-confirmed delivered servings, which is the basis a sponsor would need to rely on.

## What is not claimed

- No revenue, margin, customer count, conversion rate or payback period is claimed. None has been measured.
- No customer has been interviewed or has committed to paying.
- The Hyderabad reliability scores and demo organizations are synthetic.
- No partnership with a sponsor, caterer or receiver exists yet.

## What would test the hypotheses

1. Recruit a small number of caterers and banquet operators in Hyderabad for a pilot, free of charge.
2. Measure how often they post a rescue, how often it is claimed, and how many servings are delivered.
3. Ask pilot organizations directly what they would pay, and for which feature, before building any paywall.
4. Ask one or two CSR teams whether an impact report would be useful to them, and what format they need.

Each step produces evidence that can confirm or reject the pricing and payer assumptions above.
