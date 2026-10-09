---
title: Admin API
code-paths  
  - apps/platform/src/app/api/account
  - apps/platform/src/app/api/businesses
  - apps/platform/src/app/api/businesses/[businessId]
  - apps/platform/src/app/api/businesses/[businessId]/api-keys
  - apps/platform/src/app/api/businesses/[businessId]/image
  - apps/platform/src/app/api/businesses/[businessId]/users
  - apps/platform/src/app/api/businesses/[businessId]/locations
  - apps/platform/src/app/api/user
  - apps/platform/src/lib/auth/authenticateBusinessAccess.ts
  - apps/platform/src/app/api/route_helper.ts

last-verified: 2026-10-09
status: planned
---

# Admin API Routes

Used by the platform dashboard to create, update, and delete business data.

These routes replace the deprecated `/api/admin/*` routes. Every business resource is now addressed through its business (and location) in the URL instead of being inferred from the session.

Go to [docs/api_routes/publicAPI.md](../../docs/api_routes/publicAPI.md) to view the read-only public route documentation.

For the document describing how images are stored and managed, see [S3 Storage](../s3-storage.md).

## Authentication

All admin routes use the logged-in user's Auth.js session. These routes are exclusive to the platform dashboard and workspace and are not open to public access, so Business API keys are **never** accepted here. Client websites should use the [Public API](../../docs/api_routes/publicAPI.md) instead.

Routes under `/api/businesses/[businessId]` also verify that the user is linked to that business through a `BusinessUser` record and that their role is one of the route's allowed access levels. This is handled by `authenticateBusinessAccess()`.

|     | Status                                                       | Reason |
| --- | ------------------------------------------------------------ | ------ |
| 401 | No valid session                                             |
| 403 | User does not belong to the business, or role is not allowed |

