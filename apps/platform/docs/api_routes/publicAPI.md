---
title: Public API
code-paths:
  - apps/platform/app/api/business/route.ts
  - apps/platform/app/api/business/menu/route.ts
  
last-verified: 2026-06-25
status: draft
---

# Public API Routes

Used by custom business website to read corresponding business data.

These routes should not add/update/delete the data in the database. To view how data modifications through routes, go to [adminAPI.md](./adminAPI.md)

To view the full JSON return value types per route, go to [docs\api_routes\response\publicAPI.json](../api_routes/response/publicAPI.md)

## GET /api/business (ROUTE #1)

Fetches general business information by slug.

### Query Params

| Param | Type | Required | Example |
| --- | --- | --- | --- |
| slug | string | yes | tacos-el-guero |

### Returns

- Business id
- Business name
- Business slug
- Domain
- [Contact](../../../../packages/database/docs/database-models.md#contact)
- [Social](../../../../packages/database/docs/database-models.md#social)
- [Location](../../../../packages/database/docs/database-models.md#location)
    - [LocationHour](../../../../packages/database/docs/database-models.md#locationhour)

### Used For

- Homepage
- Contact page
- Location page
- Footer business info
- potentially 404 page

## GET /api/business/menu (ROUTE #2)

Fetches public menu data for a business.

### Query Params

| Param | Type | Required | Example |
| --- | --- | --- | --- |
| slug | string | yes | tacos-el-guero |

### Returns

- Business id
- Business name
- Business slug
- [Category](../../../../packages/database/docs/database-models.md#category)
- [Item](../../../../packages/database/docs/database-models.md#item)
    - [ItemOptions](../../../../packages/database/docs/database-models.md#itemoptions)

### Used For

- Public menu page
    - potentially separate page per items
- Showcasing item in homepage

# Notes
