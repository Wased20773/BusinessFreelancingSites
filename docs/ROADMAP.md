---
title: ROADMAP

last-verified: 2026-9-18
status: planned
---

# Road Map For MVP Completion

This is a high-level overview of all the requirements that must be meet for the MVP to be complete. Each card will be organized by month and with their expected completion dates.

## July

Primary goal:

> Complete and test the backend so the frontend can begin development in August.

### API

- [x] Finish remaining public routes (locations)
- [x] Seed realistic demo data (roles, users, categories, items, locations, etc.)
- [x] Verify response consistency through documentation
- [x] Document both response and body strucutres for both public and admin routes
- [x] Test edge cases

### Backend Images

- [x] Configure S3 bucket
- [x] Validate connection with S3 bucket with backend platform
- [x] Create image upload route using multipart/form-data
- [x] Create image replace route (deletes previous S3 image after a successful replacement)
- [x] Create image removal route
- [x] Return image URLs from public routes
- [x] Convert images to webp unless original is smaller
- [x] Preserve transparency from images
- [x] Support URL Versioning for frontend (backend sends imageKey + updatedAt)

### Testing

- [x] Test every public API endpoint
- [x] Test every admin API endpoint
- [x] Test image upload/type/size(2MB), replacement, removal, and failure handling
- [x] Test authentication and authorization
- [x] Test validation and error response

### DOCS

- [x] Update API documents for correctness of any new issues

## August

Primary goal:

> Complete the frontend for the platform so business owners and other users can manage or view their business through a usable dashboard.

- [x] Build the login flow

### App Foundation

- [x] Build the Account/Workspace/Dashboard layout
- [x] Add sidebar navigation
- [x] Add loading states
- [x] Add error states
- [x] Add empty states

### App Pages

- [x] Account: Build Account page
- [x] Workspace: Build Business users page
- [x] Workspace: Build Business API Key management page
- [x] Workspace: Build Business settings page
- [x] Dashboard: Build Menu UI
- [x] Dashboard: Build item UI
- [x] Dashboard: Build item options UI
- [x] Dashboard: Build contacts page
- [x] Dashboard: Build socials page
- [x] Dashboard: Build locations page
- [x] Dashboard: Build days/hours management UI
- [x] Overview page for workspace and dashboard

### Frontend API Integration

- [x] Connect dashboard pages to Admin API
- [x] Implement record synchronization across locations
- [x] Add create/update/delete flows
- [x] Add reorder flows
- [x] Add image upload
- [x] Add form validation
- [x] Add success/error feedback
- [x] Integrate Auth.js for session authentication

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
