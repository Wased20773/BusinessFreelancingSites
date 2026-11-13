---
title: Billing Plan
code-path:
    - platform/src/app/api/businesses/[businessId]/route.ts (TODO(billing) in DELETE)

last-verified: 2026-11-10
status: planned
---

# Billing Plan

## Overview

The platform dashboard is free. Businesses pay a monthly Stripe subscription for API traffic and workspace extras, and make a one-time purchase for each extra location.

This document records every billing decision made so far, including the ideas that were rejected and why. Nothing here is implemented yet. Prices and limit numbers are still open (see [Open Decisions](#open-decisions)).

## Target Audience

Small local businesses, including small chains of about 2–10 locations. The number of locations does not show how big a business is: a family business with 5 locations can be smaller than a single busy restaurant. Plans therefore charge for **traffic and team size**, and locations are a one-time purchase. Businesses beyond the self-serve location cap contact us (see [Deferred](#deferred-far-future): custom plan).

## Principles

- **Same API, same data on every plan.** Plans never change the shape or content of API responses. Templates built against the [API Reference](../src/data/apiReference.ts) work on any plan.
- **Plans meter traffic and workspace extras, never data.** Paying raises traffic limits and what a business can create.
- **Locations are bought once, never rented.** A purchased location slot belongs to the business permanently.
- **Data is never deleted for billing reasons.** A lapsed business keeps everything.
- **Paying grants no permissions.** Whoever pays is still their normal role.
- **Simple to explain.** "Your plan is about how busy you are and how big your team is. Locations are a one-time purchase."

## Plans: Two Parts

### Part 1: Tier (monthly subscription)

The tier sets:

- The API **rate limit**, per business. All of a business's API keys share it, so creating or cycling keys never adds traffic.
- **Members**, **API keys**, and **allowed origins per key**.
- **Sync across locations** (paid tiers only).
- Future perks that make building and running the website easier.

Tiers say nothing about locations. Tier names should not describe locations (for example Starter / Growth / Scale).

### Part 2: Location Slots (one-time purchase)

- Every business, on any plan, includes **1 location slot**.
- More slots are bought one at a time with a **one-time payment**. There is no recurring charge.
- A slot is **capacity, not a specific location**. Deleting a location frees its slot for a new one, so a business never pays twice for the same capacity.
- Slots **belong to the business**, not to the buyer. If the buyer leaves or is removed, the slots stay.
- **Anyone in the business can buy a slot**, regardless of role. Buying grants no permissions; creating locations still follows normal role rules.
- **Free businesses can buy slots.** Sync stays a paid-tier feature, so a Free business with several locations edits each one separately. This is the main reason to upgrade, and nobody is forced into it.
- **Self-serve cap:** a business can hold at most N slots in total (N TBD, about 10–25). Beyond that, the business contacts us.
- **Non-refundable.** The checkout page states it.
- **Chargebacks:** a refund forced by the bank (stolen card, dispute) removes the slot. If the business is then over its slot count, it cannot create new locations until it is back under. Existing locations are never locked or changed.

### Plan Board (numbers and prices TBD)

|                               | Free                 | Tier 1                      | Tier 2         | Tier 3         |
| ----------------------------- | -------------------- | --------------------------- | -------------- | -------------- |
| **Price (monthly)**           | $0                   | TBD                         | TBD            | TBD            |
| **Rate limit (per business)** | low (TBD)            | today's (burst 150, 60/min) | higher         | highest        |
| **Members**                   | few                  | more                        | more           | many           |
| **API keys**                  | 1                    | more                        | more           | many           |
| **Origins per key**           | 3                    | 3                           | ~5             | 10             |
| **Sync across locations**     | no                   | yes                         | yes            | yes            |
| **Location slots**            | 1 included, buy more | same                        | same           | same           |
| **Items, contacts, socials**  | unlimited            | unlimited                   | unlimited      | unlimited      |

## Pricing Rules

- **Tier steps of about 2.5–3x** between tiers.
- **Slot price:** one-time, set at about what Tier 1 costs for 2–3 months, so it feels like a real purchase without stopping a small business. The price is the same for every business on every tier.
- A one-time charge of this size makes Stripe's fee (about 2.9% + 30¢ per payment, US) small.
- Slots fit the cost structure: an extra location adds no API traffic (the rate limit is per business) and only a little storage (database rows and S3 images). Ongoing costs come from traffic and team size, which the monthly tier covers.

Example with placeholder prices (Tier 1 $12, Tier 2 $35, Tier 3 $90, slot $30 one-time):

| Business                       | Free        | Tier 1             | Tier 2             |
| ------------------------------ | ----------- | ------------------ | ------------------ |
| 1 location                     | $0          | $12/mo             | $35/mo             |
| 5 locations (4 slots bought)   | $120 once   | $120 once + $12/mo | $120 once + $35/mo |

Inputs still needed to set real prices:

1. Current monthly infrastructure costs (hosting, Prisma Postgres, Redis, S3 storage and transfer).
2. Whether client site builds are charged separately from the subscription.
3. What a small restaurant would comfortably pay per month.
4. The first-year income goal (break-even or a target monthly income).

## Who Pays the Subscription

Like Discord server boosts: **anyone in the business can pay**, regardless of role.

- Each business has **one current payer**, shown with a highlighted ("golden") badge so everyone knows who is covering it.
- **Paying grants no permissions.** A staff member who pays is still staff.
- **Only the payer can change or cancel the subscription**, since it is their card.
- **Ownership and billing are separate.** Transferring ownership does not move billing; the original payer keeps paying.
- **Taking over:** another member subscribes, on any tier, and takes over immediately. Only after Stripe confirms the new payment is the old payer's subscription cancelled, with **no refund or credit** for the unused time.
- **The payer changes tiers in place** (upgrade or downgrade, prorated by Stripe) instead of checking out again, so a business never has two subscriptions.
- **If the payer leaves or is removed**, their subscription is cancelled at the end of the paid month so they are never charged again, and the owners are notified so someone can take over before it lapses.
- **Billing is managed on our Billing page** (subscribe, switch tiers, take over, buy slots). The Stripe Customer Portal is used for cards, invoices, and cancelling.

## Payment Lapse

1. **Grace period.** Stripe retries the card and emails the payer (length set in the Stripe dashboard). Everything keeps working.
2. **Cancelled.** Cancelling (by the payer, or after failed retries, or because the payer left) keeps access until the end of the paid month.
3. **Falls back to Free.**
    - The rate limit drops to Free's.
    - Members, API keys, and origins over Free's limits stay, but no new ones can be added until the business is under the limit.
    - **Sync is locked** (see below).
    - **Locations are unaffected.** Slots are owned, so every location stays fully editable.
    - Nothing is deleted.
4. **Paying again** (by anyone) restores the tier limits and sync immediately.

### Sync Is a Paid Feature

Sync is the upgrade hook: a business with several locations sees how much easier managing them is on a paid plan.

- On Free, sync toggles are disabled with an upgrade prompt, and the server treats every sync flag (`isSynced`, `deleteAllSynced`) as false. Creates, updates, and deletes apply **only to the location being edited**.
- Editing a synced record on Free detaches **only that record**: it gets its own copy of any shared image and keeps its `syncGroupId`, so it can rejoin its group with the sync toggle after upgrading. Records that aren't edited stay synced.

## API Keys and CORS

- Developers keep the API key **Active switch** as their emergency off button (for example a leaked key).
- **CORS stays.** It protects a paying customer's key from being used by other websites in browsers. It is not a billing control: server-side requests send no `Origin`, and servers can fake it.

## Business Deletion

- `DELETE /api/businesses/[businessId]` has a `TODO(billing)`: cancel the business's subscription **before** deleting, so a deleted business can never keep being charged.
- Purchased slots are lost with the business. The danger zone warns about this.

## Implementation Outline (for the build plan)

- **Schema:**
    - Subscription data on `Business`: Stripe subscription id, tier, status, current period end, current payer user id.
    - A Stripe customer per paying user.
    - A `LocationSlotPurchase` record per purchase (business, buyer, Stripe payment id, status), so slots can be audited and a chargeback can remove the right one. The business's slot count is 1 plus its active purchases.
- **Plan config:** one file in code with each tier's limits, the slot price, and the self-serve slot cap.
- **Enforcement points:**
    - Rate limiter: the limit comes from the business's tier.
    - Creation checks: locations (against slots), members, API keys, origins per key (against the tier).
    - Sync: `allowSync()` in `lib/billing/sync.ts`, called inside `createSyncedResource` / `updateSyncedResource` / `deleteSyncedResource` in `route_helper.ts`, and directly in every route with its own sync code (categories, subcategories, items, item images, item options, days, hours).
- **Stripe:** Checkout in subscription mode (tiers) and payment mode (slots), Customer Portal (cards, invoices, cancel), webhooks (subscription changes, completed slot payments, disputes) to keep the database in sync. The app reads plan, status, and slots from the database only, never from Stripe during a request.
- **UI:** a workspace Billing page (plan, usage against limits, payer badge, subscribe, switch tier, take over, buy slots).
- **Launch migration:** existing businesses start on Free with 1 slot. Businesses that already have more than one location get matching slots for free, so nobody is over their limit at launch. No live site uses the API today, so nothing breaks.
- **Local testing:** Stripe test mode plus the Stripe CLI. Stripe can't reach `localhost`, so events only arrive while this is running (events sent while it's off are never delivered; editing the subscription in the dashboard sends a fresh `updated` event). In PowerShell the event list must be quoted:

    ```powershell
    stripe listen --forward-to http://127.0.0.1:3000/api/billing/webhook --events "customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,checkout.session.completed,charge.dispute.created"
    ```

- **Production webhook:** register `https://<domain>/api/billing/webhook` in the Stripe dashboard (Developers → Webhooks) with the same events. It gets its own `whsec_` secret for the production `STRIPE_WEBHOOK_SECRET`; Stripe retries failed deliveries for up to 3 days.

## Deferred (Far Future)

- **Custom plan:** a business contacts us for a plan tailored to it (for example past the self-serve slot cap). Not useful before there are customers.
- **Shared pause page** for lapsed client sites. If revisited: a `packages/site-kit` package bundling the page as a React component, a data-only status endpoint, HTTP 503, and failing open when the platform is unreachable. No remote HTML, iframe, or rewrite (remote content would run on the client's domain).
- **Hosting and custom domains** (a Vercel-style domains list with DNS verification). Client sites are custom-built per client, so multi-tenant hosting does not fit today. Domain registration is out of scope.
- **Yearly billing.**
- **A restore window** for deleted businesses.

## Rejected Alternatives

| Idea | Why it was rejected |
| --- | --- |
| Free keys limited to localhost origins | Unenforceable: server-side requests send no `Origin`, and servers can fake it. |
| Development and production key types | Not needed once limits are per business and per tier. |
| 30-day free API trial | Too costly to give away at this stage. |
| Free keys return sample data (sandbox) | Did not fit the product. |
| Tiers defined by number of locations | The number of locations does not show a business's size; replaced by one-time location slots. |
| Monthly per-location fee (subscription quantity) | A business could delete locations before the billing date and add them back after. Also unfair to small multi-location businesses. |
| Billing for the highest location count in the month | Closed the loophole but kept charging monthly for locations. |
| Pay-as-you-go balance (a few cents per created item, contact, social) | Too confusing and more than needed. |
| Locking locations after a lapse (owner chooses which stay editable) | Not needed: slots are owned permanently, so a lapse never affects locations. |
| "N oldest locations stay editable" | Confusing and would draw complaints. |
| On Free, edit a synced record locally while leaving `isSynced` / `syncGroupId` untouched | Synced items share one image in S3, so a "local" image change could overwrite or delete the image the other locations use. Detaching only the edited record (it keeps its `syncGroupId`) is safe and can be undone after upgrading. |
| Scheduled handover (the next payer starts when the current payer's month ends) | An upgrade is usually urgent; making the business wait until next month would hurt it. |
| Refunding or crediting the old payer's unused time on a takeover | Not needed at this stage; keep it simple and revisit if users ask. |
| Blocking takeovers to a lower tier | Not needed at this stage; keep it simple and revisit if it becomes a problem. |
| Refunds on location slots | Goes against "bought once, kept"; no real use case at this scale. Chargebacks are still handled. |
| Billing pauses API keys via `isActive` | Developers can toggle `isActive`; billing must not depend on a user-editable flag. |

## Open Decisions

1. **Prices**: the tier prices and the one-time slot price (see [Pricing Rules](#pricing-rules) for the inputs needed).
2. **Limit numbers**: Free's rate limit, and members / API keys / origins for each tier.
3. **Self-serve slot cap**: the maximum total slots a business can buy before contacting us (about 10–25).
