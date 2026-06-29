# Public API JSON Response Structure

## Response Rules

Public routes should only return the data needed for the page or component using the route.

Avoid returning unrelated relationship data from a single route. For example, the business route should not also return contacts, socials, locations, and menu data.

Public routes are read-only. They should not create, update, or delete database records.

---

## Business

### GET /api/business

```json
{
    "id": "UUID",
    "name": "String",
    "slug": "String",
    "domain": "String | null"
}
```

---

## Contacts

### GET /api/business/contacts

```json
{
    "contacts": [
        {
            "id": "UUID",
            "phoneNumber": "String | null",
            "email": "String | null",
            "isPersonal": "Boolean"
        }
    ]
}
```

---

## Socials

### GET /api/business/socials

```json
{
    "socials": [
        {
            "id": "UUID",
            "name": "String",
            "profileName": "String",
            "url": "String",
            "icon": "String"
        }
    ]
}
```

---

## Locations

### GET /api/business/locations

```json
{
    "locations": [
        {
            "id": "UUID",
            "address": "String",
            "zip": "String | null",
            "country": "String | null",
            "state": "String | null",
            "city": "String | null",
            "parking": "Boolean",
            "isActive": "Boolean",
            "hours": [
                {
                    "id": "UUID",
                    "locationId": "UUID",
                    "dayOfWeek": "String",
                    "openTime": "String | null",
                    "closeTime": "String | null",
                    "isClosed": "Boolean"
                }
            ]
        }
    ]
}
```

---

## Menu

### GET /api/business/menu

```json
{
    "categories": [
        {
            "id": "UUID",
            "name": "String",
            "description": "String | null",
            "order": "Int",
            "isVisible": "Boolean",
            "items": [
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
                    "options": [
                        {
                            "id": "UUID",
                            "itemId": "UUID",
                            "name": "String",
                            "price": "Decimal",
                            "order": "Int",
                            "isAvailable": "Boolean"
                        }
                    ]
                }
            ]
        }
    ]
}
```

---

## Menu Item

### GET /api/business/menu/items/[itemSlug]

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
    "options": [
        {
            "id": "UUID",
            "itemId": "UUID",
            "name": "String",
            "price": "Decimal",
            "order": "Int",
            "isAvailable": "Boolean"
        }
    ]
}
```
