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
    "businessUserId": "UUID",
    "name": "String | null",
    "username": "String | null",
    "email": "String",
    "accessLevel": "owner | admin | staff",
    "accessLevelDescription": "String"
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

### PATCH /api/admin/account/email

```json
{
    "email": "String",
    "updatedAt": "DateTime"
}
```

### PATCH /api/admin/account/password

```json
{
    "message": "String",
    "updatedAt": "DateTime"
}
```

## Business Users

### GET /api/admin/business-users

```json
{
    "businessUsers": [
        {
            "businessUserId": "UUID",
            "name": "String | null",
            "username": "String | null",
            "email": "String",
            "accessLevel": "owner | admin | staff",
            "accessLevelDescription": "String"
        }
    ]
}
```

### POST /api/admin/business-users

```json
{
    "businessUserId": "UUID",
    "name": "String | null",
    "username": "String | null",
    "email": "String",
    "accessLevel": "owner | admin | staff",
    "accessLevelDescription": "String"
}
```

### PATCH /api/admin/business-users/[businessUserId]

```json
{
    "businessUserId": "UUID",
    "accessLevel": "owner | admin | staff",
    "accessLevelDescription": "String"
}
```

### DELETE /api/admin/business-users/[businessUserId]

```json
{
    "deletedBusinessUserId": "UUID",
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
    "categories": [
        {
            "id": "UUID",
            "order": "Int",
            "updatedAt": "DateTime"
        }
    ]
}
```

### PATCH /api/admin/categories/[categoryId]/move-down

```json
{
    "categories": [
        {
            "id": "UUID",
            "order": "Int",
            "updatedAt": "DateTime"
        }
    ]
}
```

### DELETE /api/admin/categories/[categoryId]

```json
{
    "deletedCategoryId": "UUID",
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
    "imageKey": "String | null",
    "createdAt": "DateTime",
    "updatedAt": "DateTime"
}
```

### PATCH /api/admin/categories/[categoryId]/items/[itemId]/move-up

```json
{
  "items": [
    {
      "id": "UUID",
      "categoryId": "UUID",
      "order": "Int",
      "updatedAt": "DateTime"
    }
  ]
}
```

### PATCH /api/admin/categories/[categoryId]/items/[itemId]/move-down

```json
{
  "items": [
    {
      "id": "UUID",
      "categoryId": "UUID",
      "order": "Int",
      "updatedAt": "DateTime"
    }
  ]
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
    "order": "Int",
    "isAvailable": "Boolean",
    "ImageKey": "String | null",
    "updatedAt": "DateTime",
}
```

### PATCH /api/admin/items/[itemId]/image

```json
{
  "id": "UUID",
  "imageKey": "String"
}
```

### DELETE /api/admin/items/[itemId]

```json
{
    "deletedItemId": "UUID",
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
    "order": "Int",
    "isAvailable": "Boolean",
    "updatedAt": "DateTime"
}
```

### PATCH /api/admin/items/[itemId]/options/[optionId]/move-up

```json
{
    "options": [
        {
            "id": "UUID",
            "order": "Int",
            "updatedAt": "DateTime"
        }
    ]
}
```

### PATCH /api/admin/items/[itemId]/options/[optionId]/move-down

```json
{
    "options": [
        {
            "id": "UUID",
            "order": "Int",
            "updatedAt": "DateTime"
        }
    ]
}
```

### DELETE /api/admin/items/[itemId]/options/[optionId]

```json
{
    "deletedOptionId": "UUID",
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
    "deletedContactId": "UUID",
    "message": "String"
}
```

## Socials

### POST /api/admin/socials

```json
{
    "id": "UUID",
    "name": "String",
    "profileName": "String",
    "url": "String",
    "icon": "String"
}
```

### PATCH /api/admin/socials/[socialId]

```json
{
    "id": "UUID",
    "name": "String",
    "profileName": "String",
    "url": "String",
    "icon": "String"
}
```

### DELETE /api/admin/socials/[socialId]

```json
{
    "deletedSocialId": "UUID",
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
    "updatedAt": "DateTime"
}
```

### DELETE /api/admin/locations/[locationId]

```json
{
    "deletedLocationId": "UUID",
    "message": "String"
}
```

## Location Hours

### POST /api/admin/locations/[locationId]/hours

```json
{
    "id": "UUID",
    "locationId": "UUID",
    "dayOfWeek": "String",
    "openTime": "String | null",
    "closeTime": "String | null",
    "isClosed": "Boolean"
}
```

### PATCH /api/admin/locations/[locationId]/hours/[hourId]

```json
{
    "id": "UUID",
    "locationId": "UUID",
    "dayOfWeek": "String",
    "openTime": "String | null",
    "closeTime": "String | null",
    "isClosed": "Boolean"
}
```

### DELETE /api/admin/locations/[locationId]/hours/[hourId]

```json
{
    "deletedHourId": "UUID",
    "locationId": "UUID",
    "message": "String"
}
```
