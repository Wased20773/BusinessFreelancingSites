---
title: DatabaseModels
code-paths:
  - N/A

last-verified: 2026-06-24
status: planned
---

# Database Models

A shared database where all business information is fetched. A business identifier is linked to each owner/administrator to manage its own business.

## Models

### Business

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| name | string | Business name |
| users | [User[]](#user) | Users connected to this business, unless stated otherwise it should not contain normal users |
| categories | [Category[]](#category) | Menu categories owned by this business to help organize frontend menu page/s |
| contacts | [Contact[]](#contact) | Optional Contact records for the business |
| locations | [Location[]](#location) | Exact locations; used for frontend world mapping |
| slug | string | System-generated URL-safe business identifier. Used to fetch business-specific data; business-name |
| domain | string | Production domain per business app; business-name.com |

### User

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| businessId | FK → [Business](#business) | The Business this user belongs to |
| name | string? | Optional User's name |
| username | string? | Optional User's username |
| email | string | User's email/login identifier |
| passwordHash | authProvider | Password hash, not plain text |
| role | [Role](#role) | User role/access level |

### Role

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| userId | FK → [User](#user) | The User this role belongs to |
| accessLevel | string | owner, admin, staff |
| description | string | Predefined description to help the user understand their access level permissions |

### Access Level Choices

| Value | Label | Meaning |
| --- | --- | --- |
| owner | Owner | Full business-level access. Can add, update, and change business content, manage users/roles, and transfer ownership. |
| admin | Admin | Can add, update, and delete business content. Can manage general user information, but cannot remove an owner, or transfer ownership. |
| staff | Staff | View-only access. Can view business information but cannot add, update, or delete business content. Free to update their credentials but not role. |

### Category

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| businessId | FK → [Business](#business) | The Business this category belongs to |
| name | string | User defined Category name; Drinks, Orders, Beverages, Alcohol, Toppings, etc. |
| description | string? | Optional category description |
| order | number | Helps display the Category in a specific order in the frontend; Orders(1) -> Toppings(2) -> Drinks(3) |
| isVisible | boolean | Whether the category appears on the public website (example; weekend special category) |
| items | [Item[]](#item) | Items inside this Category |

### Contact

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| businessId | FK → [Business](#business) | The Business this contact belongs to |
| phoneNumber | string? | Optional phone number to contact the business |
| email | string? | Optional email address to the business for any inquiries |
| isPersonal | boolean | Whether the contact is business owned or their personal contact. Helps determine calling hours |
| social | [Social[]](#social) | Social media links |

### Social

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| contactId | FK → [Contact](#contact) | The Contact record this social link belongs to |
| name | string | predefined Social platform name; instagram, twitter, facebook, etc. |
| profileName | string | Business Social platform account name |
| URL | string | Predefined domain for Social URL profile; instagram.com/business-social-name |
| icon | string | Predefined Icon images, must be supported |

### Location

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| businessId | FK → [Business](#business) | The Business this location belongs to |
| address | string | Street address |
| zip | string? | Optional ZIP/postal code |
| country | string? | Optional country |
| state | string? | Optional state |
| city | string? | Optional city |
| parking | boolean | Whether parking is available |
| hours | [LocationHour[]](#locationhour) | Days and hours this location is open |
| isActive | boolean | Is this location serving customers? Has this location temporarily closed? |

### LocationHour

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| locationId | FK → [Location](#location) | The Location these hours belong to |
| dayOfWeek | string | Predefined days of the week; monday, tuesday, wednesday, etc. |
| openTime | string? | Opening time; 09:00 |
| closeTime | string? | Closing time; 21:00 |
| isClosed | boolean | Whether the location is closed on this day |

### Item

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| businessId | FK → [Business](#business) | The Business this item belongs to |
| categoryId | FK → [Category](#category) | The Category this item belongs to |
| name | string | Item name; Bottle Water |
| description | string? | Optional item description |
| containsList | string? | Optional listing of what the item contains to help with the frontend; tomato, onions, salt, pepper, etc. |
| calories | number? | Optional calorie count |
| price | decimal | The price of the Item which should not include the "$" sign; 1.99, 5, 2.49 |
| order | number | Helps display the Item in a specific order in the frontend; Cheese Burger(1) -> Double Cheese Burger(2) -> Combo(3) |
| isAvailable | boolean | Whether the item is available/displayed (example; seasonal items) |
| slug | string | System-generated URL-safe identifier. Used for routing and public URLs; bottle-water |
| imageKey | string? | Optional image storage key that uses AWS S3 Buckets; businesses/business-1/menu-items/bottle-water.webp |

## Design Decisions

- **Self Managed Businesses:** Businesses with only one user who is also the owner should be given full access to their content. While not strictly an owners job to manage all content modifications, in this case it is necessary.
- **Contacts Info:** A business can be self owned, which in most cases they might just use their mobile phone. Another business might be using a dedicated business number which is only accessible in the business location (e.g. landline). Providing this information would allow the frontend to demonstrate calling hours that would link to the location hours.
- **Menu Ordering:** Every business should have one or many categories to organize their menu items and each category has one or many items in them. The field `order` allows for manual organization to tell where each set goes. They might want drinks to go before alcohol, or they might want to switch the order a menu item is displayed to show more popular items first. There should be a button to manually change the order number which will swap the two sets (categories or items).
- **Social Media Linkage:** Not all businesses have a social media to promote their own business. But when they do they will be able to select from a predefined set of data for the social media we provide. This is to avoid malicious redirects to an unsafe site where the user could write to a phishing link.
- **Location Hours:** Every business should have one or many locations and each location should have one or more hours to show when the business is available at that location. Open and close times are required for each day set unless it is typically closed on that specified day where open and close times will be disabled. If there is a split in hours, provide the same day with a different open and close time; there should be no overlap.

## Slug Design Choice

Slugs are system-generated URL-safe identifiers and locked. They are used for routing, public URLs, and stable data fetching.

Business users should not directly edit slugs because invalid or changed slugs could break public pages, image references, or existing links.

### Slug Rules

- Slugs are generated from the original name.
- Slugs are lowercase.
- Spaces are replaced with hyphens.
- Special characters are removed.
- Slugs must be unique within the business.
- Slugs are not directly editable.

### Examples

| Source Name | Generated Slug |
| --- | --- |
| Tacos El Guero | tacos-el-guero |
| Bottle Water | bottle-water |
| Tacos with Cream and Cheese | tacos-with-cream-and-cheese |

### Current Slug Usage

| Model | Reason |
| --- | --- |
| Business | Used to identify and fetch business-specific data. |
| Item | Used for future item pages and stable item URLs. |

## Out of Scope

- **More Roles:** At times some businesses would like to have normal user logins to incourage a point system. However, at this time, that would require additional models and at times a custom model for only that business. After MVP it is possible to integrate this feature but it is not a priority for the MVP.
- **Special Dates:** Special dates such as veterans day to signal when a particular day of the week will be closed requires automation so that it isn't added per year manually.

## Relationships

### Business Model

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
