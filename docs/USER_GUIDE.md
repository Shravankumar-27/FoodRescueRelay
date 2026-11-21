# RescueRelay User Guide

This guide is for people who use RescueRelay in their day-to-day work: caterers who post surplus food, community kitchens, NGOs and shelters who receive it, and the platform administrators who watch over it. You do not need any technical knowledge to follow it.

## What RescueRelay does

Cooked food often goes to waste after events because nobody can find a quick way to pass it on. RescueRelay connects the two sides. A caterer or event kitchen posts the surplus food, with a pickup deadline. RescueRelay looks at the community kitchens, NGOs and shelters that can realistically reach the food in time, and offers it to one of them at a time. The receiving organisation accepts or declines. Once someone accepts, the caterer gets a 4-digit pickup code to hand over at collection. After delivery, the receiving organisation records how much was actually delivered, and that is the figure that counts toward the impact shown in the app.

## Getting started

To install and run RescueRelay on your computer, follow the step-by-step instructions in **[HOW_TO_RUN.md](../HOW_TO_RUN.md)**. This guide does not repeat those steps. It explains what you can do once the app is running.

You will need a web browser and a working internet connection. The app needs a connection to work; it does not work offline.

## Before you start: the demo and the safety notice

RescueRelay has demo accounts so you can try it without signing up. Demo data is synthetic: the names, addresses and phone numbers are made up. Do not enter real personal details into a demo.

**Demo accounts are for demonstration only. The password for all of them is `demo123`. This must be changed before any real deployment.**

Please also read this statement, which applies to everything in the app:

> RescueRelay coordinates food recovery and does not certify food safety. Handling information is provided by the donor. Receiving organisations are responsible for verifying suitability.

## Signing in

1. Open the app in your browser and go to the **login page** (`/login`).
2. Enter your email and password, then sign in.
3. For demo use, the demo accounts are already filled in on the login page, so you can pick one and sign in straight away.

Once you sign in, the app takes you to the home page for your role. If you try to open a page that belongs to a different role, the app sends you back to your own home page. This is intentional: each role sees only its own screens.

## The three roles

| Role | Who it is for | Home page after sign-in |
|---|---|---|
| Donor | Caterers and event kitchens that have surplus food | `/donor` |
| Receiver | Community kitchens, NGOs and shelters that take food | `/receiver` |
| Admin | Platform administrators who monitor activity | `/admin` |

---

## Part 1: Donor (caterer)

### Your home page

After you sign in as a donor, you land on your home page. It has a **"Rescue food"** button. Press it to post a new rescue.

### Posting a rescue

Go to the **new rescue** page (`/donor/rescue/new`). You will be asked to:

1. **List the food items.** For each item, enter its name, the number of servings, the dietary type (vegetarian or non-vegetarian), and allergen information. You can add more than one item.
2. **Describe the handling.** Say how the food has been stored and handled.
3. **Confirm the food condition.** You must confirm that the food was **untouched** and was **not served**, and that it was packed properly.
4. **Set the pickup deadline.** This is the latest time the food can be collected. RescueRelay only offers the rescue to receivers who can reach you before this time, with a safety margin of 10 minutes.
5. **Submit.** Your rescue is then sent into matching.

**Important:** RescueRelay will not accept a listing if the food has been served or has been mixed with waste. Please only post food that is genuinely surplus and still fit to be served.

**Allergen information:** if you do not know the allergen content of an item, leave it unknown. The app shows unknown allergen information as **unknown**. It never guesses.

### Watching a rescue

