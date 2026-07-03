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

---

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
    "email": "String",
    "accessLevel": "owner | admin | staff"
}
```

### DELETE /api/admin/business-users/[businessUserId]

No request body.

---

## Categories

### POST /api/admin/categories

```json
{
    "name": "String",
    "description": "String | null",
    "isVisible": "Boolean"
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

### DELETE /api/admin/categories/[categoryId]

No request body.

---

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

---

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

```txt
multipart/form-data

image: File
```

### DELETE /api/admin/items/[itemId]

No request body.

---

## Item Options

### POST /api/admin/items/[itemId]/options

```json
{
    "name": "String",
    "price": "Decimal",
    "isAvailable": "Boolean"
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
    "url": "String",
    "icon": "String"
}
```

### PATCH /api/admin/socials/[socialId]

```json
{
    "name": "String",
    "profileName": "String",
    "url": "String",
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
    "parking": "Boolean",
    "isActive": "Boolean"
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
    "isActive": "Boolean"
}
```

### DELETE /api/admin/locations/[locationId]

No request body.

---

## Location Hours

### POST /api/admin/locations/[locationId]/hours

```json
{
    "locationId": "String",
    "dayOfWeek": "String",
    "openTime": "String | null",
    "closeTime": "String | null",
    "isClosed": "Boolean"
}
```

### PATCH /api/admin/locations/[locationId]/hours/[hourId]

```json
{
    "dayOfWeek": "String",
    "openTime": "String | null",
    "closeTime": "String | null",
    "isClosed": "Boolean"
}
```

### DELETE /api/admin/locations/[locationId]/hours/[hourId]

No request body.
