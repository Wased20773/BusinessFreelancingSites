---
title: Admin API
code-paths:
  - 
  
last-verified: 2026-06-26
status: draft
---

# Admin API Routes

Used by the platform admin dashboard to create, update, and delete business data.

These routes should require authentication and business access checks later.

To view the full JSON return values per route, go to [docs\api_routes\response\publicAPI.json](../api_routes/response/adminAPI.md)

## GET /api/admin/business

Fetches editable business data for the logged-in admin.

### Returns

- Business info
- Contacts
- Socials
- Locations
- Hours

## PATCH /api/admin/business

Updates business-level information.

### Can Update

- Business name
- Domain
- Contact info
- Social links
- Location info
- Location hours

## GET /api/admin/categories

Fetches categories for the current business.

### Returns

- Category id
- Name
- Description
- Order
- Visibility

## POST /api/admin/categories

Creates a new category.

### Body

- name
- description
- order
- isVisible

## PATCH /api/admin/categories

Updates an existing category.

### Body

- id
- name
- description
- order
- isVisible

## DELETE /api/admin/categories

Deletes a category.

### Body

- id

## GET /api/admin/items

Fetches items for the current business.

### Returns

- Item id
- Category id
- Name
- Description
- Contains list
- Calories
- Price
- Options
- Order
- Availability
- Slug
- Image key

## POST /api/admin/items

Creates a new menu item.

### Body

- categoryId
- name
- description
- containsList
- calories
- price
- order
- isAvailable
- imageKey
- options

## PATCH /api/admin/items

Updates an existing item.

### Body

- id
- categoryId
- name
- description
- containsList
- calories
- price
- order
- isAvailable
- imageKey
- options

## DELETE /api/admin/items

Deletes an item.

### Body

- id

# Notes