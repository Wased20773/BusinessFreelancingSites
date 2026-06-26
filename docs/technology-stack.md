---
title: Technology Stack

last-verified: 2026-06-25
status: planned
---

# Technology Stack

| Technology | Area | Purpose |
| --- | --- | --- |
| React | Interface Library | Builds reusable components and interactive interfaces for both public websites and the admin dashboard. |
| TypeScript | Language | Adds type safety across frontend, backend, database access, forms, and shared data models. Increases scalability. |
| Tailwind CSS | Styling | Supports fast custom UI development without forcing every client site to use the same design. |
| Next.js | Framework | Used for every custom client website and for the shared platform. It provides React, routing, server-side capabilities, Route Handlers, and production-ready page rendering. |
| Axios | HTTP Client | Sends requests from frontend/client components to backend API routes. Useful for fetching business data, submitting admin forms, and handling requests/response errors cleanly. |
| PostgreSQL | Database | Stores business entries, phone #’s, users, menus, hours, locations, media references, and other structured data a business would require. |
| Prisma | ORM (Object-Relational Mapping) | Defines the database schema, runs migrations, and provides typed database queries. |
| Auth.js | Authentication | Handles administration sign-in and protected sessions. |
| Zod | Validation | Validates form data and server requests before information reaches the database. |
| React Hook Form | Forms | Manages admin forms, including validation messages and editing workflows. |
| Vitest + React Testing Library | Testing | Test form behavior, and React components. Browser-level testing (Playwright) can be added later if needed. |
| npm | Package Manager | Manages dependencies. |
| GitHub | Version Control | Stores source code and tracks changes. |
