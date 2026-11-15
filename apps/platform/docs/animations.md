---
title: Animations
code-path:
  - /platform/src/components/motion/MotionProvider.tsx
  - /platform/src/components/motion/listMotion.ts
  - /platform/src/components/ui/Skeleton.tsx
  - /platform/src/components/ui/categories/CategoryPageSkeleton.tsx
  - /platform/src/components/ui/FormPageSkeleton.tsx
  - /platform/src/components/ui/locations/LocationPageSkeleton.tsx
  - /platform/src/components/ui/overview/OverviewSkeleton.tsx
  - /platform/src/components/ui/ListCard.tsx
  - /platform/src/components/ui/DetailPageSkeleton.tsx
  - /platform/src/components/ui/billing/BillingPageSkeleton.tsx
  - /platform/src/components/ui/businesses/WorkspaceOverviewSkeleton.tsx
  - /platform/src/app/page.tsx

last-verified: 2026-11-14
status: in-progress
---

# Animations

## Overview

The platform uses animation to make it feel smooth and responsive, not to decorate it. An animation should either show the user what changed (an item was added, a modal opened) or cover a wait (data is loading).

All animation uses **Motion**, the free and open-source `motion` package (formerly Framer Motion). We do not use **Motion+**, the paid add-on with premium components and examples. Everything listed below can be built with the free package.

Simple effects such as hover states and colour changes stay in Tailwind (including `tw-animate-css`, which is already installed). Use Motion when an animation depends on state, needs to play when something leaves the page, or moves elements between layouts.

## Where Animation Is Used

### Homepage (`/`)

The homepage presents the app to new visitors. It can use the most motion of any page:

- Sections and screenshots fade and slide into view as the user scrolls.
- Features are revealed one after another (staggered).
- Calls to action can have small hover and press effects.

### Loading states

When a page is loading its data, the user sees a **skeleton**: grey placeholder blocks in the shape of the content that is coming, with a soft pulse. When the data arrives, the real content animates in where the placeholders were.

Example: opening the **Menu** tab shows placeholder rows for the categories and items. Once the menu loads, the rows fade in one after another.

This combines two things:

1. **Next.js loading UI.** A `loading.tsx` file in the route folder, or a `<Suspense>` boundary around the part of the page that waits on data, renders the skeleton.
2. **Motion** animates the content in when it replaces the skeleton.

Skeletons should match the size and layout of the real content, so the page doesn't jump when it loads.

### In-app transitions

- **Tabs and pages:** content fades in when switching dashboard tabs.
- **Modals and dropdowns:** open and close with a short fade and scale, including the exit animation.
- **Lists:** items animate when added, removed, or reordered (item options, menu order, members). Motion's `layout` and `AnimatePresence` handle this.

## Guidelines

- **Respect reduced motion.** Users who turn on "reduce motion" in their system settings must get little or no movement. Wrap the app in `<MotionConfig reducedMotion="user">` so Motion follows the system setting automatically.
- **Keep it short.** Most in-app animations should take 150–300 ms. Longer animations belong on the homepage only.
- **Never block the user.** An animation must not delay a click, a form submit, or navigation.
- **Animate opacity and transform.** Fading, moving, and scaling stay smooth on phones. Avoid animating width, height, or margins where possible.
- **Client components only.** Motion components need `"use client"`. Keep data fetching in server components and put the animated part in a small client component.
- **Import from `motion/react`.** For example: `import { motion, AnimatePresence } from "motion/react";`

## Building Blocks

| Piece | What it does |
| --- | --- |
| `MotionProvider` | Wraps the app in the root layout with `<MotionConfig reducedMotion="user">`. |
| `Skeleton` / `SkeletonRows` | Grey pulsing placeholders. `SkeletonRows` matches the height of a list card's rows. |
| `listRowMotion(index)` | Spread onto `motion.li` or `motion.tr`. Rows fade and rise in one after another (capped at 8 rows, so long lists still appear quickly) and slide to their new spot when reordered. |
| `fadeInMotion` | Fades a section in once its data has loaded. |
| `cardMotion(index)` | Spread onto a dashboard card. Cards fade and rise in one after another. |
| `DetailPageSkeleton` | Placeholder for a page showing one record: heading, a card split into sections of label/value pairs (`sections={[4, 1, 2]}`), and an optional red danger zone. |
| `motion.create(Link)` | Use for list rows that are links (API keys, members), so the `Link` itself animates. |
| `FormPageSkeleton` | Placeholder for an edit or create page: heading, a form card built from a list of field kinds (`input`, `textarea`, `checkbox`, `image`, `rows`, `day`), and the button bar. |

Pages that load their data in the browser keep two separate flags:

- `isFetching`: the page's data is loading. Shows the skeleton.
- `isLoading`: a link was clicked and the next page is opening. Shows the existing loading bar.

## Status

### Done

- **Menu** (`/menu`): category rows show as skeletons while loading, then animate in. Reordering slides the rows.
- **Category and subcategory pages**: a full-page skeleton in the same layout as the page, then the page fades in. Item and subcategory rows animate in and slide when reordered.
- **Edit category, edit subcategory, and edit item**: a form skeleton (`FormPageSkeleton`) with the same fields as the real form, then the form fades in.
- **Create category, create subcategory, and create item**: the same form skeleton while the page loads what it needs (the next order number and the category's sync setting), then the form fades in. Submitting keeps the form on screen.

- **Contacts and Socials**: skeleton rows on the list, rows animate in (`ListCard` takes an `index`), and form skeletons on the edit and create pages. The create pages have nothing to load, so their skeleton covers the session check.
- **Location**: a page skeleton (`LocationPageSkeleton`) on the first load only, so the page stays on screen while it reloads after business days are turned on or removed. Form skeletons on Edit Location and Edit Business Days (the `day` field kind), then the form fades in.
- **Overview**: the heading shows straight away, the cards are skeletons (`OverviewSkeleton`), then the four cards fade and rise in one after another (`cardMotion`).

- **Workspace**:
  - **Overview**: the heading shows straight away, then the Business and Workspace Summary cards come in one after another (`WorkspaceOverviewSkeleton`).
  - **API Keys and Members**: the header and actions show straight away; the list and its count are skeletons, then the rows come in one after another. Rows added by Members' "Load More" stagger as their own group.
  - **API key and member details**: a details skeleton (`DetailPageSkeleton`) including the red danger zone, then the page fades in.
  - **Billing**: a skeleton of the current plan, the four plans, and location slots (`BillingPageSkeleton`), then those three come in one after another.
  - **Settings**: a details skeleton, then the page fades in.
  - **Create API Key, Add Member, and Access Levels**: nothing to load, so a skeleton covers the session check. The "key created" screen and each Add Member search result fade in.
  - **API Reference** is static and has nothing to animate.

### Next

- Modals and dropdowns.
- The homepage (`/`).
