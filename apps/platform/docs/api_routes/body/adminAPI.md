---
title: Admin API
code-paths:
  - \platform\src\api\admin\account
  - \platform\src\api\admin\business-user
  - \platform\src\api\admin\categories
  - \platform\src\api\admin\contacts
  - \platform\src\api\admin\items\[itemId]
  - \platform\src\api\admin\locations
  - \platform\src\api\admin\socials

last-verified: 2026-07-14
status: planned
---

# Admin API JSON Body Structure

## Account

### GET /api/admin/account

No request body.

### GET /api/admin/account/search?email

No request body.

### PATCH /api/admin/account

```json
{
    "name": "String | null",
    "username": "String | null"
}
```

### PATCH /api/admin/account/email (DEPRECATED)

```json
{
    "newEmail": "String",
    "password": "String"
}
```

### PATCH /api/admin/account/password (DEPRECATED)

```json
{
    "currentPassword": "String",
    "newPassword": "String"
}
```

## Business Users

### GET /api/admin/business-users

No request body.

### POST /api/admin/business-users

```json
{
    "email": "String",
    "accessLevel": "owner | admin | staff"
}
```

### PATCH /api/admin/business-users/[businessUserId]

```json
{
    "accessLevel": "owner | admin | staff"
}
```

### DELETE /api/admin/business-users/[businessUserId]

No request body.

## Categories

### POST /api/admin/categories

```json
{
    "name": "String",
    "description": "String | null"
}
```

### POST /api/admin/categories/[categoryId]/subcategory

```json
{
    "name": "String",
    "description": "String | null"
}
```

### PATCH /api/admin/categories/[categoryId]

```json
{
    "name": "String",
    "description": "String | null",
    "isVisible": "Boolean"
}
```

### PATCH /api/admin/categories[categoryId]/move-up

No request body.

### PATCH /api/admin/categories[categoryId]/move-down

No request body.

### DELETE /api/admin/categories/[categoryId]

No request body.

## Category Items

### POST /api/admin/categories/[categoryId]/items

```json
{
    "name": "String",
    "description": "String | null",
    "containsList": "String[]",
    "calories": "Int | null",
    "price": "Decimal | null",
    "isAvailable": "Boolean",
    "slug": "String",
    "imageKey": "String"
}
```

## Items

### PATCH /api/admin/items/[itemId]

```json
{
    "name": "String",
    "description": "String | null",
    "containsList": "String[]",
    "calories": "Int | null",
    "price": "Decimal | null",
    "isAvailable": "Boolean"
}
```

### PATCH /api/admin/items/[itemId]/image

(NOT VERIFIED YET)

```txt
multipart/form-data

image: File
```

### DELETE /api/admin/items/[itemId]

No request body.

## Item Options

### POST /api/admin/items/[itemId]/options

```json
{
    "name": "String",
    "price": "Decimal"
}
```

### PATCH /api/admin/items/[itemId]/options/[optionId]

```json
{
    "name": "String",
    "price": "Decimal",
    "isAvailable": "Boolean"
}
```

### PATCH /api/admin/items/[itemId]/options/[optionId]/move-up

No request body.

### PATCH /api/admin/items/[itemId]/options/[optionId]/move-down

No request body.

### DELETE /api/admin/items/[itemId]/options/[optionId]

No request body.

## Contacts

### POST /api/admin/contacts

```json
{
    "phoneNumber": "String | null",
    "email": "String | null",
    "isPersonal": "Boolean"
}
```

### PATCH /api/admin/contacts/[contactId]

```json
{
    "phoneNumber": "String | null",
    "email": "String | null",
    "isPersonal": "Boolean"
}
```

### DELETE /api/admin/contacts/[contactId]

No request body.

## Socials

### POST /api/admin/socials

```json
{
    "name": "String",
    "profileName": "String",
    "icon": "String"
}
```

### PATCH /api/admin/socials/[socialId]

```json
{
    "name": "String",
    "profileName": "String",
    "icon": "String"
}
```

### DELETE /api/admin/socials/[socialId]

No request body.

## Locations

### POST /api/admin/locations

```json
{
    "address": "String",
    "zip": "String | null",
    "country": "String | null",
    "state": "String | null",
    "city": "String | null",
    "parking": "Boolean"
}
```

### PATCH /api/admin/locations/[locationId]

```json
{
    "address": "String",
    "zip": "String | null",
    "country": "String | null",
    "state": "String | null",
    "city": "String | null",
    "parking": "Boolean",
    "isActive": "Boolean",
    "enableHours": "Boolean"
}
```

### DELETE /api/admin/locations/[locationId]

No request body.

## Location Days

### POST /api/admin/locations/[locationId]/days

```json
{
    "dayOfWeek": "Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday"
}
```

### PATCH /api/admin/locations[locationId]/days/[dayId]

```json
{
    "isClosed": "Boolean"
}
```

### DELETE /api/admin/locations/[locationId]/days/[dayId]

No response body.

## Location Hours

### POST /api/admin/locations/[locationId]/days/[dayId]/hours

```json
{
    "openTime": "String",
    "closeTime": "String",
    "title": "String | null",
    "note": "String | null"
}
```

### PATCH /api/admin/locations/[locationId]/days/[dayId]/hours/[hourId]

```json
{
    "openTime": "String | null",
    "closeTime": "String | null",
    "title": "String | null",
    "note": "String | null",
    "isDisabled": "Boolean"
}
```

### DELETE /api/admin/locations/[locationId]/days/[dayId]/hours/[hourId]

No request body.
