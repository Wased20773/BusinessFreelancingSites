---
title: Public API
code-paths:
  - apps/platform/src/app/api/business/route.ts
  - apps/platform/src/app/api/business/contacts/route.ts
  - apps/platform/src/app/api/business/socials/route.ts
  - apps/platform/src/app/api/business/categories/route.ts
  - apps/platform/src/app/api/business/locations/route.ts
  - apps/platform/src/app/api/business/menu/route.ts
  - apps/platform/src/app/api/business/menu/items/[itemSlug]/route.ts
last-verified: 2026-06-29
status: draft
---

# Public API Routes

Used by custom business websites to read corresponding business data.

These routes should not add, update, or delete data in the database. Go to [docs\api_routes\adminAPI.md](../../docs/api_routes/adminAPI.md) to view the admin route documentation.

To view the full JSON return value types per route, go to [docs\api_routes\response\publicAPI.md](../../docs/api_routes/response/publicAPI.md).

## Business

### GET /api/business

(1 OPERATION)

Fetches basic public business information by slug.

This route should only return the business model fields needed to identify and display the business. It should not return contacts, socials, locations, hours, or menu data.

#### Query Params

| Param | Type | Required | Example |
| --- | --- | --- | --- |
| slug | string | yes | tacos-el-guero |

#### Returns

- Business id
- Business name
- Business slug
- Domain

#### Used For

- Homepage business identity
- Header business name
- 404 page business name
- Basic business lookup before loading page-specific data

## Contacts

### GET /api/business/contacts

(2 OPERATIONS)

Fetches public contact information for a business.

#### Query Params

| Param | Type | Required | Example |
| --- | --- | --- | --- |
| slug | string | yes | tacos-el-guero |

#### Returns

- [Contact](../../../../packages/database/docs/database-models.md#contact)

#### Used For

- Contact page
- Footer contact information
- Click-to-call or email links

## Socials

### GET /api/business/socials

(2 OPERATIONS)

Fetches public social media links for a business.

#### Query Params

| Param | Type | Required | Example |
| --- | --- | --- | --- |
| slug | string | yes | tacos-el-guero |

#### Returns

- [Social](../../../../packages/database/docs/database-models.md#social)

#### Used For

- Footer social links
- Contact page social links
- Homepage social link section

## Locations

### GET /api/business/locations

(3 OPERATIONS)

Fetches active public locations for a business, including each location's hours.

#### Query Params

| Param | Type | Required | Example |
| --- | --- | --- | --- |
| slug | string | yes | tacos-el-guero |

#### Returns

- [Location](../../../../packages/database/docs/database-models.md#location)
  - [LocationHour](../../../../packages/database/docs/database-models.md#locationhour)

#### Used For

- Location page
- Footer address information
- Homepage location section
- Map/address display
- Business hours display

## Categories

### GET /api/business/categories

(2 OPERATIONS)

Fetches all visible categories for a business.

#### Query Params

| Param | Type | Required | Example |
| --- | --- | --- | --- |
| slug | string | yes | tacos-el-guero |

#### Returns

- [Category](../../../../packages/database/docs/database-models.md#category)

#### Used For

- Public menu page
- Category navigation
- Homepage category previews

## Menu

### GET /api/business/menu

(4 OPERATIONS)

Fetches public menu data for a business.

This route returns categories, items, and item options because the public menu page usually needs the full menu tree.

#### Query Params

| Param | Type | Required | Example |
| --- | --- | --- | --- |
| slug | string | yes | tacos-el-guero |

#### Returns

- [Category](../../../../packages/database/docs/database-models.md#category)
- [Item](../../../../packages/database/docs/database-models.md#item)
  - [ItemOptions](../../../../packages/database/docs/database-models.md#itemoptions)

#### Used For

- Public menu page
- Homepage featured menu section
- Menu category sections

## Menu Item

### GET /api/business/menu/items/[itemSlug]

(2 OPERATIONS)

Fetches one public menu item by its item slug.

This route is only needed if the public business site has individual item detail pages.

#### Query Params

| Param | Type | Required | Example |
| --- | --- | --- | --- |
| slug | string | yes | tacos-el-guero |

#### Route Params

| Param | Type | Required | Example |
| --- | --- | --- | --- |
| itemSlug | string | yes | each-taco |

#### Returns

- [Item](../../../../packages/database/docs/database-models.md#item)
  - [ItemOptions](../../../../packages/database/docs/database-models.md#itemoptions)

#### Used For

- Public item detail page
- Shareable item links
- SEO-friendly item pages
