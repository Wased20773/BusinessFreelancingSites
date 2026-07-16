---
title: Admin API
code-paths:
  - /platform/src/api/admin/account
  - /platform/src/api/admin/business-user
  - /platform/src/api/admin/categories
  - /platform/src/api/admin/contacts
  - /platform/src/api/admin/items/[itemId]
  - /platform/src/api/admin/locations
  - /platform/src/api/admin/socials

last-verified: 2026-07-15
status: planned
---


# Admin API JSON Response Structure

## Response Rules

POST routes return the newly created record.

PATCH routes return the updated record so the frontend can update local state without refetching the full page data.

DELETE routes return a small confirmation object instead of the full deleted model.

## Account

### GET /api/admin/account

```json
{
    "id": "UUID",
    "user": {
        "id": "UUID",
        "name": "String | null",
        "username": "String | null",
        "email": "String",
        "image": "String",
        "createdAt": "DateTime",
        "updatedAt": "DateTime"
    },
    "role": {
        "accessLevel": "owner | admin | staff",
        "description": "String"
    }
}
```

### GET /api/admin/account/search?email

```json
{
    "id": "UUID",
    "name": "String | null",
    "username": "String | null",
    "email": "String",
    "emailVerified": "String",
    "image": "String | null",
    "createdAt": "DateTime"
}
```

### PATCH /api/admin/account

```json
{
    "id": "UUID",
    "name": "String | null",
    "username": "String | null",
    "updatedAt": "DateTime"
}
```

### PATCH /api/admin/account/email (DEPRECATED)

```json
{
    "email": "String",
    "updatedAt": "DateTime"
}
```

### PATCH /api/admin/account/password (DEPRECATED)

```json
{
    "message": "String",
    "updatedAt": "DateTime"
}
```

## Business Users

### GET /api/admin/business-users

```json
[
    {
        {
            "id": "UUID",
            "businessId": "UUID",
            "userId": "UUID",
            "roleId": "UUID",
            "user": {
                "id": "UUID",
                "name": "String | null",
                "username": "String | null",
                "email": "String"
            },
            "role": {
                "id": "UUID",
                "accessLevel": "owner | admin | staff",
                "description": "String"
            }
        }
    }
]
```

### POST /api/admin/business-users

```json
{
    "id": "UUID",
    "user": {
        "updatedAt": "DateTime"
    },
    "role": {
        "accessLevel": "owner | admin | staff",
        "description": "String"
    }
}
```

### PATCH /api/admin/business-users/[businessUserId]

```json
{
    "id": "UUID",
    "role": {
        "accessLevel": "owner | admin | staff",
        "description": "String"
    }
}
```

### DELETE /api/admin/business-users/[businessUserId]

```json
{
    "message": "String"
}
```

## Categories

### POST /api/admin/categories

```json
{
    "id": "UUID",
    "name": "String",
    "description": "String | null",
    "order": "Int",
    "isVisible": "Boolean",
    "createdAt": "DateTime",
    "updatedAt": "DateTime"
}
```

### POST /api/admin/categories/[categoryId]/subcategory

```json
{
    "id": "UUID",
    "parentId": "UUID",
    "name": "String",
    "description": "String | null",
    "order": "Int",
    "isVisible": "Boolean",
    "createdAt": "DateTime",
    "updatedAt": "DateTime"
}
```

### PATCH /api/admin/categories/[categoryId]

```json
{
    "id": "UUID",
    "name": "String",
    "description": "String | null",
    "order": "Int",
    "isVisible": "Boolean",
    "updatedAt": "DateTime"
}
```

### PATCH /api/admin/categories/[categoryId]/move-up

```json
{
    "id": "UUID",
    "name": "String",
    "description": "String",
    "order": "Int",
    "isVisible": "Boolean",
    "updatedAt": "DateTime"
}
```

### PATCH /api/admin/categories/[categoryId]/move-down

```json
{
    "id": "UUID",
    "name": "String",
    "description": "String",
    "order": "Int",
    "isVisible": "Boolean",
    "updatedAt": "DateTime"
}

```

### DELETE /api/admin/categories/[categoryId]

```json
{
    "message": "String"
}
```

## Category Items

### POST /api/admin/categories/[categoryId]/items

```json
{
    "id": "UUID",
    "categoryId": "UUID",
    "name": "String",
    "description": "String | null",
    "containsList": "String[]",
    "calories": "Int | null",
    "price": "Decimal | null",
    "order": "Int",
    "isAvailable": "Boolean",
    "slug": "String",
    "imageKey": "String | null",
    "createdAt": "DateTime",
    "updatedAt": "DateTime"
}
```

### PATCH /api/admin/categories/[categoryId]/items/[itemId]/move-up

```json
{
    "id": "UUID",
    "categoryId": "UUID",
    "order": "Int",
    "updatedAt": "DateTime"
}
```

### PATCH /api/admin/categories/[categoryId]/items/[itemId]/move-down

```json
{
    "id": "UUID",
    "categoryId": "UUID",
    "order": "Int",
    "updatedAt": "DateTime"
}
```