Each route lists its allowed roles under **Access**. See [AccessLevel](../../../../packages/database/docs/database-models.md#accesslevel) for what each role means.

## Route Params

Most routes share these params. They are not repeated in every route below.

| Param      | Type | Note                                |
| ---------- | ---- | ----------------------------------- |
| businessId | UUID | The `Business` the request acts on  |
| locationId | UUID | The `Location` inside that business |

Any other params (`categoryId`, `itemId`, etc.) are listed per route. Every child record is checked against its parent, so an `itemId` from another location will not be found.

## Sync Fields

Contacts, socials, categories, items, item options, location days, and hours can be **synchronized** across every location of a business. Synced records share a `syncGroupId`.

Routes that support this are marked with a `SYNC` badge and require one of these body fields:

| Method | Field             | Meaning                                                                                       |
| ------ | ----------------- | --------------------------------------------------------------------------------------------- |
| POST   | `isSynced`        | `true` creates the record in every location, `false` only in the selected location            |
| PATCH  | `isSynced`        | `true` updates every synced record in the group, `false` updates (and un-syncs) only this one |
| DELETE | `deleteAllSynced` | `true` deletes every synced record in the group, `false` deletes only this one                |

Synced requests return a summary instead of the record:

```json
{
  "message": "String",
  "count": "Int",
  "syncGroupId": "UUID"
}
```

A record that was un-synced (`isSynced: false`) keeps its `syncGroupId` and is skipped by later synced updates and deletes until it is synced again.

Because DELETE routes read `deleteAllSynced`, they **require a JSON body**.

## Account

Routes for the logged-in user's own account. These only require a session.

### GET /api/account

Fetches the logged-in user's account.

#### Response

```json
{
  "id": "UUID",
  "name": "String | null",
  "username": "String | null",
  "email": "String",
  "image": "String | null",
  "createdAt": "DateTime",
  "updatedAt": "DateTime"
}
```

#### Used For

- Account settings

### PATCH /api/account

Updates the logged-in user's name and/or username. At least one field is required.

#### Request Body

```json
{
  "name": "String",
  "username": "String"
}
```

#### Response

Same as [GET /api/account](#get-apiaccount).

## User

Routes for per-user dashboard state. These only require a session.

### PATCH /api/user/dashboard-tour

Marks the dashboard tour as completed by saving the current tour version on the user.

No request body.

#### Response

```json
{
  "dashboardTourVersion": "Int"
}
```

### PATCH /api/user/workspace-tour

Marks the workspace tour as completed by saving the current tour version on the user.

No request body.

#### Response

```json
{
  "workspaceTourVersion": "Int"
}
```

#### Used For

- Hiding a tour once the user has finished it
- Re-showing a tour when its version is bumped

## Businesses

### GET /api/businesses

Fetches every business the logged-in user belongs to, oldest membership first. Only requires a session.

#### Response

```json
[
  {
    "id": "UUID",
    "role": {
      "accessLevel": "owner | admin | staff | developer"
    },
    "business": {
      "id": "UUID",
      "name": "String",
      "slug": "String",
      "domain": "String | null"
    }
  }
]
```

`id` is the `BusinessUser` id.

#### Used For

- Business switcher
- Choosing which business to load after login

### GET /api/businesses/[businessId]

Fetches the business and the logged-in user's role in it.

**Access:** `owner`, `admin`, `staff`, `developer`

#### Response

```json
{
  "id": "UUID",
  "name": "String",
  "slug": "String",
  "domain": "String | null",
  "imageKey": "String (URL) | null",
  "originalImageKey": "String (URL) | null",
  "createdAt": "DateTime",
  "updatedAt": "DateTime",
  "role": {
    "accessLevel": "owner | admin | staff | developer",
    "description": "String"
  }
}
```

`imageKey` and `originalImageKey` are returned as viewable URLs, not raw S3 keys.

#### Used For

- Dashboard header and business settings
- Deciding which dashboard actions to show for the user's role

### PATCH /api/businesses/[businessId]

Updates the business name and/or domain. At least one field is required.

`domain` is normalized (lowercased, spaces become hyphens, unsupported characters removed). The `slug` is not changed.

**Access:** `owner`, `admin`

#### Request Body

```json
{
  "name": "String",
  "domain": "String"
}
```

#### Response

```json
{
  "id": "UUID",
  "name": "String",
  "slug": "String",
  "domain": "String | null",
  "createdAt": "DateTime",
  "updatedAt": "DateTime"
}
```

## Business Image

Business images are stored as two files: the cropped `image` shown on the site and the uncropped `originalImage` used to re-crop later.

Images must be JPEG, PNG, or WebP and 10 MB or less.

### POST /api/businesses/[businessId]/image

Uploads the business image. Fails with `409` if the business already has one. Use PATCH to replace it.

**Access:** `owner`, `admin`

#### Request Body (multipart/form-data)

| Key           | Type | Required |
| ------------- | ---- | -------- |
| image         | File | Yes      |
| originalImage | File | Yes      |

#### Response `201`

```json
{
  "message": "String",
  "business": {
    "id": "UUID",
    "imageKey": "String",
    "originalImageKey": "String",
    "updatedAt": "DateTime"
  }
}
```

### PATCH /api/businesses/[businessId]/image

Replaces the business image. Fails with `409` if the business has no image yet.

Send only `image` to re-crop the existing original. Send `originalImage` too when the user picked a new source image.

**Access:** `owner`, `admin`

#### Request Body (multipart/form-data)

| Key           | Type | Required |
| ------------- | ---- | -------- |
| image         | File | Yes      |
| originalImage | File | No       |

#### Response

Same shape as [POST](#post-apibusinessesbusinessidimage), with status `200`.

### DELETE /api/businesses/[businessId]/image

Removes both business images from the record and from S3.

**Access:** `owner`, `admin`

No request body.

#### Response

Same shape as [POST](#post-apibusinessesbusinessidimage) with `imageKey` and `originalImageKey` set to `null`.

## API Keys

### GET /api/businesses/[businessId]/api-keys

Fetches all Business API keys, newest first. The full key is never returned after creation.

**Access:** `developer`, `owner`, `admin`, `staff`

#### Response

```json
[
  {
    "id": "UUID",
    "businessId": "UUID",
    "name": "String",
    "keyPrefix": "String",
    "isActive": "Boolean",
    "createdAt": "DateTime",
    "updatedAt": "DateTime"
  }
]
```

#### Used For

- Developer Dashboard API key management

### POST /api/businesses/[businessId]/api-keys

Creates a new Business API key.

**Access:** `developer`

#### Security Notes

Business API keys are intended for server-to-server communication only.

The raw `apiKey` is returned **only once** in this response and cannot be retrieved again. Store it securely before leaving the creation screen. On a client website, keep it in an environment variable, for example:

```env
BUSINESS_PLATFORM_API_KEY=bp_example_key_here
```

#### Request Body

```json
{
  "name": "String"
}
```

#### Response `201`

```json
{
  "apiKey": "String",
  "key": {
    "id": "UUID",
    "name": "String",
    "keyPrefix": "String",
    "isActive": "Boolean",
    "createdAt": "DateTime"
  }
}
```

### PATCH /api/businesses/[businessId]/api-keys/[apiKeyId]

Renames or enables/disables a key. At least one field is required.

**Access:** `developer`

| Param    | Type | Note                           |
| -------- | ---- | ------------------------------ |
| apiKeyId | UUID | The `BusinessApiKey` to update |

#### Request Body

```json
{
  "name": "String",
  "isActive": "Boolean"
}
```

#### Response

```json
{
  "id": "UUID",
  "name": "String",
  "keyPrefix": "String",
  "isActive": "Boolean",
  "createdAt": "DateTime",
  "updatedAt": "DateTime"
}
```

### DELETE /api/businesses/[businessId]/api-keys/[apiKeyId]

Permanently deletes a key. Any website using it loses access immediately. To pause a key instead, PATCH `isActive` to `false`.

**Access:** `developer`

| Param    | Type | Note                           |
| -------- | ---- | ------------------------------ |
| apiKeyId | UUID | The `BusinessApiKey` to delete |

No request body.

#### Response

```json
{
  "message": "String"
}
```

## Business Users

A `BusinessUser` links a `User` to a business with a role. The logged-in user's own role comes from [GET /api/businesses/[businessId]](#get-apibusinessesbusinessid), not from these routes.

### GET /api/businesses/[businessId]/users

Fetches every other user in the business, sorted by email. The logged-in user is excluded.

**Access:** `owner`, `admin`, `staff`

#### Query Params

| Param  | Type | Required | Note                                                           |
| ------ | ---- | -------- | -------------------------------------------------------------- |
| userId | UUID | No       | Only return this user. Returns `400` if it is your own userId. |

#### Response

```json
[
  {
    "id": "UUID",
    "businessId": "UUID",
    "userId": "UUID",
    "roleId": "UUID",
    "createdAt": "DateTime",
    "updatedAt": "DateTime",
    "user": {
      "id": "UUID",
      "name": "String | null",
      "username": "String | null",
      "email": "String",
      "image": "String | null",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    },
    "role": {
      "id": "UUID",
      "accessLevel": "owner | admin | staff | developer",
      "description": "String"
    }
  }
]
```

`id` is the `businessUserId` used by the PATCH and DELETE routes.

#### Used For

- Team / members page

### GET /api/businesses/[businessId]/users/search?email

Looks up a user by exact email before adding them. Returns `404` if no user has that email and `400` if they already belong to this business.

**Access:** `owner`, `admin`

#### Query Params

| Param | Type   | Required | Example          |
| ----- | ------ | -------- | ---------------- |
| email | String | Yes      | `test@gmail.com` |

#### Response

```json
{
  "id": "UUID",
  "name": "String | null",
  "username": "String | null",
  "email": "String",
  "emailVerified": "DateTime | null",
  "image": "String | null",
  "createdAt": "DateTime",
  "businesses": []
}
```

#### Used For

- Finding users to add to your business

### POST /api/businesses/[businessId]/users

Adds an existing user to the business with a role. The user must already have an account (Auth.js creates the `User` record on sign-in).

**Access:** `owner`, `admin`

#### Request Body

```json
{
  "email": "String",
  "accessLevel": "owner | admin | staff | developer"
}
```

#### Response `201`

Same shape as one entry from [GET /api/businesses/[businessId]/users](#get-apibusinessesbusinessidusers).

### PATCH /api/businesses/[businessId]/users/[businessUserId]

Changes a member's role. This does not change the user's account data.

**Access:** `owner`, `admin`

| Param          | Type | Note                         |
| -------------- | ---- | ---------------------------- |
| businessUserId | UUID | The `BusinessUser` to update |

Rules:

- You cannot change your own role (`403`).
- Admins cannot change the owner's role (`403`).
- Only the owner can set `accessLevel` to `owner`. This is an **ownership transfer**: the selected member becomes owner and the current owner becomes admin, in one transaction.

#### Request Body

```json
{
  "accessLevel": "owner | admin | staff | developer"
}
```

#### Response

```json
{
  "id": "UUID",
  "businessId": "UUID",
  "userId": "UUID",
  "roleId": "UUID",
  "updatedAt": "DateTime",
  "user": {
    "id": "UUID",
    "name": "String | null",
    "username": "String | null",
    "email": "String",
    "image": "String | null"
  },
  "role": {
    "id": "UUID",
    "accessLevel": "owner | admin | staff | developer",
    "description": "String"
  }
}
```

An ownership transfer also includes `createdAt`.

### DELETE /api/businesses/[businessId]/users/[businessUserId]

Removes a member from the business. The `User` record and any business data are not deleted.

**Access:** `owner`, `admin`

| Param          | Type | Note                         |
| -------------- | ---- | ---------------------------- |
| businessUserId | UUID | The `BusinessUser` to remove |

Rules:

- You cannot remove yourself through this route (`403`).
- Admins cannot remove the owner (`403`).

No request body.

#### Response

```json
{
  "message": "String"
}
```

## Locations

A location is a physical place of the business. Locations themselves are **not** synced.

### POST /api/businesses/[businessId]/locations

Creates a location. Addresses must be unique within the business (`409`).

**Access:** `owner`, `admin`

#### Request Body

```json
{
  "address": "String",
  "city": "String | null",
  "state": "String | null",
  "zip": "String | null",
  "country": "String | null",
  "parking": "Boolean"
}
```

Only `address` is required.

#### Response `201`

```json
{
  "message": "String",
  "location": {
    "id": "UUID",
    "address": "String",
    "zip": "String | null",
    "country": "String | null",
    "state": "String | null",
    "city": "String | null",
    "parking": "Boolean",
    "isActive": "Boolean"
  }
}
```

### PATCH /api/businesses/[businessId]/locations/[locationId]

Updates a location.

This route **replaces** the location fields. Any optional field left out is reset (`zip`, `country`, `state`, `city` to `null`, `parking` and `enableHours` to `false`, `isActive` to `true`), so always send the full location.

**Access:** `owner`, `admin`

#### Request Body

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

#### Response

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

### DELETE /api/businesses/[businessId]/locations/[locationId]

Deletes a location. Its days, hours, categories, items, options, contacts, and socials are deleted with it. Warn the user before allowing this.

**Access:** `owner`, `admin`

No request body.

#### Response

```json
{
  "message": "String"
}
```

### GET /api/businesses/[businessId]/locations/[locationId]/overview

Fetches everything the dashboard overview needs for one location in a single request. Days are sorted Monday to Sunday and top-level categories by `order`.

**Access:** `owner`, `admin`, `staff`

#### Response

```json
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
  "enableHours": "Boolean",
  "createdAt": "DateTime",
  "updatedAt": "DateTime",
  "days": [
    {
      "id": "UUID",
      "locationId": "UUID",
      "dayOfWeek": "Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday",
      "isClosed": "Boolean",
      "syncGroupId": "UUID | null",
      "createdAt": "DateTime",
      "updatedAt": "DateTime",
      "hour": {
        "id": "UUID",
        "openTime": "HH:MM",
        "closeTime": "HH:MM",
        "title": "String | null",
        "note": "String | null",
        "isDisabled": "Boolean",
        "syncGroupId": "UUID | null",
        "isSynced": "Boolean",
        "createdAt": "DateTime",
        "updatedAt": "DateTime"
      }
    }
  ],
  "categories": [
    {
      "id": "UUID",
      "locationId": "UUID",
      "name": "String",
      "description": "String | null",
      "order": "Int",
      "isVisible": "Boolean",
      "items": [],
      "subcategories": [],
      "syncGroupId": "UUID | null",
      "isSynced": "Boolean",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    }
  ],
  "items": [
    {
      "id": "UUID",
      "locationId": "UUID",
      "categoryId": "UUID",
      "name": "String",
      "description": "String | null",
      "containsList": "String[]",
      "calories": "Int | null",
      "price": "String",
      "order": "Int",
      "isAvailable": "Boolean",
      "slug": "String",
      "imageKey": "String | null",
      "syncGroupId": "UUID | null",
      "isSynced": "Boolean",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    }
  ],
  "contacts": [
    {
      "id": "UUID",
      "locationId": "UUID",
      "phoneNumber": "String | null",
      "email": "String | null",
      "isPersonal": "Boolean",
      "syncGroupId": "UUID | null",
      "isSynced": "Boolean",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    }
  ],
  "socials": [
    {
      "id": "UUID",
      "locationId": "UUID",
      "domain": "String",
      "profileName": "String",
      "url": "String",
      "icon": "String",
      "syncGroupId": "UUID | null",
      "isSynced": "Boolean",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    }
  ]
}
```

`hour` is the day's regular hour (or `null`). Special hours are not included. In `categories`, `items` and `subcategories` are the full related records.

#### Used For

- Dashboard overview page

## Location Days

A location's schedule is always a full week of 7 `LocationDay` records. Each day can have one regular hour and any number of special hours.

### POST /api/businesses/[businessId]/locations/[locationId]/days `SYNC`

Creates the full weekly schedule. All 7 days must be sent exactly once.

When `isSynced` is `true`, the week is created for **every location in the business that has no days yet**, and each weekday gets its own `syncGroupId` (all Mondays share one, all Tuesdays share another, and so on). `isSynced` is optional here and defaults to `false`.

**Access:** `owner`, `admin`

#### Request Body

```json
{
  "isSynced": "Boolean",
  "days": [
    { "dayOfWeek": "Monday", "isClosed": false },
    { "dayOfWeek": "Tuesday", "isClosed": false },
    { "dayOfWeek": "Wednesday", "isClosed": false },
    { "dayOfWeek": "Thursday", "isClosed": false },
    { "dayOfWeek": "Friday", "isClosed": false },
    { "dayOfWeek": "Saturday", "isClosed": true },
    { "dayOfWeek": "Sunday", "isClosed": true }
  ]
}
```

`dayOfWeek` is case-insensitive. `isClosed` defaults to `false`.

#### Response `201`

```json
{
  "message": "String",
  "count": "Int"
}
```

### DELETE /api/businesses/[businessId]/locations/[locationId]/days

Deletes the whole weekly schedule (and all of its hours) for the selected location only. Other locations are not affected, even if their days are synced.

**Access:** `owner`, `admin`

No request body.

#### Response

```json
{
  "message": "String",
  "count": "Int"
}
```

### PATCH /api/businesses/[businessId]/locations/[locationId]/days/[dayId] `SYNC`

Opens or closes a day.

**Access:** `owner`, `admin`

| Param | Type | Note                        |
| ----- | ---- | --------------------------- |
| dayId | UUID | The `LocationDay` to update |

#### Request Body

```json
{
  "isClosed": "Boolean",
  "isSynced": "Boolean"
}
```

#### Response

```json
{
  "id": "UUID",
  "locationId": "UUID",
  "dayOfWeek": "Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday",
  "isClosed": "Boolean",
  "syncGroupId": "UUID | null",
  "isSynced": "Boolean",
  "updatedAt": "DateTime"
}
```

A synced update returns the same record with an added `message`.

## Hours

Hours belong to a `LocationDay` and are either **regular** (one per day) or **special** (many per day, but they cannot overlap each other). Times use `HH:MM` 24-hour format and `openTime` must be earlier than `closeTime`.

Displaying hours on the site is toggled with the location's `enableHours`.

### POST /api/businesses/[businessId]/locations/[locationId]/days/[dayId]/hours `SYNC`

Adds a regular or special hour to a day.

- Regular: fails with `409` if the day (or any synced day) already has one.
- Special: fails with `409` if it overlaps an existing special hour on the day (or any synced day).
- Synced: the selected day must belong to a sync group.

**Access:** `owner`, `admin`

| Param | Type | Note                                 |
| ----- | ---- | ------------------------------------ |
| dayId | UUID | The `LocationDay` to add the hour to |

#### Request Body

```json
{
  "openTime": "HH:MM",
  "closeTime": "HH:MM",
  "isSpecial": "Boolean",
  "isSynced": "Boolean",
  "title": "String | null",
  "note": "String | null"
}
```

#### Response `201`

```json
{
  "id": "UUID",
  "regularDayId": "UUID | null",
  "specialDayId": "UUID | null",
  "openTime": "HH:MM",
  "closeTime": "HH:MM",
  "title": "String | null",
  "note": "String | null",
  "isDisabled": "Boolean",
  "syncGroupId": "UUID | null",
  "isSynced": "Boolean",
  "createdAt": "DateTime",
  "updatedAt": "DateTime"
}
```

### PATCH /api/businesses/[businessId]/locations/[locationId]/days/[dayId]/hours/[hourId] `SYNC`

Updates an hour. `openTime` and `closeTime` fall back to the current values when left out. Special hours are re-checked for overlaps.

**Access:** `owner`, `admin`

| Param  | Type | Note                                  |
| ------ | ---- | ------------------------------------- |
| dayId  | UUID | The `LocationDay` the hour belongs to |
| hourId | UUID | The `Hour` to update                  |

#### Request Body

```json
{
  "isSynced": "Boolean",
  "openTime": "HH:MM",
  "closeTime": "HH:MM",
  "title": "String | null",
  "note": "String | null",
  "isDisabled": "Boolean"
}
```

Only `isSynced` is required.

#### Response

Same as the [POST](#post-apibusinessesbusinessidlocationslocationiddaysdayidhours-sync) response without `createdAt`. A synced update only returns `{ "message": "String" }`.

### DELETE /api/businesses/[businessId]/locations/[locationId]/days/[dayId]/hours/[hourId] `SYNC`

Deletes an hour.

**Access:** `owner`, `admin`

| Param  | Type | Note                                  |
| ------ | ---- | ------------------------------------- |
| dayId  | UUID | The `LocationDay` the hour belongs to |
| hourId | UUID | The `Hour` to delete                  |

#### Request Body

```json
{
  "deleteAllSynced": "Boolean"
}
```

#### Response

```json
{
  "message": "String"
}
```

A synced delete also returns `count`.

## Categories

Categories are ordered per location by `order`. A subcategory is a category with a `parentId`. Only one level of nesting is allowed.

### POST /api/businesses/[businessId]/locations/[locationId]/categories `SYNC`

Creates a top-level category at the end of the list. When synced, it is added to the end of every location's list.

**Access:** `owner`, `admin`

#### Request Body

```json
{
  "name": "String",
  "description": "String | null",
  "isSynced": "Boolean"
}
```

#### Response `201`

```json
{
  "id": "UUID",
  "locationId": "UUID",
  "name": "String",
  "description": "String | null",
  "order": "Int",
  "isVisible": "Boolean",
  "syncGroupId": "UUID | null",
  "isSynced": "Boolean",
  "createdAt": "DateTime",
  "updatedAt": "DateTime"
}
```

### POST /api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/subcategory `SYNC`

Creates a subcategory at the end of a top-level category. Fails with `400` if `categoryId` is already a subcategory. When synced, the parent category must belong to a sync group and the subcategory is added under every synced copy of the parent.

**Access:** `owner`, `admin`

| Param      | Type | Note                          |
| ---------- | ---- | ----------------------------- |
| categoryId | UUID | The parent top-level category |

#### Request Body

```json
{
  "name": "String",
  "description": "String | null",
  "isSynced": "Boolean"
}
```

#### Response `201`

Same as [POST categories](#post-apibusinessesbusinessidlocationslocationidcategories-sync) plus `parentId`.

### PATCH /api/businesses/[businessId]/locations/[locationId]/categories/[categoryId] `SYNC`

Updates a category. `order` cannot be changed here, use the move routes.

**Access:** `owner`, `admin`

| Param      | Type | Note                     |
| ---------- | ---- | ------------------------ |
| categoryId | UUID | The `Category` to update |

#### Request Body

```json
{
  "name": "String",
  "description": "String | null",
  "isVisible": "Boolean",
  "isSynced": "Boolean"
}
```

`name` and `isSynced` are required.

#### Response

```json
{
  "id": "UUID",
  "locationId": "UUID",
  "name": "String",
  "description": "String | null",
  "order": "Int",
  "isVisible": "Boolean",
  "syncGroupId": "UUID | null",
  "isSynced": "Boolean",
  "updatedAt": "DateTime"
}
```

### PATCH /api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/move-up

Swaps the category's `order` with the category directly above it (same parent, same location). Returns `400` if it is already at the top. Ordering is never synced.

```text
[ Order: 1 | Drinks ]          [ Order: 1 | Tacos  ]
[ Order: 2 | Tacos  ]   --->   [ Order: 2 | Drinks ]
[ Order: 3 | Sides  ]          [ Order: 3 | Sides  ]
```

**Access:** `owner`, `admin`

| Param      | Type | Note                   |
| ---------- | ---- | ---------------------- |
| categoryId | UUID | The `Category` to move |

No request body.

#### Response

```json
{
  "id": "UUID",
  "locationId": "UUID",
  "parentId": "UUID | null",
  "name": "String",
  "description": "String | null",
  "order": "Int",
  "isVisible": "Boolean",
  "syncGroupId": "UUID | null",
  "isSynced": "Boolean",
  "updatedAt": "DateTime"
}
```

### PATCH /api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/move-down

Same as [move-up](#patch-apibusinessesbusinessidlocationslocationidcategoriescategoryidmove-up), but swaps with the category directly below it. Returns `400` if it is already at the bottom. The response does not include `locationId` or `parentId`.

### DELETE /api/businesses/[businessId]/locations/[locationId]/categories/[categoryId] `SYNC`

Deletes a category and re-numbers the remaining top-level categories.

A category can only be deleted when it has no items and no subcategories (`409`). For a synced delete, this applies to every category in the group.

**Access:** `owner`, `admin`

| Param      | Type | Note                     |
| ---------- | ---- | ------------------------ |
| categoryId | UUID | The `Category` to delete |

#### Request Body

```json
{
  "deleteAllSynced": "Boolean"
}
```

#### Response

```json
{
  "message": "String"
}
```

## Category Items

An item always belongs to a category. Item `slug` is generated from `name` and must be unique within a location.

### POST /api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/items `SYNC`

Creates an item at the end of the category. Returns `409` if an item with the same slug already exists in the location (or any synced location). When synced, the category must belong to a sync group and the item is added to every synced copy of it.

**Access:** `owner`, `admin`

| Param      | Type | Note                              |
| ---------- | ---- | --------------------------------- |
| categoryId | UUID | The `Category` to add the item to |

#### Request Body

```json
{
  "name": "String",
  "price": "Number | String",
  "isSynced": "Boolean",
  "description": "String | null",
  "containsList": "String[]",
  "calories": "Int | null",
  "isAvailable": "Boolean"
}
```

`name`, `price`, and `isSynced` are required.

#### Response `201`

```json
{
  "id": "UUID",
  "locationId": "UUID",
  "categoryId": "UUID",
  "name": "String",
  "description": "String | null",
  "containsList": "String[]",
  "calories": "Int | null",
  "price": "String",
  "order": "Int",
  "isAvailable": "Boolean",
  "slug": "String",
  "imageKey": "String | null",
  "syncGroupId": "UUID | null",
  "isSynced": "Boolean",
  "createdAt": "DateTime",
  "updatedAt": "DateTime"
}
```

A synced create also returns `id`, the new item in the selected location, so the dashboard can open it right away.

### PATCH /api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/items/[itemId]/move-up

Swaps the item's `order` with the item directly above it in the category. Returns `400` if it is already at the top. Ordering is never synced.

**Access:** `owner`, `admin`

| Param      | Type | Note                          |
| ---------- | ---- | ----------------------------- |
| categoryId | UUID | The `Category` the item is in |
| itemId     | UUID | The `Item` to move            |

o request body.

#### Response

```json
{
  "id": "UUID",
  "locationId": "UUID",
  "categoryId": "UUID",
  "order": "Int",
  "updatedAt": "DateTime"
}
```

### PATCH /api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/items/[itemId]/move-down

Same as [move-up](#patch-apibusinessesbusinessidlocationslocationidcategoriescategoryiditemsitemidmove-up), but swaps with the item directly below it.

## Items

### PATCH /api/businesses/[businessId]/locations/[locationId]/items/[itemId] `SYNC`

Updates an item. The `slug` is regenerated from `name` (`409` if it clashes with another item). `order` and images are changed through their own routes.

Changing `isSynced` also moves the item's image:

- Un-syncing gives the item its own private copy of the shared image.
- Re-syncing switches the item to the group's shared image (or makes the item's image the shared one if the group has none).

**Access:** `owner`, `admin`

| Param  | Type | Note                 |
| ------ | ---- | -------------------- |
| itemId | UUID | The `Item` to update |

#### Request Body

```json
{
  "name": "String",
  "price": "Number | String",
  "isSynced": "Boolean",
  "description": "String | null",
  "containsList": "String[]",
  "calories": "Int | null",
  "isAvailable": "Boolean"
}
```

`name`, `price`, and `isSynced` are required.

#### Response

```json
{
  "id": "UUID",
  "locationId": "UUID",
  "categoryId": "UUID",
  "name": "String",
  "description": "String | null",
  "containsList": "String[]",
  "calories": "Int | null",
  "price": "String",
  "order": "Int",
  "isAvailable": "Boolean",
  "slug": "String",
  "imageKey": "String | null",
  "originalImageKey": "String | null",
  "syncGroupId": "UUID | null",
  "isSynced": "Boolean",
  "updatedAt": "DateTime"
}
```

A synced update returns the same record with an added `message`.

### DELETE /api/businesses/[businessId]/locations/[locationId]/items/[itemId] `SYNC`

Deletes an item and all of its options, then re-numbers the remaining items in the category. Item images are removed from S3 once no other item uses them. Warn the user before allowing this.

**Access:** `owner`, `admin`

| Param  | Type | Note                 |
| ------ | ---- | -------------------- |
| itemId | UUID | The `Item` to delete |

#### Request Body

```json
{
  "deleteAllSynced": "Boolean"
}
```

#### Response

```json
{
  "message": "String"
}
```

## Item Image

Like business images, items store a cropped `image` and an uncropped `originalImage`. Images must be JPEG, PNG, or WebP and 10 MB or less.

Synced items share one image in S3. These routes take `isSynced` as a form field, and the DELETE route takes `deleteAllSynced` as JSON.

### POST /api/businesses/[businessId]/locations/[locationId]/items/[itemId]/image `SYNC`

Uploads an item image. Fails with `409` if the item (or, when synced, the sync group) already has one. Use PATCH to replace it.

**Access:** `owner`, `admin`

| Param  | Type | Note                           |
| ------ | ---- | ------------------------------ |
| itemId | UUID | The `Item` to add the image to |

#### Request Body (multipart/form-data)

| Key           | Type                  | Required |
| ------------- | --------------------- | -------- |
| image         | File                  | Yes      |
| originalImage | File                  | Yes      |
| isSynced      | `"true"` \| `"false"` | Yes      |

#### Response `201`

```json
{
  "message": "String",
  "item": {
    "id": "UUID",
    "locationId": "UUID",
    "imageKey": "String",
    "originalImageKey": "String",
    "updatedAt": "DateTime"
  }
}
```

A synced upload returns `message`, `count`, `imageKey`, and `originalImageKey`.

### PATCH /api/businesses/[businessId]/locations/[locationId]/items/[itemId]/image `SYNC`

Replaces an item image. Fails with `409` if there is no image to replace.

Send only `image` to re-crop the existing original. Send `originalImage` too when the user picked a new source image. With `isSynced` set to `false` on a synced item, the shared image is left alone and the item gets its own private copy.

**Access:** `owner`, `admin`

| Param  | Type | Note                                |
| ------ | ---- | ----------------------------------- |
| itemId | UUID | The `Item` to replace the image for |

#### Request Body (multipart/form-data)

| Key           | Type                  | Required |
| ------------- | --------------------- | -------- |
| image         | File                  | Yes      |
| originalImage | File                  | No       |
| isSynced      | `"true"` \| `"false"` | Yes      |

#### Response

Same shape as [POST](#post-apibusinessesbusinessidlocationslocationiditemsitemidimage-sync), with status `200`. A synced replace only returns `message` and `count`.

### DELETE /api/businesses/[businessId]/locations/[locationId]/items/[itemId]/image `SYNC`

Removes an item's image. A shared image is only deleted from S3 when the whole group is cleared.

**Access:** `owner`, `admin`

| Param  | Type | Note                                |
| ------ | ---- | ----------------------------------- |
| itemId | UUID | The `Item` to remove the image from |

#### Request Body

```json
{
  "deleteAllSynced": "Boolean"
}
```

#### Response

Same shape as [POST](#post-apibusinessesbusinessidlocationslocationiditemsitemidimage-sync) with `imageKey` and `originalImageKey` set to `null`. A synced delete only returns `message`.

## Item Options

Options are ordered per item by `order`.

### POST /api/businesses/[businessId]/locations/[locationId]/items/[itemId]/options `SYNC`

Creates an option at the end of the item's list. When synced, the item must belong to a sync group and the option is added to every synced copy of it.

**Access:** `owner`, `admin`

| Param  | Type | Note                            |
| ------ | ---- | ------------------------------- |
| itemId | UUID | The `Item` to add the option to |

#### Request Body

```json
{
  "name": "String",
  "price": "Number | String",
  "isSynced": "Boolean",
  "isAvailable": "Boolean"
}
```

`name`, `price`, and `isSynced` are required.

#### Response `201`

```json
{
  "id": "UUID",
  "itemId": "UUID",
  "name": "String",
  "price": "String",
  "order": "Int",
  "isAvailable": "Boolean",
  "syncGroupId": "UUID | null",
  "isSynced": "Boolean",
  "createdAt": "DateTime",
  "updatedAt": "DateTime"
}
```

### PATCH /api/businesses/[businessId]/locations/[locationId]/items/[itemId]/options/[optionId] `SYNC`

Updates an option.

**Access:** `owner`, `admin`

| Param    | Type | Note                        |
| -------- | ---- | --------------------------- |
| itemId   | UUID | The `Item` the option is on |
| optionId | UUID | The `ItemOption` to update  |

#### Request Body

Same as [POST options](#post-apibusinessesbusinessidlocationslocationiditemsitemidoptions-sync).

#### Response

Same as the POST response without `createdAt`. A synced update only returns `{ "message": "String" }`.

### PATCH /api/businesses/[businessId]/locations/[locationId]/items/[itemId]/options/[optionId]/move-up

Swaps the option's `order` with the option directly above it. Returns `400` if it is already at the top. Ordering is never synced.

**Access:** `owner`, `admin`

| Param    | Type | Note                        |
| -------- | ---- | --------------------------- |
| itemId   | UUID | The `Item` the option is on |
| optionId | UUID | The `ItemOption` to move    |

No request body.

#### Response

```json
{
  "id": "UUID",
  "itemId": "UUID",
  "order": "Int",
  "updatedAt": "DateTime"
}
```

### PATCH /api/businesses/[businessId]/locations/[locationId]/items/[itemId]/options/[optionId]/move-down

Same as [move-up](#patch-apibusinessesbusinessidlocationslocationiditemsitemidoptionsoptionidmove-up), but swaps with the option directly below it.

### DELETE /api/businesses/[businessId]/locations/[locationId]/items/[itemId]/options/[optionId] `SYNC`

Deletes an option and re-numbers the remaining options on the item.

**Access:** `owner`, `admin`

| Param    | Type | Note                        |
| -------- | ---- | --------------------------- |
| itemId   | UUID | The `Item` the option is on |
| optionId | UUID | The `ItemOption` to delete  |

#### Request Body

```json
{
  "deleteAllSynced": "Boolean"
}
```

#### Response

```json
{
  "message": "String"
}
```

## Contacts

### POST /api/businesses/[businessId]/locations/[locationId]/contacts `SYNC`

Creates a contact. A contact needs a phone number, an email, or both.

**Access:** `owner`, `admin`

#### Request Body

```json
{
  "phoneNumber": "String | null",
  "email": "String | null",
  "isPersonal": "Boolean",
  "isSynced": "Boolean"
}
```

#### Response `201`

```json
{
  "id": "UUID",
  "locationId": "UUID",
  "phoneNumber": "String | null",
  "email": "String | null",
  "isPersonal": "Boolean",
  "isSynced": "Boolean",
  "syncGroupId": "UUID | null",
  "createdAt": "DateTime",
  "updatedAt": "DateTime"
}
```

### PATCH /api/businesses/[businessId]/locations/[locationId]/contacts/[contactId] `SYNC`

Updates a contact. Send the full contact, since `phoneNumber`, `email`, and `isPersonal` are all overwritten.

**Access:** `owner`, `admin`

| Param     | Type | Note                    |
| --------- | ---- | ----------------------- |
| contactId | UUID | The `Contact` to update |

#### Request Body

Same as [POST contacts](#post-apibusinessesbusinessidlocationslocationidcontacts-sync).

#### Response

Same as the POST response without `createdAt`. A synced update adds a `message`.

### DELETE /api/businesses/[businessId]/locations/[locationId]/contacts/[contactId] `SYNC`

Deletes a contact.

**Access:** `owner`, `admin`

| Param     | Type | Note                    |
| --------- | ---- | ----------------------- |
| contactId | UUID | The `Contact` to delete |

#### Request Body

```json
{
  "deleteAllSynced": "Boolean"
}
```

#### Response

```json
{
  "message": "String"
}
```

## Socials

The `url` is built by the server as `https://{domain}/{profileName as a slug}`. `icon` is the S3 key of a supported platform icon chosen from a dropdown in the dashboard.

### POST /api/businesses/[businessId]/locations/[locationId]/socials `SYNC`

Creates a social link.

**Access:** `owner`, `admin`

#### Request Body

```json
{
  "domain": "instagram.com",
  "profileName": "String",
  "icon": "String",
  "isSynced": "Boolean"
}
```

#### Response `201`

```json
{
  "id": "UUID",
  "locationId": "UUID",
  "domain": "String",
  "profileName": "String",
  "url": "String",
  "icon": "String",
  "isSynced": "Boolean",
  "syncGroupId": "UUID | null",
  "createdAt": "DateTime",
  "updatedAt": "DateTime"
}
```

### PATCH /api/businesses/[businessId]/locations/[locationId]/socials/[socialId] `SYNC`

Updates a social link and rebuilds its `url`. `domain`, `profileName`, and `icon` are all required.

**Access:** `owner`, `admin`

| Param    | Type | Note                   |
| -------- | ---- | ---------------------- |
| socialId | UUID | The `Social` to update |

#### Request Body

Same as [POST socials](#post-apibusinessesbusinessidlocationslocationidsocials-sync).

#### Response

```json
{
  "id": "UUID",
  "domain": "String",
  "profileName": "String",
  "url": "String",
  "icon": "String",
  "syncGroupId": "UUID | null",
  "isSynced": "Boolean"
}
```

A synced update adds a `message`.

### DELETE /api/businesses/[businessId]/locations/[locationId]/socials/[socialId] `SYNC`

Deletes a social link.

**Access:** `owner`, `admin`

| Param    | Type | Note                   |
| -------- | ---- | ---------------------- |
| socialId | UUID | The `Social` to delete |

#### Request Body

```json
{
  "deleteAllSynced": "Boolean"
}
```

#### Response

```json
{
  "message": "String"
}
```

ay is located. |
| dayId | UUID | The ID of the `LocationDay` record where the hour is located. |
| hourId | UUID | The ID of the `Hour` record to update. |

Example request body:

> Disabling the hour

```json
{
  "isDisabled": true
}
```

### DELETE /api/admin/locations/[locationId]/days/[dayId]/hours/[hourId]

Delete an hour row by its `hourId`.

#### Route Param Required

| Param         | Type | Note                                                          |
| ------------- | ---- | ------------------------------------------------------------- |
| locationId    | UUID | The ID of the `Location` record where the day is located.     |
| dayId         | UUID | The ID of the `LocationDay` record where the hour is located. |
| hourId        | UUID | The ID of the `Hour` record to delete.                        |
| y is located. |
| dayId         | UUID | The ID of the `LocationDay` record where the hour is located. |
| hourId        | UUID | The ID of the `Hour` record to update.                        |

Example request body:

> Disabling the hour

```json
{
  "isDisabled": true
}
```

### DELETE /api/admin/locations/[locationId]/days/[dayId]/hours/[hourId]

Delete an hour row by its `hourId`.

#### Route Param Required

| Param      | Type | Note                                                          |
| ---------- | ---- | ------------------------------------------------------------- |
| locationId | UUID | The ID of the `Location` record where the day is located.     |
| dayId      | UUID | The ID of the `LocationDay` record where the hour is located. |
| hourId     | UUID | The ID of the `Hour` record to delete.                        |
