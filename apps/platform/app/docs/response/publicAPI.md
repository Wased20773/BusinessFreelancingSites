# Public API JSON Response Structure

### GET /api/business (ROUTE #1)

```json
{
    "id": "UUID",
    "name": "String",
    "slug": "String",
    "domain": "String | null",
    "createdAt": "DateTime",
    "updatedAt": "DateTime",

    "contacts": [
        {
            "id": "UUID",
            "businessId": "UUID",
            "phoneNumber": "String | null",
            "email": "String | null",
            "isPersonal": "Boolean",
            "createdAt": "DateTime",
            "updatedAt": "DateTime"
        }
    ],

    "socials": [
        {
            "id": "UUID",
            "businessId": "UUID",
            "name": "String",
            "profileName": "String",
            "url": "String",
            "icon": "String"
        }
    ],

    "locations": [
        {
            "id": "UUID",
            "businessId": "UUID",
            "address": "String",
            "zip": "String | null",
            "country": "String | null",
            "state": "String | null",
            "city": "String | null",
            "parking": "Boolean",
            "isActive": "Boolean",
            "createdAt": "DateTime",
            "updatedAt": "DateTime",
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

### GET /api/business/menu (ROUTE #2)
``` json
{
    "id": "UUID",
    "name": "String",
    "slug": "String",
    "categories": [
        {
            "id": "UUID",
            "businessId": "UUID",
            "name": "String",
            "description": "String | null",
            "order": "Int",
            "isVisible": "Boolean",
            "createdAt": "DateTime",
            "updatedAt": "DateTime",
            "items": [
                {
                    "id": "UUID",
                    "businessId": "UUID",
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
                    "updatedAt": "DateTime",
                    "options": [
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
                    ]
                }
            ]
        }
    ]
}
```