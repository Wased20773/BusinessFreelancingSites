---
title: Animations
code-path:
  - /platform/src/app/page.tsx

last-verified: 2026-11-14
status: planned
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

## Not Yet Built

Motion is not installed yet. When work starts:

1. Install it in the platform app: `npm install motion --workspace=apps/platform`.
2. Add `MotionConfig` with `reducedMotion="user"` near the root layout.
3. Start with the Menu tab's loading skeleton, then the homepage.
