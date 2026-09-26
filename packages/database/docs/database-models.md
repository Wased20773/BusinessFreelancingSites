---
title: DatabaseModels
code-paths:
  - packages/database/prisma/schema.prisma

last-verified: 2026-09-27
status: planned
---

# Database Models

A shared PostgreSQL database stores business information for all client websites. Business-owned records include a business identifier so each business can only manage and display its own data.

## Models

### BusinessApiKey

| Field        | Type                  | Notes                                                |
| ------------ | --------------------- | ---------------------------------------------------- |
| `id`         | String                | Primary key (UUID)                                   |
| `businessId` | String                |                                                      |
| `name`       | String                | Name used to identify the key                        |
| `keyHash`    | String                | Unique hash of the API key                           |
| `keyPrefix`  | String                | Prefix shown to identify the key                     |
| `isActive`   | Boolean               | Defaults to true; controls whether the key is active |
| `createdAt`  | DateTime              | Creation timestamp                                   |
| `updatedAt`  | DateTime              | Last update timestamp                                |
| `business`   | [Business](#business) | Relation; deletes cascade                            |

**Constraints and indexes:** `@@index([businessId])`.

### Business

| Field              | Type                                | Notes                               |
| ------------------ | ----------------------------------- | ----------------------------------- |
| `id`               | String                              | Primary key (UUID)                  |
| `name`             | String                              |                                     |
| `slug`             | String                              | Globally unique business slug       |
| `domain`           | String?                             | Unique when present                 |
| `imageKey`         | String?                             | Optional stored image key           |
| `originalImageKey` | String?                             | Optional original image key         |
| `createdAt`        | DateTime                            | Creation timestamp                  |
| `updatedAt`        | DateTime                            | Last update timestamp               |
| `users`            | [BusinessUser](#businessuser)[]     | Users and their business roles      |
| `locations`        | [Location](#location)[]             | Locations that own business content |
| `apiKeys`          | [BusinessApiKey](#businessapikey)[] | API keys for this business          |

### User

| Field                  | Type                            | Notes                                 |
| ---------------------- | ------------------------------- | ------------------------------------- |
| `id`                   | String                          | Primary key (UUID)                    |
| `name`                 | String?                         |                                       |
| `username`             | String?                         |                                       |
| `email`                | String                          | Unique email address                  |
| `emailVerified`        | DateTime?                       |                                       |
| `image`                | String?                         |                                       |
| `onboardingCompleted`  | Boolean                         | Defaults to false                     |
| `onboardingIntent`     | OnboardingIntent?               | Optional onboarding selection         |
| `workspaceTourVersion` | Int                             | Workspace tour version; defaults to 0 |
| `dashboardTourVersion` | Int                             | Dashboard tour version; defaults to 0 |
| `createdAt`            | DateTime                        | Creation timestamp                    |
| `updatedAt`            | DateTime                        | Last update timestamp                 |
| `businesses`           | [BusinessUser](#businessuser)[] | Business memberships                  |
| `accounts`             | [Account](#account)[]           | Linked provider accounts              |
| `sessions`             | [Session](#session)[]           | User sessions                         |

### BusinessUser

| Field        | Type                  | Notes                       |
| ------------ | --------------------- | --------------------------- |
| `id`         | String                | Primary key (UUID)          |
| `businessId` | String                | Business in this membership |
| `userId`     | String                | User in this membership     |
| `roleId`     | String                | Role within this business   |
| `createdAt`  | DateTime              | Creation timestamp          |
| `updatedAt`  | DateTime              | Last update timestamp       |
| `business`   | [Business](#business) | Relation; deletes cascade   |
| `user`       | [User](#user)         | Relation; deletes cascade   |
| `role`       | [Role](#role)         | Relation; deletes cascade   |

**Constraints and indexes:** `@@unique([businessId, userId])`.

### Role

| Field         | Type                            | Notes                          |
| ------------- | ------------------------------- | ------------------------------ |
| `id`          | String                          | Primary key (UUID)             |
| `accessLevel` | AccessLevel                     | Unique access level            |
| `description` | String                          | Role description               |
| `createdAt`   | DateTime                        | Creation timestamp             |
| `updatedAt`   | DateTime                        | Last update timestamp          |
| `users`       | [BusinessUser](#businessuser)[] | Memberships assigned this role |

### Account

| Field               | Type          | Notes                                        |
| ------------------- | ------------- | -------------------------------------------- |
| `id`                | String        | Primary key (UUID)                           |
| `userId`            | String        |                                              |
| `type`              | String        |                                              |
| `provider`          | String        |                                              |
| `providerAccountId` | String        | Account identifier at the provider           |
| `refresh_token`     | String?       |                                              |
| `access_token`      | String?       |                                              |
| `expires_at`        | Int?          | Optional provider token expiration timestamp |
| `token_type`        | String?       |                                              |
| `scope`             | String?       |                                              |
| `id_token`          | String?       |                                              |
| `session_state`     | String?       |                                              |
| `createdAt`         | DateTime      | Creation timestamp                           |
| `updatedAt`         | DateTime      | Last update timestamp                        |
| `user`              | [User](#user) | Relation; deletes cascade                    |

**Constraints and indexes:** `@@unique([provider, providerAccountId])`.

### Session

| Field          | Type          | Notes                     |
| -------------- | ------------- | ------------------------- |
| `id`           | String        | Primary key (UUID)        |
| `sessionToken` | String        | Unique session token      |
| `userId`       | String        |                           |
| `expires`      | DateTime      | Session expiration        |
| `user`         | [User](#user) | Relation; deletes cascade |

### VerificationToken

| Field        | Type     | Notes                   |
| ------------ | -------- | ----------------------- |
| `identifier` | String   | Verification identifier |
| `token`      | String   | Verification token      |
| `expires`    | DateTime | Token expiration        |

**Constraints and indexes:** `@@unique([identifier, token])`.

### Location

| Field         | Type                          | Notes                                       |
| ------------- | ----------------------------- | ------------------------------------------- |
| `id`          | String                        | Primary key (UUID)                          |
| `businessId`  | String                        | Owning business                             |
| `address`     | String                        | Address; unique within the business         |
| `zip`         | String?                       |                                             |
| `country`     | String?                       |                                             |
| `state`       | String?                       |                                             |
| `city`        | String?                       |                                             |
| `parking`     | Boolean                       | Defaults to false                           |
| `isActive`    | Boolean                       | Defaults to true                            |
| `enableHours` | Boolean                       | Defaults to false                           |
| `createdAt`   | DateTime                      | Creation timestamp                          |
| `updatedAt`   | DateTime                      | Last update timestamp                       |
| `business`    | [Business](#business)         | Relation; deletes cascade                   |
| `days`        | [LocationDay](#locationday)[] | Weekly days for this location               |
| `categories`  | [Category](#category)[]       | Location-owned categories and subcategories |
| `contacts`    | [Contact](#contact)[]         | Location-owned contact information          |
| `socials`     | [Social](#social)[]           | Location-owned social profiles              |
| `items`       | [Item](#item)[]               | Location-owned items                        |

**Constraints and indexes:** `@@unique([businessId, address])`; `@@index([businessId])`.

### LocationDay

| Field          | Type                  | Notes                                      |
| -------------- | --------------------- | ------------------------------------------ |
| `id`           | String                | Primary key (UUID)                         |
| `locationId`   | String                |                                            |
| `dayOfWeek`    | DayOfWeek             | Weekday; unique within the location        |
| `isClosed`     | Boolean               | Defaults to true                           |
| `syncGroupId`  | String?               | Optional group used to synchronize records |
| `isSynced`     | Boolean               | Defaults to false                          |
| `createdAt`    | DateTime              | Creation timestamp                         |
| `updatedAt`    | DateTime              | Last update timestamp                      |
| `hour`         | [Hour](#hour)?        | Optional regular hour for this weekday     |
| `specialHours` | [Hour](#hour)[]       | Special hour ranges for this weekday       |
| `location`     | [Location](#location) | Relation; deletes cascade                  |

**Constraints and indexes:** `@@unique([locationId, dayOfWeek])`; `@@index([locationId])`.

### Hour

| Field          | Type                         | Notes                                          |
| -------------- | ---------------------------- | ---------------------------------------------- |
| `id`           | String                       | Primary key (UUID)                             |
| `openTime`     | String                       | Opening time stored as a string                |
| `closeTime`    | String                       | Closing time stored as a string                |
| `title`        | String?                      | Optional hour title                            |
| `note`         | String?                      | Optional note                                  |
| `isDisabled`   | Boolean                      | Defaults to false                              |
| `syncGroupId`  | String?                      | Optional group used to synchronize records     |
| `isSynced`     | Boolean                      | Defaults to false                              |
| `createdAt`    | DateTime                     | Creation timestamp                             |
| `updatedAt`    | DateTime                     | Last update timestamp                          |
| `regularDayId` | String?                      | Optional, unique weekday ID for a regular hour |
| `regularDay`   | [LocationDay](#locationday)? | Weekday for this regular hour                  |
| `specialDayId` | String?                      | Optional weekday ID for a special hour         |
| `specialDay`   | [LocationDay](#locationday)? | Weekday for this special hour                  |

**Constraints and indexes:** `@@unique([specialDayId, openTime, closeTime])`; `@@index([specialDayId])`.

### Category

| Field           | Type                  | Notes                                      |
| --------------- | --------------------- | ------------------------------------------ |
| `id`            | String                | Primary key (UUID)                         |
| `locationId`    | String                | Owning location                            |
| `parentId`      | String?               | Optional parent category ID                |
| `name`          | String                |                                            |
| `description`   | String?               |                                            |
| `order`         | Int                   | Display order; defaults to 1               |
| `isVisible`     | Boolean               | Defaults to true                           |
| `syncGroupId`   | String?               | Optional group used to synchronize records |
| `isSynced`      | Boolean               | Defaults to false                          |
| `createdAt`     | DateTime              | Creation timestamp                         |
| `updatedAt`     | DateTime              | Last update timestamp                      |
| `location`      | [Location](#location) | Relation; deletes cascade                  |
| `parent`        | Category?             | Optional parent category                   |
| `subcategories` | Category[]            | Child categories                           |
| `items`         | [Item](#item)[]       | Items in this category                     |

**Constraints and indexes:** `@@unique([locationId, parentId, name])`; `@@index([locationId, parentId])`; `@@index([syncGroupId])`.

### Contact

| Field         | Type                  | Notes                                      |
| ------------- | --------------------- | ------------------------------------------ |
| `id`          | String                | Primary key (UUID)                         |
| `locationId`  | String                | Owning location                            |
| `phoneNumber` | String?               | Optional phone number                      |
| `email`       | String?               | Optional contact email                     |
| `isPersonal`  | Boolean               | Defaults to false                          |
| `syncGroupId` | String?               | Optional group used to synchronize records |
| `isSynced`    | Boolean               | Defaults to false                          |
| `createdAt`   | DateTime              | Creation timestamp                         |
| `updatedAt`   | DateTime              | Last update timestamp                      |
| `location`    | [Location](#location) | Relation; deletes cascade                  |

**Constraints and indexes:** `@@index([locationId])`; `@@index([syncGroupId])`.

### Social

| Field         | Type                  | Notes                                      |
| ------------- | --------------------- | ------------------------------------------ |
| `id`          | String                | Primary key (UUID)                         |
| `locationId`  | String                | Owning location                            |
| `domain`      | String                | Social platform domain                     |
| `profileName` | String                | Profile identifier                         |
| `url`         | String                | Profile URL                                |
| `icon`        | String                | Icon reference                             |
| `syncGroupId` | String?               | Optional group used to synchronize records |
| `isSynced`    | Boolean               | Defaults to false                          |
| `createdAt`   | DateTime              | Creation timestamp                         |
| `updatedAt`   | DateTime              | Last update timestamp                      |
| `location`    | [Location](#location) | Relation; deletes cascade                  |

**Constraints and indexes:** `@@unique([locationId, domain, profileName])`; `@@index([locationId])`; `@@index([syncGroupId])`.

### Item

| Field              | Type                        | Notes                                      |
| ------------------ | --------------------------- | ------------------------------------------ |
| `id`               | String                      | Primary key (UUID)                         |
| `locationId`       | String                      | Owning location                            |
| `categoryId`       | String                      | Category containing this item              |
| `name`             | String                      |                                            |
| `description`      | String?                     |                                            |
| `containsList`     | String[]                    | List of item contents                      |
| `calories`         | Int?                        |                                            |
| `price`            | Decimal                     | Price with precision 10, scale 2           |
| `order`            | Int                         | Display order; defaults to 1               |
| `isAvailable`      | Boolean                     | Defaults to true                           |
| `slug`             | String                      | Unique within the location                 |
| `imageKey`         | String?                     | Optional image storage key                 |
| `originalImageKey` | String?                     | Optional original image key                |
| `syncGroupId`      | String?                     | Optional group used to synchronize records |
| `isSynced`         | Boolean                     | Defaults to false                          |
| `createdAt`        | DateTime                    | Creation timestamp                         |
| `updatedAt`        | DateTime                    | Last update timestamp                      |
| `location`         | [Location](#location)       | Relation; deletes cascade                  |
| `category`         | [Category](#category)       | Relation; deletes cascade                  |
| `options`          | [ItemOption](#itemoption)[] | Options for this item                      |

**Constraints and indexes:** `@@unique([locationId, slug])`; `@@index([locationId])`; `@@index([categoryId])`; `@@index([syncGroupId])`.

### ItemOption

| Field         | Type          | Notes                                      |
| ------------- | ------------- | ------------------------------------------ |
| `id`          | String        | Primary key (UUID)                         |
| `itemId`      | String        | Owning item                                |
| `name`        | String        |                                            |
| `price`       | Decimal       | Option price with precision 10, scale 2    |
| `order`       | Int           | Display order; defaults to 1               |
| `isAvailable` | Boolean       | Defaults to true                           |
| `syncGroupId` | String?       | Optional group used to synchronize records |
| `isSynced`    | Boolean       | Defaults to false                          |
| `createdAt`   | DateTime      | Creation timestamp                         |
| `updatedAt`   | DateTime      | Last update timestamp                      |
| `item`        | [Item](#item) | Relation; deletes cascade                  |

**Constraints and indexes:** `@@unique([itemId, name])`; `@@index([itemId])`; `@@index([syncGroupId])`.

## Enums

### OnboardingIntent

| Value     | Label     | Meaning                                          |
| --------- | --------- | ------------------------------------------------ |
| staff     | Staff     | Intent to be a staff member at a business        |
| business  | Business  | Intent to create a business                      |
| developer | Developer | Intent to develop client websites for a business |

### AccessLevel

| Value     | Label     | Meaning                                                                                                                                                    |
| --------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| developer | Developer | Responsible for the technical integration of the business website. Can create, view, rotate, deactivate, and delete Business API keys used by the website. |
| owner     | Owner     | Full business-level access. Can add, update, and change business content, manage users/roles, and transfer ownership.                                      |
| admin     | Admin     | Can add, update, and delete business content. Can manage general user information, but cannot remove an owner, or transfer ownership.                      |
| staff     | Staff     | View-only access. Can view business information but cannot add, update, or delete business content. Free to update their credentials but not role.         |

### DayOfWeek

| Value     | Label     |
| --------- | --------- |
| Monday    | Monday    |
| Tuesday   | Tuesday   |
| Wednesday | Wednesday |
| Thursday  | Thursday  |
| Friday    | Friday    |
| Saturday  | Saturday  |
| Sunday    | Sunday    |

## Design Decisions

- **Self Managed Businesses:** Businesses with only one user who is also the owner should be given full access to their content. While not strictly an owner's job to manage all content modifications, in this case it is necessary.
- **Business User Join Model:** A user account can be connected to more than one business. The `BusinessUser` model stores the JOIN relationship between a user and a business, including the user's role for that specific business. This allows the same email account to be an admin for one business and staff for another.
- **Role Organization:** Roles are kept in their own model instead of being stored directly on `User`. This keeps access-level data organized and leaves room to add more role-related fields later.
- **Contacts Info:** A business can be self owned, which in most cases they might just use their mobile phone. Another business might be using a dedicated business number which is only accessible in the business location (e.g. landline). Providing this information would allow the frontend to demonstrate calling hours that would link to the location hours.
- **Synchronization:** A business can have many items but some locations may not serve that. Thats where synchronization helps. Synchronization makes sure to add the same record (category, item, contacts, socials, days, hours) to all locations so that when you make any new additions they all get updated equally. Synchronization can also be disabled on creation to make that record unique. If a record has a syncGroupId and its sync is disabled changes to that record will not be shared. If this is later enabled again then the new changes overwrite all records.
- **Menu Ordering:** Every business location should have one or many categories to organize their menu items and each category should have one or many items in them. The field `order` allows for manual organization to tell where each set goes. They might want drinks to go before alcohol, or they might want to switch the order a menu item is displayed to show more popular items first or to organize the menu in a relative order (1: Breakfast, 2: Dinner, 3: Drinks, ...). There should be a button to manually change the order number which will swap the two sets (categories, items, or item options).
- **Social Media Linkage:** Not all businesses have a social media to promote their own business. But when they do they will be able to select from a predefined set of data for the social media we provide. This is to avoid malicious redirects to an unsafe site where the user could write to a phishing link. All links reference the supported media we provide by their domain followed by there profile name.
- **Social Media URL Field:** When creating a Social model it must be created with a `url` value for its field. However, the url itself is not created entirly by the user. The domain (a predefined value) is used for the url which the user has no control of modifying. For example, `domain=instagram.com`, then url will be the complete url for the businesses social media profile at `https://${domain}/${profileName}`.
- **Location Hours:** A business can have one or many locations and each location can have one or more hours to show per day of the week when the business is available at that location. Each location includes open and closing hours with optional special hours. Special hours must not overlap (handled by api). Hours come with a title and note for extra context of the hours (e.g., breakfast special hours, happy hour, etc).
- **Contains List:** `containsList` is stored as an array of strings so the frontend can render item contents individually instead of parsing one long text field. Example: ["pepper", "salt", "chicken", "basil", "lemon"]
- **Business Api Keys:** If you are the developer of the business then you will be given access to generating an Api key for the business website. Once generated the key will reveal itself ONLY ONCE, a `keyPrefix` displays the Api key up to 10 characters of the total hashed string for reference sake. If the developer forgot or lost their key they must regenerate the key again and use that in their .env file.

## Slug Design Choice

Slugs are system-generated URL-safe identifiers and locked. They are used for routing, public URLs, and stable data fetching.

Business users should not directly edit slugs because invalid or changed slugs could break public pages, image references, or existing links.

The only location where slugs are editable are in the items name change to help serve a function to search for items like this:

https://client-page.com/`<locationAddress>`/`categoryName`/`<itemSlug>`

Where the itemSlug is required but the other two params are optional. This will then send the params to the api route where it will search based on those values.

### Slug Rules

- Slugs are generated from the original name.
- Slugs are lowercase.
- Spaces are replaced with hyphens.
- Special characters are removed.
- Business slugs must be globally unique.
- Item slugs must be unique inside the same business.
- Slugs are not directly editable.

### Examples

| Source Name                 | Generated Slug              |
| --------------------------- | --------------------------- |
| Tacos El Guero              | tacos-el-guero              |
| Bottle Water                | bottle-water                |
| Tacos with Cream and Cheese | tacos-with-cream-and-cheese |

### Current Slug Usage

| Model    | Reason                                             |
| -------- | -------------------------------------------------- |
| Business | Used to identify and fetch business-specific data. |
| Item     | Used for future item pages and stable item URLs.   |

## Out of Scope

- **Normal Customer Accounts:** At times some businesses would like to have normal user logins to encourage a point system. However, at this time, that would require additional models and at times a custom model for only that business. After MVP it is possible to integrate this feature but it is not a priority for the MVP.
- **Special Dates:** Special dates such as veterans day to signal when a particular day of the week will be closed requires automation so that it isn't added per year manually.

## Relationships

### Business Model

```txt
Business
├── BusinessApiKey[]
├── BusinessUser[]
└── Location[]
    ├── LocationDay[]
    │   ├── hour? → Hour (regular)
    │   └── specialHours[] → Hour
    ├── Category[]
    │   ├── parent? / subcategories[] → Category
    │   └── items[]
    ├── Contact[]
    ├── Social[]
    └── Item[]
```

`Item` has both `locationId` and `categoryId`. `Location.items` and `Category.items` refer to item records through those separate foreign keys. Category, Contact, Social, and Item records belong to locations, not directly to businesses.

### Ownership / Foreign Keys

| Foreign key                 | References       | On delete |
| --------------------------- | ---------------- | --------- |
| `BusinessApiKey.businessId` | `Business.id`    | Cascade   |
| `BusinessUser.businessId`   | `Business.id`    | Cascade   |
| `BusinessUser.userId`       | `User.id`        | Cascade   |
| `BusinessUser.roleId`       | `Role.id`        | Cascade   |
| `Account.userId`            | `User.id`        | Cascade   |
| `Session.userId`            | `User.id`        | Cascade   |
| `Location.businessId`       | `Business.id`    | Cascade   |
| `LocationDay.locationId`    | `Location.id`    | Cascade   |
| `Hour.regularDayId`         | `LocationDay.id` | Cascade   |
| `Hour.specialDayId`         | `LocationDay.id` | Cascade   |
| `Category.locationId`       | `Location.id`    | Cascade   |
| `Category.parentId`         | `Category.id`    | Restrict  |
| `Contact.locationId`        | `Location.id`    | Cascade   |
| `Social.locationId`         | `Location.id`    | Cascade   |
| `Item.locationId`           | `Location.id`    | Cascade   |
| `Item.categoryId`           | `Category.id`    | Cascade   |
| `ItemOption.itemId`         | `Item.id`        | Cascade   |