## Items

### PATCH /api/admin/items/[itemId]

```json
{
    "id": "UUID",
    "categoryId": "UUID",
    "name": "String",
    "description": "String | null",
    "containsList": "String[]",
    "calories": "Int | null",
    "price": "Decimal | null",
    "isAvailable": "Boolean",
    "updatedAt": "DateTime",
}
```

### POST /api/admin/items/[itemId]/image

```json
{
    "message": "String",
    "item": {
        "id": "UUID",
        "imageKey": "String",
        "updatedAt": "DateTime"
    }
}
```

### PATCH /api/admin/items/[itemId]/image

```json
{
    "message": "String",
    "item": {
        "id": "UUID",
        "imageKey": "String",
        "updatedAt": "DateTime"
    }
}
```

### DELETE /api/admin/items/[itemId]/image

```json
{
    "message": "String",
    "item": {
        "id": "UUID",
        "imageKey": "String",
        "updatedAt": "DateTime"
    }
}
```

### DELETE /api/admin/items/[itemId]

```json
{
    "message": "String"
}
```

## Item Options

### POST /api/admin/items/[itemId]/options

```json
{
    "id": "UUID",
    "itemId": "UUID",
    "name": "String",
    "price": "Decimal",
    "order": "Int",
    "isAvailable": "Boolean",
    "createdAt": "DateTime",
    "updatedAt": "DateTime"
}
```

### PATCH /api/admin/items/[itemId]/options/[optionId]

```json
{
    "id": "UUID",
    "itemId": "UUID",
    "name": "String",
    "price": "Decimal",
    "isAvailable": "Boolean",
    "updatedAt": "DateTime"
}
```

### PATCH /api/admin/items/[itemId]/options/[optionId]/move-up

```json
{
    "id": "UUID",
    "itemId": "UUID",
    "order": "Int",
    "updatedAt": "DateTime"
}
```

### PATCH /api/admin/items/[itemId]/options/[optionId]/move-down

```json
{
    "id": "UUID",
    "itemId": "UUID",
    "order": "Int",
    "updatedAt": "DateTime"
}
```

### DELETE /api/admin/items/[itemId]/options/[optionId]

```json
{
    "message": "String"
}
```

## Contacts

### POST /api/admin/contacts

```json
{
    "id": "UUID",
    "phoneNumber": "String | null",
    "email": "String | null",
    "isPersonal": "Boolean",
    "createdAt": "DateTime",
    "updatedAt": "DateTime"
}
```

### PATCH /api/admin/contacts/[contactId]

```json
{
    "id": "UUID",
    "phoneNumber": "String | null",
    "email": "String | null",
    "isPersonal": "Boolean",
    "updatedAt": "DateTime"
}
```

### DELETE /api/admin/contacts/[contactId]

```json
{
    "message": "String"
}
```

## Socials

### POST /api/admin/socials

```json
{
    "id": "UUID",
    "domain": "String",
    "profileName": "String",
    "url": "String",
    "icon": "String"
}
```

### PATCH /api/admin/socials/[socialId]

```json
{
    "id": "UUID",
    "domain": "String",
    "profileName": "String",
    "url": "String",
    "icon": "String"
}
```

### DELETE /api/admin/socials/[socialId]

```json
{
    "message": "String"
}
```

## Locations

### POST /api/admin/locations

```json
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
```

### PATCH /api/admin/locations/[locationId]

```json
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
    "updatedAt": "DateTime"
}
```

### DELETE /api/admin/locations/[locationId]

```json
{
    "message": "String"
}
```

## Location Days

### POST /api/admin/location/[locationId]/days

```json
{
    "id": "UUID",
    "locationId": "UUID",
    "dayOfWeek": "String",
    "isClosed": "Boolean",
    "createdAt": "DateTime",
    "updatedAt": "DateTime"
}
```

### PATCH /api/admin/location/[locationId]/days/[dayId]

```json
{
    "id": "UUID",
    "locationId": "UUID",
    "dayOfWeek": "Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday",
    "isClosed": "Boolean",
    "updatedAt": "DateTime"
}
```

### DELETE /api/admin/location/[locationId]/days/[dayId]

```json
{
    "message": "String"
}
```

## Location Hours

### POST /api/admin/location/[locationId]/days/[dayId]/hours

```json
{
    "id": "UUID",
    "locationDayId": "UUID",
    "openTime": "String",
    "closeTime": "String",
    "title": "String | null",
    "note": "String | null",
    "isDisabled": "Boolean",
    "createdAt": "DateTime",
    "updatedAt": "DateTime"
}
```

### PATCH /api/admin/location/[locationId]/days/[dayId]/hours/[hourId]

```json
{
    "id": "UUID",
    "locationDayId": "UUID",
    "openTime": "String",
    "closeTime": "String",
    "title": "String | null",
    "note": "String | null",
    "isDisabled": "Boolean",
    "updatedAt": "DateTime"
}
```

### DELETE /api/admin/location/[locationId]/days/[dayId]/hours/[hourId]

```json
{
    "message": "String"
}
```
