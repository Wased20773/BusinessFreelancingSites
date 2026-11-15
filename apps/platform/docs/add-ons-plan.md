---
title: Add-ons Plan
code-path:
  - packages/database/prisma/schema.prisma
  - platform/src/lib/items/
  - platform/src/app/api/businesses/[businessId]/locations/[locationId]/
  - platform/src/app/api/business/menu/route.ts

last-verified: 2026-11-15
status: planned
---

# Add-ons Plan

## Overview

Add-ons are extras a customer can put on an item, such as pizza toppings, sauces, an extra espresso shot, or gift wrap at a bookstore. Each location keeps one list of add-ons, sorted into groups. Items pick the add-ons that apply to them.

This document records every add-on decision made so far, including the ideas that were rejected and why.

## Why Add-ons

Today an item's `price` has two meanings:

- **0**: the item's options carry the full price.
- **More than 0**: the item's price is the full price.

That covers most menus, but there is no way to say "pepperoni adds $2". Typing extras as options doesn't work either, because an option replaces the item's price instead of adding to it.

## Principles

- **The name works for any business.** These are called "Add-ons", not "Toppings". Food is the first kind of business, but bookstores, toy shops, and other retail come later (see [Business Types](#business-types-later)).
- **Add-ons always add on top.** `total = (chosen option's price, or the item's price if it has no options) + every add-on picked`. The existing 0-or-more rule for item prices doesn't change.
- **Made once, used by many items.** An add-on is created on its own page, never inside an item. Turning it off changes it everywhere it's used. Changing its default price changes it on every item that doesn't set its own price (see [Prices](#prices)).
- **We store the data; the client website decides how to use it.** Ordering rules, such as "pick up to 3", belong to the client website, not to the platform.

## Data Model

### AddOnGroup

One per heading on the Add-ons page, for example "Sauces", "Meats", or "Spice".

| Field                     | Notes                                                                           |
| ------------------------- | ------------------------------------------------------------------------------- |
| `id`, `locationId`        | Belongs to one location, like `Category`.                                       |
| `name`                    | Required. Unique within the location.                                           |
| `order`                   | Order on the Add-ons page, in the item picker, and on the client website.       |
| `syncGroupId`, `isSynced` | Same multi-location sync as categories (see [Sync](#sync-between-locations)).   |

### AddOn

| Field                     | Notes                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `groupId`           | Every add-on belongs to a group. There are no ungrouped add-ons.                                                                    |
| `name`                    | Required. Unique within its group.                                                                                                  |
| `price`                   | Required. The **default price**, `Decimal(10, 2)`, 0 or more. Items can set their own (see [Prices](#prices)).                      |
| `description`             | Optional. For example "Medium heat" or "Contains dairy".                                                                            |
| `calories`                | Optional. Only shown for food businesses (see [Business Types](#business-types-later)).                                             |
| `isAvailable`             | The "sold out" switch. Off keeps the add-on and its links, but hides it from the client website and dashboard where its being used. Saving an item keeps its links to hidden add-ons. |
| `order`                   | Order within its group.                                                                                                             |
| `syncGroupId`, `isSynced` | As above.                                                                                                                           |

### Links between items and add-ons

`Item` gets one new field: **`addOnsVaryByOption`** (Boolean, default `false`). It decides which of these two tables is used:

| Table             | Used when `addOnsVaryByOption` is… | Holds                                                                                                                              |
| ----------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `ItemAddOn`       | off                                | `itemId`, `addOnId`, `price` (optional), `order`. One add-on list for the whole item.                                              |
| `ItemOptionAddOn` | on                                 | `optionId`, `addOnId`, `price` (optional), `order`. A list for each option, for example pepperoni at $1 on Small and $2 on Large.  |

**Both sets stay saved, whatever the checkbox says.** The checkbox only decides which set is used. Switching it back never means re-entering prices.

- Rejected: deleting the unused set on save. Switching back would mean adding every add-on and price again, one by one.
- The dashboard, the Admin API, and the client website all read `addOnsVaryByOption` to choose a set, and ignore the other one.

### Prices

The add-on's `price` is its **default**. Each link (`ItemAddOn` and `ItemOptionAddOn`) has an optional `price` of its own:

- **Empty**: the item uses the add-on's default price, and follows it when the default changes.
- **Filled in**: the item uses its own price, and changing the default doesn't touch it.

For example, Extra Cheese defaults to $0.50. The Taco leaves its price empty and charges $0.50. The Burrito sets $1.00, because it gets more cheese. In the form, each price box shows the default greyed out as a hint, so only the prices that differ need typing.

- Rejected: copying the default into every link. Changing an add-on's price later would mean editing every item that uses it, one by one.

### What deleting does

| Deleted | What happens                                                      | Warning first                                                                                         |
| ------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Option  | Its `ItemOptionAddOn` rows are deleted (cascade).                 | None. The option is gone, so its prices go too.                                                       |
| Add-on  | Its `ItemAddOn` and `ItemOptionAddOn` rows are deleted (cascade). | "Used by N items." Suggests turning availability off instead, which keeps the add-on saved for later. |
| Group   | Its add-ons and all their links are deleted (cascade).            | Warn that any item using them will lose them.                                                         |
| Item    | Its links are deleted (cascade).                                  | Unchanged from today.                                                                                 |

Groups can be deleted, unlike categories. Categories use `onDelete: Restrict` because deleting one can take 10+ items off a client website's menu at once. Losing add-ons from items is much smaller, and the warning covers it.

## Dashboard

### Add-ons page

A **"View add-ons"** button on the location's Menu page opens one Add-ons page. Everything happens on that page, with no separate create or edit pages.

```
Add-ons                                       [Create group]
├─ ▼ Sauces                                   [Create add-on]
│     Ranch            $0.50
│     Buffalo          $0.75   Medium heat
│     Garlic           $0.50   Sold out
├─ ▶ Meats      (closed)
└─ ▶ Spice      (closed)
```

- Each group opens and closes.
- **Create add-on** opens a small form inside that group: name, price, description, and calories. Saving adds the new add-on to that group's list.
- Clicking an add-on edits it the same way, in place.
- Groups and the add-ons inside them can be reordered with the same move-up and move-down pattern as items.
- Who can manage add-ons: the same people who can manage the menu (owners and admins). Staff can view.

### Item form

A new **Add-ons** section in the item form. It belongs to the item, not to the options:

```
Add-ons
☐ Add-on prices vary by option

▼ Sauces   [Select all]
   ☑ Ranch   ☑ Buffalo   ☐ Garlic
▶ Meats
```

- **Checkbox off**: one picker for the whole item, in the item's Add-ons section, as above.
- **Checkbox on**: the item's picker is hidden, and each option card gets its own picker inside it.
- Each add-on picked has a price box beside it, empty by default (see [Prices](#prices)).
- **Select all** is only a shortcut. What's saved is each add-on picked, so an item can use just some of a group.
- While the checkbox is off and add-on prices for each option are saved, a light note shows under it: _"Add-on prices for each option are still saved. Turning this on will use them again."_
- Add-ons are sent with the item and saved in the same transaction as the item and its options (`lib/items/itemOptions.ts`). If any part fails, nothing is saved.

## Admin API and Client Website

The public menu response (`GET /api/business/menu`) gains add-ons on each item. The client website shouldn't have to know which table they came from, so the API returns them already resolved:

- **Checkbox off**: `item.addOnGroups`, the groups with the add-ons this item uses. Each add-on's `price` is already resolved: the item's own price if set, otherwise the default.
- **Checkbox on**: the same shape on each option, `option.addOnGroups`, with that option's prices.
- Unavailable add-ons and empty groups are left out. Order follows the group and add-on `order`.

The exact shape goes into the [API Reference](../src/data/apiReference.ts) when this is built.

## Business Types (later)

Not part of this build; recorded so the design leaves room for it.

- `Business` gets a **type**, for example food, bookstore, or toys.
- There is **one `Item` model** with extra optional fields. There is no table for each type, and routes stay the same. Fields that don't fit the type are hidden, and labels change: "Menu" becomes "Products", and "Add-ons" can read "Toppings" for food.
- Rejected: separate `Food`, `Toys`, and `BookStore` tables. Every feature, route, and form would have to be built once per type.
- Until types exist, `calories` on add-ons shows for everyone, the same as `calories` on items today.

## Sync Between Locations

Groups and add-ons sync like categories, with a shared `syncGroupId`.

- **Syncing a group** creates the same group on the business's other locations.
- **Add-ons inside a synced group** reach those locations only when the add-on itself is synced.
- **Each location can unsync an add-on** in a synced group. That makes it unique to that location. Syncing it again links it to the other locations, giving them that add-on too.
- **Synced items** map each add-on link to the add-on with the same `syncGroupId` on the other location. If that location has no matching add-on, the link is skipped there.
- **A location's own add-ons stay its own.** A synced item on a location can also use that location's unsynced add-ons. When the item is edited elsewhere, only links to synced add-ons are copied, so a location's own links are never wiped.
- An item's own add-on prices (see [Prices](#prices)) are copied with the synced links.

Example: location A has 3 synced add-ons that an item uses. Location B has the same 3, plus one of its own. B's copy of the item can use all 4, and A's uses the 3.

## Limits

None. The number of groups and add-ons doesn't depend on the billing tier, the same as items (see [billing-plan.md](./billing-plan.md): "Plans meter traffic and workspace extras, never data").

## Build Order

1. Schema: `AddOnGroup`, `AddOn`, `ItemAddOn` and `ItemOptionAddOn` (each with an optional `price`), and `Item.addOnsVaryByOption`. Bryan runs the migration.
2. API routes for groups and add-ons: create, edit, delete with the usage count, and move up and down.
3. A "View add-ons" button on the Menu page, then the Add-ons page.
4. The Add-ons section of the item form (per-option pickers inside each option card), saved in the item's transaction.
5. Add-ons in the public menu response and the API Reference.
6. Tests for each step, the same as the existing item and option tests.
