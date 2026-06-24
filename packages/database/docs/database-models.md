---
title: DatabaseModels
code-paths:
  - N/A

last-verified: 2026-06-24
status: draft
---

# Database Models

A shared database where all business information is fetched. A business identifier is linked to each administrator to manage its own business.

## Table of Contents

- [Database Models](#database-models)
  - [Table of Contents](#table-of-contents)
  - [Business](#business)
  - [User](#user)
  - [Role](#role)
  - [Category](#category)
  - [Contact](#contact)
  - [Social](#social)
  - [Location](#location)
  - [LocationHour](#locationhour)
  - [Item](#item)
  - [Relationships](#relationships)
    - [Ownership / Foreign Keys](#ownership--foreign-keys)

## Business

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| name | string | Business name |
| users | [User[]](#user) | Users connected to this business, unless stated otherwise it should not contain normal users |
| categories | [Category[]](#category) | Menu categories owned by this business to help organize frontend menu page/s |
| contacts | [Contact[]](#contact) | Contact records for the business |
| locations | [Location[]](#location) | Exact locations; used for frontend world mapping |
| menuItems | [Item[]](#item) | Items that the business sells. Items can become un-visable whenever a product is no longer being sold (seasonal items) |
| slug | string | System-generated URL-safe business identifier. Used to fetch business-specific data. Not directly editable in MVP. |
| domain | string | Production domain per business app |

## User

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| businessId | FK → [Business](#business) | The Business this user belongs to |
| name | string? | Optional User's name |
| username | string? | Optional User's username |
| email | string | User's email/login identifier |
| password | string | Password hash, not plain text |
| role | [Role](#role) | User role/access level |

## Role

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| userId | FK → [User](#user) | The User this role belongs to |
| accessLevel | string | owner, admin, staff |
| description | string | Predefined description to help the user understand their access level permissions |

## Category

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| businessId | FK → [Business](#business) | The Business this category belongs to |
| name | string | Predefined or User defined Category name; Drinks, Orders, Beverages, Alcohol, Toppings, etc. |
| description | string? | Optional category description |
| order | number | Helps display the Category in a specific order in the frontend; Orders(1) -> Toppings(2) -> Drinks(3) |
| isVisible | boolean | Whether the category appears on the public website (example; weekend special category) |
| items | [Item[]](#item) | Items inside this Category |

## Contact

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| businessId | FK → [Business](#business) | The Business this contact belongs to |
| phoneNumber | string? | Optional phone number to contact the business |
| email | string? | Optional email address to the business for any inquiries |
| isPersonal | boolean | Whether the contact is business owned or their personal contact |
| contactName | string? | Optional contact person/name. Should only be fillable if isPersonal=true |
| social | [Social[]](#social)? | Optional social media links |

## Social

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| contactId | FK → [Contact](#contact) | The Contact record this social link belongs to |
| name | string | predefined or User defined Social platform name; instagram, twitter, facebook, etc. |
| URL | string | Social/profile URL; instagram.com/business-social-name |
| icon | string | Predefined Icon images, must be supports |

## Location

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| businessId | FK → [Business](#business) | The Business this location belongs to |
| address | string | Street address |
| zip | string? | Optional ZIP/postal code |
| country | string? | Optional country |
| state | string? | Optional state |
| city | string? | Optional city |
| parking | boolean? | Whether parking is available |
| hours | [LocationHour[]](#locationhour) | Days and hours this location is open |

## LocationHour

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| locationId | FK → [Location](#location) | The Location these hours belong to |
| dayOfWeek | string | Day of the week; monday, tuesday, wednesday, etc. |
| openTime | string? | Opening time; example: 09:00 |
| closeTime | string? | Closing time; example: 21:00 |
| isClosed | boolean | Whether the location is closed on this day |

## Item

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| businessId | FK → [Business](#business) | The Business this item belongs to |
| categoryId | FK → [Category](#category) | The Category this item belongs to |
| name | string | Item name |
| description | string? | Optional item description |
| containsList | string? | Optional listing of what the item contains to help with the frontend; tomato, onions, salt, pepper, etc. |
| calories | number? | Optional calorie count |
| price | number | The price of the Item which should not include the "$" sign; 1.99, 5, 2.49 |
| order | number | Helps display the Item in a specific order in the frontend; Cheese Burger(1) -> Double Cheese Burger(2) -> Combo(3) |
| isAvailable | boolean | Whether the item is available/displayed (example; seasonal items) |
| slug | string | System-generated URL-safe identifier. Used for routing and public URLs. Not directly editable in MVP. |
| imageKey | string? | Optional image storage key that uses AWS S3 Buckets; businesses/business-1/menu-items/bottle-water.webp |

## Relationships

```txt
Business
├── User[]
│     └── Role
├── Category[]
│     └── Item[]
├── Contact[]
│     └── Social[]
└── Location[]
      └── LocationHour[]
```

### Ownership / Foreign Keys

```txt
User.businessId         → Business.id
Role.userId             → User.id
Category.businessId     → Business.id
Contact.businessId      → Business.id
Social.contactId        → Contact.id
Location.businessId     → Business.id
LocationHour.locationId → Location.id
Item.businessId         → Business.id
Item.categoryId         → Category.id
```