Open a rescue from your list to see its own page (`/donor/rescue/` followed by the rescue's number). On that page you can see:

- **Matching results:** the receiving organisations that were considered, and the reason each one was or was not chosen.
- **Status timeline:** where the rescue is in its journey (see the status list below).
- **Pickup code:** once a receiver has claimed the rescue, a 4-digit pickup code appears. Give this code to the receiver when they collect the food. Only you, the donor who posted the rescue, can see it.

### Rescue statuses

A rescue moves through these statuses:

| Status | What it means |
|---|---|
| POSTED | You have submitted the rescue. |
| MATCHING | RescueRelay is looking for a suitable receiver. |
| OFFERED | A receiver has been offered the rescue and has not answered yet. |
| CLAIMED | A receiver has accepted the rescue. The pickup code is now shown to you. |
| COLLECTED | The receiver has collected the food. |
| DELIVERED | The receiver has confirmed delivery. This counts toward your impact. |
| EXPIRED | The pickup deadline passed before the food was collected. |
| CANCELLED | The rescue was cancelled. |

### Cancelling a rescue

You can cancel a rescue if its current status allows it. If the status does not allow cancellation, the cancel option will not be available.

### Your past rescues

Go to **/donor/rescues** to see a list of your past rescues.

### Your impact

Go to **/donor/impact** to see your impact: how many rescues you have completed and how many servings were delivered. Only servings that the receiving organisation has confirmed as delivered are counted. The app does not show weight in kilograms.

---

## Part 2: Receiver (community kitchen, NGO or shelter)

### Your home page

After you sign in as a receiver, you land on your home page at `/receiver`. It shows:

- **Available offers:** food that has been offered to you and is waiting for your answer.
- **Current active pickups:** rescues you have already accepted that are still in progress.

### Setting up your availability

Go to **/receiver/capacity**. Here you tell RescueRelay what you can take. You can set:

- **Availability:** whether you are currently available to receive food.
- **Capacity:** how many servings you can take right now.
- **Transport:** whether you have transport to collect food.
- **Dietary types:** whether you accept vegetarian food, non-vegetarian food, or both.
- **Need level:** how urgently your organisation needs food.

Keep these settings up to date. RescueRelay only offers you food that matches them. If you cannot take food right now, set your availability accordingly.

### Responding to an offer

When a rescue is offered to you, it appears on your home page. Before you accept, you see only:

- the **locality** of the donor, and
- the **distance** to them (an estimate, see below).

You do **not** see the donor's exact address or phone number until you accept.

You have a limited time to respond. The default is **120 seconds**. If you do not answer in time, the offer automatically passes to the next receiver. If you decline, it also passes on.

To accept, choose accept on the offer. Once you accept, the offer is yours. If another receiver has already accepted the same rescue, you will be told it is no longer available.

### After you accept

Once you have accepted a rescue, you can see:

- the **exact pickup address** of the donor, and
- the **donor's contact details**, so you can arrange collection.

Go to the pickup page for that rescue, **/receiver/pickup/** followed by the rescue's number, to carry out the steps below.

### Collecting the food

1. Arrive at the donor and ask for the **4-digit pickup code**.
2. Enter the code in the app. The code must be exactly 4 digits.
3. Be careful: if the wrong code is entered **5 times**, the code is locked.
4. Once the code is accepted, record how many servings you collected.

### Confirming delivery

After you have delivered the food, go back to the pickup page and confirm:

- how many **servings were delivered**, and
- how many **servings were rejected** (for example, if you could not use them).

The number of delivered plus rejected servings cannot be more than the number you collected. The app will not accept a figure that does not add up.

Only servings you confirm as delivered count toward the donor's impact. Rejected servings and servings you did not collect are not counted.

### Your accepted rescues

Go to **/receiver/history** to see the list of rescues you have accepted.

---

## Part 3: Admin

### Your home page

After you sign in as an admin, you land on `/admin`. This is the **overview**, which shows a summary of the platform's impact.

### Organisations

Go to **/admin/organizations** to see the list of organisations registered on RescueRelay.

### Rescues

Go to **/admin/rescues** to see the list of rescues on the platform.

### What admins cannot do

Admins can view the impact summary, the organisations and the rescues. Admins **cannot change the rescue flow**. They do not decide who gets a rescue, and they do not record collections or deliveries. Admin lists do not show private contact or address details.

---

## How matching works

You do not need to do anything for matching to happen, but it helps to know how it chooses receivers.

- A receiver is only offered a rescue if it is **verified** and **available**, has **enough free capacity** for the servings, **accepts the dietary type** of the food, has **transport**, and can reach the pickup **before the deadline**, including the 10-minute safety margin.
- The remaining receivers are ranked by a score. The score weighs:
  - **Proximity: 35%** (closer receivers score higher),
  - **Urgency: 30%** (rescues with more time to spare score higher),
  - **Need: 20%** (a higher need level scores higher),
  - **Reliability: 10%**,
  - **Fairness: 5%** (receivers who have had fewer recent deliveries score higher).

**Travel times are estimates, not live.** RescueRelay estimates the road distance from the straight-line distance, and assumes an average speed of 20 km/h. It does not use live traffic. Real travel times will often differ, so please leave margin for the journey.

**Reliability scores in the demo are seeded.** The reliability values for the demo organisations are set in advance. They are not calculated from real performance.

---

## How impact is counted

- Impact counts only the servings that the receiver has **confirmed as delivered** after delivery is confirmed.
- Servings that were rejected, or not collected, are **not** counted.
- No weight in kilograms is shown.

---

## Privacy

- A donor's exact address and phone number are hidden from receivers until a receiver accepts the rescue.
- The pickup code is shown only to the donor who posted the rescue.
- Admin screens do not show private contact or address details.
- Demo data is synthetic. There are no real addresses or contact details in the demo.

---

## Food safety

RescueRelay helps organisations find and share surplus food. It does **not** check whether food is safe.

- The handling information comes from the donor. It is a record of what the donor stated, not a food-safety inspection.
- Receiving organisations must verify that the food is suitable before they serve it.
- Unknown allergen information is shown as **unknown**. It is never guessed.

Please also read the statement in the section "Before you start" above.

---

## Demo accounts

These accounts are for demonstration only. The password for every one of them is `demo123`. **Change these passwords before any real deployment.**

| Email | Role | Organisation |
|---|---|---|
| donor@rescuerelay.demo | Donor | Madhapur Grand Events |
| hope@rescuerelay.demo | Receiver | Hope Community Kitchen |
| shelter@rescuerelay.demo | Receiver | ShelterServe |
| cityfood@rescuerelay.demo | Receiver | City Food Relief |
| admin@rescuerelay.demo | Admin | RescueRelay Admin |

The demo also includes an existing rescue, **RR-DEMO0001**, posted by Madhapur Grand Events. You can open it from the donor account to see how a rescue looks, or use it from the receiver side to see an offer.

---

## Quick reference: which page does what

| Page | Who | What it is for |
|---|---|---|
| `/login` | Everyone | Sign in with email and password |
| `/donor` | Donor | Home page with the "Rescue food" button |
| `/donor/rescue/new` | Donor | Post a new rescue |
| `/donor/rescue/:id` | Donor | See one rescue: matches, status timeline, pickup code |
| `/donor/rescues` | Donor | List of your past rescues |
| `/donor/impact` | Donor | Your completed rescues and servings delivered |
| `/receiver` | Receiver | Available offers and current active pickups |
| `/receiver/pickup/:rescueId` | Receiver | Enter the pickup code, record collection and delivery |
| `/receiver/capacity` | Receiver | Set availability, capacity, transport, dietary types and need level |
| `/receiver/history` | Receiver | List of rescues you have accepted |
| `/admin` | Admin | Platform impact overview |
| `/admin/organizations` | Admin | List of organisations |
| `/admin/rescues` | Admin | List of rescues |

---

## Known limitations

Please keep these limits in mind. We would rather you know them than be surprised by them.

- **Travel times are estimates, not live traffic.** Plan for delays.
- **Reliability scores are seeded, not calculated.** The demo values are placeholders.
- **AI-assisted posting is not included.** You enter food items by hand.
- **Docker setup is not verified in this environment.** If you are setting the app up with Docker, the steps have not been checked here. Please follow the instructions in [HOW_TO_RUN.md](../HOW_TO_RUN.md) and check carefully.
- **Offline use is not supported.** The app needs an internet connection to work.
