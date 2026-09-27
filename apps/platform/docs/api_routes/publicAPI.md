---
title: Public API
code-paths:
  - apps/platform/src/app/api/business/categories
  - apps/platform/src/app/api/business/contacts
  - apps/platform/src/app/api/business/locations
  - apps/platform/src/app/api/business/menu
  - apps/platform/src/app/api/business/socials
  - apps/platform/src/app/api/business

last-verified: 2026-09-26
status: planned
---

# Public API Routes

Used by custom business websites to read corresponding business data.

These routes should not add, update, or delete data in the database. Go to [docs/api_routes/adminAPI.md](../../docs/api_routes/adminAPI.md) to view the admin route documentation.

To view the full JSON return value types per route, go to [docs/api_routes/response/publicAPI.md](../../docs/api_routes/response/publicAPI.md).

## Authentication

Public business routes support two authentication methods.

### Dashboard Requests

Requests made by the authenticated platform dashboard use the logged-in user's Auth.js session.

The current business is determined from the authenticated user's business membership.

### Client Website Requests

External client websites must provide a valid Business Platform API key using the `Authorization` header:

```http
Authorization: Bearer bp_example_key
```

You can read more about creating your own Business Platform Api key via the POST request in [docs/api_routes/adminAPI.md#post-apiadminapi-keys](../../docs/api_routes/adminAPI.md#post-apiadminapi-keys) document.

### Sync Fields

These will only show up in the dashboards authenticated session requests. Not all request return these fields however when they do they will look like this:

```json
"syncGroupId": "UUID",
"isSynced": "Boolean"
```

This helps keep relavant records in sync when multiple locations contain the same record.

When a response includes these fields there will be a `SYNC` badge next to the path.

## Business

### GET /api/business

Fetches basic public business information by slug.

This route should only return the business model fields needed to identify and display the business. It should not return contacts, socials, locations, hours, or menu data.

#### Headers

| Key           | Type |
| ------------- | ---- |
| x-business-id | UUID |

#### Response

```json
{
  "id": "UUID",
  "name": "String",
  "slug": "String",
  "domain": "String | null",
  "createdAt": "DateTime",
  "updatedAt": "DateTime"
}
```

#### Used For

- Homepage business identity
- Header business name
- 404 page business name
- Basic business lookup before loading page-specific data

## Contacts

### GET /api/business/contacts `SYNC`

Fetches public contact information for a businesses location.

### Headers

| Key           | Type |
| ------------- | ---- |
| x-location-id | UUID |
| x-business-id | UUID |

#### Response

```json
{
  "contacts": [
    {
      "id": "UUID",
      "locationId": "UUID",
      "phoneNumber": "String | null",
      "email": "String | null",
      "isPersonal": "Boolean",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    }
  ]
}
```

#### Used For

- Contact page
- Footer contact information
- Click-to-call or email links

## Socials

### GET /api/business/socials `SYNC`

Fetches public social media links for a businesses location.

#### Headers

| Key           | Type |
| ------------- | ---- |
| x-location-id | UUID |
| x-business-id | UUID |

#### Response

```json
{
  "socials": [
    {
      "id": "UUID",
      "locationId": "UUID",
      "domain": "String",
      "profileName": "String",
      "url": "String",
      "icon": "String"
    }
  ]
}
```

#### Used For

- Footer social links
- Contact page social links
- Homepage social link section

## Locations

### GET /api/business/locations

Fetches all public locations for a business.

#### Headers

| Key           | Type |
| ------------- | ---- |
| x-business-id | UUID |

#### Response

```json
[
  {
    "id": "UUID",
    "address": "String",
    "zip": "String | null",
    "country": "String | null",
    "state": "String | null",
    "city": "String | null",
    "parking": "Boolean",
    "isActive": "Boolean",
    "enableHours": "Boolean",
    "createdAt": "DateTime",
    "updatedAt": "DateTime"
  }
]
```

#### Used For

- Location page
- Footer address information
- Homepage location section
- Map/address display

### GET api/business/locations/schedule

Fetches the schedule for the specified location in a business. Also provides the location info specified in the header.

#### Headers

| Key           | Type |
| ------------- | ---- |
| x-location-id | UUID |
| x-business-id | UUID |

### Response

```json
{
  "id": "UUID",
  "address": "String",
  "zip": "String",
  "country": "String",
  "state": "String",
  "city": "String",
  "parking": "Boolean",
  "isActive": "Boolean",
  "enabledHours": "Boolean",
  "createdAt": "DateTime",
  "updatedAt": "DateTime",
  "days": [
    {
      "id": "UUID",
      "locationId": "UUID",
      "dayOfWeek": "Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday",
      "isClosed": "Boolean",
      "createdAt": "DateTime",
      "updatedAt": "DateTime",
      "hour": {
        "id": "UUID",
        "regularDayId": "UUID",
        "openTime": "HH:MM",
        "closeTime": "HH:MM",
        "title": "String",
        "note": "String",
        "isDisabled": "Boolean",
        "createdAt": "DateTime",
        "updatedAt": "DateTime"
      },
      "specialHours": {
        "id": "UUID",
        "specialDayId": "UUID",
        "openTime": "HH:MM",
        "closeTime": "HH:MM",
        "title": "String",
        "note": "String",
        "isDisabled": "Boolean",
        "createdAt": "DateTime",
        "updatedAt": "DateTime"
      }
    }
  ]
}
```

## Categories

### GET /api/business/categories `SYNC`

Fetches all categories for a businesses location, including their subcategories.

#### Headers

| Key           | Type |
| ------------- | ---- |
| x-location-id | UUID |
| x-business-id | UUID |

#### Response

```json
{
  "categories": [
    {
      "id": "UUID",
      "locationId": "UUID",
      "name": "String",
      "description": "String | null",
      "order": "Int",
      "isVisible": "Boolean",
      "subcategories": [],
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    }
  ]
}
```

`subcategories` is the exact same as a category entry

#### Used For

- Category navigation
- Homepage category previews

### GET /api/business/categories/[categoryId] `SYNC`

Fetches the specified category, including its subcategory, items and item options.

NOTICE: If you want to get this data from all categories, please use [/api/business/menu](#get-apibusinessmenu-sync)
route.

#### Headers

| Key           | Type |
| ------------- | ---- |
| x-location-id | UUID |
| x-business-id | UUID |

### Response

```json
{
  "categories": [
    {
      "id": "UUID",
      "locationId": "UUID",
      "name": "String",
      "description": "String | null",
      "order": "Int",
      "isVisible": "Boolean",
      "items": [
        {
          "id": "UUID",
          "locationId": "UUID",
          "categoryId": "UUID",
          "name": "String",
          "description": "String | null",
          "containsList": "String[]",
          "calories": "Int",
          "price": "String",
          "order": "Int",
          "isAvailable": "Boolean",
          "slug": "String",
          "imageKey": "String",
          "createdAt": "DateTime",
          "updatedAt": "DateTime",
          "options": [
            {
              "id": "UUID",
              "itemId": "UUID",
              "name": "String",
              "price": "String",
              "order": "Int",
              "isAvailable": "Boolean",
              "createdAt": "DateTime",
              "updatedAt": "DateTime"
            }
          ]
        }
      ],
      "subcategories": [],
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    }
  ]
}
```

`subcategories` is the exact same as a category entry

#### Used For

- After category selection
- Rendering data from the selected category

## Menu

### GET /api/business/menu `SYNC`

Fetches all categories, their subcategories, and items with their options.

This route returns the menu in full because the public menu page usually needs the full menu tree.

NOTICE: If you only need one of the categories, please use [/api/business/categories/\[categoryId\]](#get-apibusinesscategoriescategoryid-sync)

#### Headers

| Key           | Type |
| ------------- | ---- |
| x-location-id | UUID |
| x-business-id | UUID |

#### Response

```json
{
  "categories": [
    {
      "id": "UUID",
      "locationId": "UUID",
      "name": "String",
      "description": "String | null",
      "order": "Int",
      "isVisible": "Boolean",
      "items": [
        {
          "id": "UUID",
          "locationId": "UUID",
          "categoryId": "UUID",
          "name": "String",
          "description": "String | null",
          "containsList": "String[]",
          "calories": "Int",
          "price": "String",
          "order": "Int",
          "isAvailable": "Boolean",
          "slug": "String",
          "imageKey": "String",
          "createdAt": "DateTime",
          "updatedAt": "DateTime",
          "options": [
            {
              "id": "UUID",
              "itemId": "UUID",
              "name": "String",
              "price": "String",
              "order": "Int",
              "isAvailable": "Boolean",
              "createdAt": "DateTime",
              "updatedAt": "DateTime"
            }
          ]
        }
      ],
      "subcategories": [],
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    }
  ]
}
```

`subcategories` is the exact same as a category entry

#### Used For

- Single page with full menu data (categories, subcategories, items, itemOptions)
- Render all categories

## Menu Item

NOTICE: This API path is currently being worked on and is therefor disabled. Planned to work with a location slug, category slug, and item slug for easier look up.

### GET /api/business/menu/items/[itemId]

Fetches one public menu item by its itemId.

This route is only needed if the public business site has individual item detail pages.

#### Required Route Params

| Param    | Type   | Example   |
| -------- | ------ | --------- |
| itemSlug | string | each-taco |

#### Response

- [Item](../../../../packages/database/docs/database-models.md#item)
  - [ItemOptions](../../../../packages/database/docs/database-models.md#itemoptions)

#### Used For

- Public item detail page
- Shareable item links
- SEO-friendly item pages
