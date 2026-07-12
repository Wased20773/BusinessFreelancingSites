---
title: ROADMAP

last-verified: 2026-7-10
status: draft
---

# Road Map For MVP Completion

This is a high-level overview of all the requirements that must be meet for the MVP to be complete. Each card will be organized by month and with their expected completion dates.

## July

Primary goal:

> Complete and test the backend so the frontend can begin development in August.

### API

- [x] Finish remaining public routes (locations)
- [x] Seed realistic demo data (roles, users, categories, items, locations, etc.)
- [ ] Verify response consistency through documentation
- [ ] Document both response and body strucutres for both public and admin routes
- [ ] Test edge cases

### Backend Images

- [ ] Configure S3 bucket
- [ ] Configure CloudFront image delivery
- [ ] Create image upload route using multipart/form-data
- [ ] Create image replace route (deletes previous S3 image after a successful replacement)
- [ ] Create image removal route
- [ ] Return image URLs from public routes

### Testing

- [ ] Test every public API endpoint
- [ ] Test every admin API endpoint
- [ ] Test image upload/type/size(2MB), replacement, removal, and failure handling
- [ ] Test authentication and authorization
- [ ] Test validation and error response

### DOCS

- [ ] Update API documents for correctness of any new issues

## August

Primary goal:

> Complete the frontend for the platform so business owners can manage their business through a usable dashboard.

### Platform Website

- [ ] Build the public landing page
- [ ] Build the login/onboarding flow
- [ ] Add business search
- [ ] Add business creation flow for new clients

### Dashboard Foundation

- [ ] Build the dashboard layout
- [ ] Add sidebar navigation
- [ ] Add protected routes
- [ ] Add loading states
- [ ] Add error states
- [ ] Add empty states

### Dashboard Pages

- [ ] Build account management page
- [ ] Build business management page
- [ ] Build business users page
- [ ] Build categories page
- [ ] Build items page
- [ ] Build item options UI
- [ ] Build contacts page
- [ ] Build socials page
- [ ] Build locations page
- [ ] Build hours management UI

### Frontend API Integration

- [ ] Connect dashboard pages to Admin API
- [ ] Add create/update/delete flows
- [ ] Add reorder flows
- [ ] Add image upload UI
- [ ] Add form validation
- [ ] Add success/error feedback

### Frontend Testing

- [ ] Test key dashboard pages
- [ ] Test forms with Vitest + React Testing Library
- [ ] Test loading and error states
- [ ] Test protected route behavior

### Deployment

- [ ] Deploy the Platform app to Vercel
- [ ] Connect the production Postgres database
- [ ] Configure the S3 image bucket
- [ ] Configure CloudFront image delivery
- [ ] Configure production

## September

By this point, clients can begin to onboard their business information, add their users, menu related data, and other business metadata. For the MVP, there is no invitation onboarding system (yet).

Primary Goal:

> Complete first client (demo) business website.

No current task...