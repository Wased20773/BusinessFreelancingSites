---
title: MVP

last-verified: 2026-09-23
status: planned
---

# Minimal Viable Product

## The Problem It Solves

Developers and business members are constantly having to communicate back and forth over simple business changes. A new social profile is created, contact information changes, or a new product needs to be added. These small updates can become tedious, and they shouldn't have to be.

The Business Platform helps solve this by creating a collaborative experience for developers, business owners, administrators, and staff. Developers can focus on building and maintaining the client website, while the business controls the information presented on it.

When something needs to be updated, the business no longer has to contact a developer for every change. Instead, authorized users can manage their information directly through the platform, while the client website reflects that data. This reduces unnecessary communication and workload, allowing everyone to focus on the work that matters most.

## Platform Architecture

Each business can have a custom-built client website with its own design, branding, domain, and page structure. WHile these websites are developed independently, they connect to the same shared Business Platform backend to retrieve the business data they need.

Client websites access the data through a Business Platform API Key generated from the business workspace. API keys are managed by users with developer access and allow the platform to identify the business making the request.

Business owners and other authorized users manage their business data through the Business Platform dashboard or workspace. Authentication is handled through Auth.js with Google available as the initial authentication provider and support for additional providers planned after the MVP.

## Application Structure

- **Shared platform:** One Next.js application contains the account, workspace, dashboard, authentication, Route Handlers, and Prisma database access.
- **Custom client website:** Each business can have their own unique business design needs and loading information from the same shared system using only their datasets via the Business Platform API Key.
- **Shared database:** One PostgreSQL database stores data for all businesses.

## Basic Workflow

![Basic workflow diagram](./images/basic-dashboard-workflow.svg)

## Initial Scope

- One shared PostgreSQL database
- One shared platform (Workspace & Dashboard)
- Account management
- Auth.js authentication
- Business Api Key
  - Enable CORS as a security feature to prevent CSRF attacks (developer sets the allowedOrigins)
- Editable menu, prices, hours, locations, contacts, socials, images, and more
- location based
  - Every business has at least one location and each location holds its own data (showed be either shared across all locations or not)
- First custom client website: Tacos El Guero

## Out of Scope

- Browser-level end-to-end testing
- More user roles
- Custom per-business database schemas
- Onboarding clients via invitation
  - Adding new database entry
- Logging service like Sentry, Logtail, Datadog, etc.
  - For checking issues from clients from a deeper perspective
- For client business app, determining travel time to reach business location (calculated in api)
- 3rd-party integration
  - UberEats
  - DoorDash
  - Grubhub
- Viewing of api request logging for developers
  - date and time accesses, method, path, status, security, origin, location
- chatrooms for collaborative sessions
  - calls are probably unnecessary here
