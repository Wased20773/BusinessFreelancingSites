---
title: Admin API
code-paths:
  - 

last-verified: 2026-07-08
status: in-progress
---

# Admin API Routes

Used by the platform admin dashboard to create, update, and delete business data.

These routes should require authentication and business access checks later.

To view the full JSON return values per route, go to [Admin API Responses](../../docs/api_routes/response/adminAPI.md).

#### Query Params

All request require:

| Param | Type | Required | Example |
| --- | --- | --- | --- |
| slug | string | yes | tacos-el-guero |

## Account

### GET /api/admin/account

Fetches the logged-in user's account information and access level for the current business.

#### Returns

- Name
- Username
- Email
- image
- BusinessUserId
- [AccessLevel](../../../../packages/database/docs/database-models.md#access-level-choices)
- Access Level Description

#### Used For

- Admin Dashboard
  - Settings

### GET /api/admin/account/search?email

Fetches a user by email.

#### Required Params

| Param | Type | Required | Example |
| --- | --- | --- | --- |
| email | string | yes | `test@gmail.com` |

#### Returns

- Name
- Username
- email
- image

#### Used For

- Finding users to add to your business

### PATCH /api/admin/account

Updates the logged-in user's public-facing account data.

Example request body:

> Updating your username (empty on creation)

```json
{
  "username": "John123"
}
```

### PATCH /api/admin/account/email

(Deprecated: OAuth logins would no longer match correctly)

Updates the logged-in user's email.

The user must provide their current password before the email can be changed.

Example request body:

> Updating your email

```json
{
  "newEmail": "new@email.com",
  "password": "password_123"
}
```

### PATCH /api/admin/account/password

(Deprecated: User does not control their own password as its managed by OAuth providers)

Updates the logged-in user's password.

The current password must be verified before saving the new password. The new password is hashed before it is stored.

Example request body:

> Updating your password

```json
{
  "currentPassword": "password_123",
  "newPassword": "newpassword_123"
}
```

## Business Users

### GET /api/admin/business-users

Fetches all users linked to the business in a list

The authenticated user session determines which business users are returned

#### Returns

- BusinessUserId
- UserIds
- Names
- Usernames
- Emails
- [AccessLevel](../../../../packages/database/docs/database-models.md#access-level-choices)
- Access Level Description

#### Used For

- Admin Dashboard

### POST /api/admin/business-users

Adds businessUser entry to link the User with the current business and giving them a Role.

NOTE: Auth.js adds a User record to the database, this route helps link the created user with the business

Example request body:

> Adding user John to the business

```json
{
  "email": "John@email.com",
  "accessLevel": "admin"
}
```

### PATCH /api/admin/business-users/[businessUserId]

Updates a user's access level for the current business.

This route only updates the role assigned to the BusinessUser record. It does not update the user's account information.

#### Route Param Required

| Param | Type | Required | Note | Example |
| --- | --- | --- | --- | --- |
| businessUserId | UUID | Yes | The ID of the `BusinessUser` join record to delete. | /api/admin/business-users/789ef05f-562e-4d1d-ac3a-e9e093f5d453?slug=tacos-el-guero |

Example request body:

> Updating a user's access level

```json
{
  "accessLevel": "admin"
}
```

### DELETE /api/admin/business-users/[businessUserId]

Deletes a businessUser record to remove the connection between the user and that business via `businessUserId`. This does not delete a User record, or any other record tied to a businessUser record.

#### Frontend Note

When rendering the list of business users, attach the `businessUserId` to the delete action (for example, as a data attribute or within the component's state). When the user confirms deletion, pass that `businessUserId` to this route.

#### Route Param Required

| Param | Type | Required | Note | Example |
| --- | --- | --- | --- | --- |
| businessUserId | UUID | Yes | The ID of the `BusinessUser` join record to delete. | /api/admin/business-users/789ef05f-562e-4d1d-ac3a-e9e093f5d453?slug=tacos-el-guero |

## Categories

### POST /api/admin/categories

Adds a category row to the business.

Example request body:

> Creating a category for Tacos

```json
{
  "name": "Tacos",
  "description": "Traditional street tacos"
}
```

### PATCH /api/admin/categories/[categoryId]

Updates a category row by its `categoryId`. This cannot update the order value. This can only be done by move-up or move-down routes.

#### Route Param Required

| Param | Type | Required | Note | Example |
| --- | --- | --- | --- | --- |
| categoryId | UUID | Yes | The ID of the `Category` record to update. | /api/admin/categories/789ef05f-562e-4d1d-ac3a-e9e093f5d453?slug=tacos-el-guero |

Example request body:

> Disable a category from displaying on the frontend

```json
{
  "isVisible": false
}
```

### PATCH /api/admin/categories/[categoryId]/move-up

Moves a category one position up within the current business.

Moving up means swapping the selected category's `order` value with the category directly above it.

[ Order: 1 | Drinks ]

[ Order: 2 | Orders ]

[ Order: 3 | Toppings ]

If `Orders` moves up, it swaps order values with `Drinks`.

--- TO ---

[ Order: 1 | Orders ]

[ Order: 2 | Drinks ]

[ Order: 3 | Toppings ]

#### Route Param Required

| Param | Type | Required | Note | Example |
| --- | --- | --- | --- | --- |
| categoryId | UUID | Yes | The ID of the `Category` record to update. | /api/admin/categories/789ef05f-562e-4d1d-ac3a-e9e093f5d453?slug=tacos-el-guero |

No body request

### PATCH /api/admin/categories/[categoryId]/move-down

Moves a category one position down within the current business.

Moving down means swapping the selected category's `order` value with the category directly below it.

[ Order: 1 | Drinks ]

[ Order: 2 | Orders ]

[ Order: 3 | Toppings ]

If `Orders` moves down, it swaps order values with `Toppings`.

--- TO ---

[ Order: 1 | Drinks ]

[ Order: 2 | Toppings ]

[ Order: 3 | Orders ]

#### Route Param Required

| Param | Type | Required | Note | Example |
| --- | --- | --- | --- | --- |
| categoryId | UUID | Yes | The ID of the `Category` record to update. | /api/admin/categories/789ef05f-562e-4d1d-ac3a-e9e093f5d453?slug=tacos-el-guero |

No body request

### DELETE /api/admin/categories/[categoryId]

Deletes a category row by its `categoryId`.

Deletion of a category is only possible when there are no items attached to it.

## Category Items

### POST /api/admin/categories/[categoryId]/items

Adds a new item row to the category by `categoryId`.

A Category can exist without items, but an item can't exist without being attached to a category.

#### Route Param Required

| Param | Type | Required | Note | Example |
| --- | --- | --- | --- | --- |
| categoryId | UUID | Yes | The ID of the `Category` record to update. | /api/admin/categories/789ef05f-562e-4d1d-ac3a-e9e093f5d453?slug=tacos-el-guero |

Example request body:

> Adding the Taco item

```json
{
  "name": "Taco",
  "description": "Taco with onion and cilantro",
  "price": 2
}
```

### PATCH /api/admin/categories/[categoryId]/items/[itemId]/move-up

Moves an item one position up within its current category.

#### Route Param Required

| Param | Type | Required | Note | Example |
| --- | --- | --- | --- | --- |
| categoryId | UUID | Yes | The ID of the `Category` record to find the item. | /api/admin/categories/789ef05f-562e-4d1d-ac3a-e9e093f5d453/...?slug=tacos-el-guero |
| itemId | UUID | Yes | The Id of the `Item` record to move up | /api/admin/categories/.../60e6e05c-c1b8-423f-8266-bd116bc66898?slug=tacos-el-guero |

No body request

### PATCH /api/admin/categories/[categoryId]/items/[itemId]/move-down

Moves an item one position down within its current category.

#### Route Param Required

| Param | Type | Required | Note | Example |
| --- | --- | --- | --- | --- |
| categoryId | UUID | Yes | The ID of the `Category` record to find the item. | /api/admin/categories/789ef05f-562e-4d1d-ac3a-e9e093f5d453/...?slug=tacos-el-guero |
| itemId | UUID | Yes | The Id of the `Item` record to move up | /api/admin/categories/.../60e6e05c-c1b8-423f-8266-bd116bc66898?slug=tacos-el-guero |

No body request


## Items

### PATCH /api/admin/items/[itemId]

Updates an item row by its `itemId`.

This does not allow for order, slug, or imageKey to be updated. These are handled in separate routes, except for slug; slugs are not editable.

#### Route Param Required

| Param | Type | Required | Note | Example |
| --- | --- | --- | --- | --- |
| itemId | UUID | Yes | The ID of the `Item` record to update. | /api/admin/items/789ef05f-562e-4d1d-ac3a-e9e093f5d453?slug=tacos-el-guero |

Example request body:

> Changing an items description

```json
{
  "description": "Updated description for an item"
}
```

### PATCH /api/admin/items/[itemId]/image

Replaces an item's image by its `itemId`.

This route accepts an image file upload. The admin does not send an `imageKey` manually. The backend uploads the image to S3, generates the new `imageKey`, updates the item record, and returns the updated image reference.

Example request body:

> Replacing an item's image

```txt
multipart/form-data

image: File
```

### DELETE /api/admin/items/[itemId]

Deletes an item row by its `itemId`.

When deleting an item, all item options will also be deleted. Warn the user before allowing the action.

#### Route Param Required

| Param | Type | Required | Note | Example |
| --- | --- | --- | --- | --- |
| itemId | UUID | Yes | The ID of the `Item` record to delete. | /api/admin/items/789ef05f-562e-4d1d-ac3a-e9e093f5d453?slug=tacos-el-guero |

## Item Options

### POST /api/admin/items/[itemId]/options

Adds an option row to the item by `itemId`.

#### Route Param Required

| Param | Type | Required | Note | Example |
| --- | --- | --- | --- | --- |
| itemId | UUID | Yes | The ID of the `Item` record to add the option to. | /api/admin/items/789ef05f-562e-4d1d-ac3a-e9e093f5d453/options?slug=tacos-el-guero |

Example request body:

> Creating an option with extra cheese.

```json
{
  "name": "Extra Cheese",
  "price": 1.5
}
```

### PATCH /api/admin/items/[itemId]/options/[optionId]

Updates an item option row by its `optionId`.

#### Route Param Required

| Param | Type | Required | Note | Example |
| --- | --- | --- | --- | --- |
| itemId | UUID | Yes | The ID of the `Item` record where the option is located. | /api/admin/categories/789ef05f-562e-4d1d-ac3a-e9e093f5d453/options/...?slug=tacos-el-guero |
| optionId | UUID | Yes | The Id of the `ItemOption` record to update | /api/admin/items/.../options/60e6e05c-c1b8-423f-8266-bd116bc66898?slug=tacos-el-guero |

Example request body:

> Updating the items option price

```json
{
  "price": 1.25
}
```

### PATCH /api/admin/items/[itemId]/options/[optionId]/move-up

Moves an item option one position up within its current item.

#### Route Param Required

| Param | Type | Required | Note | Example |
| --- | --- | --- | --- | --- |
| itemId | UUID | Yes | The ID of the `Item` record where the option is located. | /api/admin/categories/789ef05f-562e-4d1d-ac3a-e9e093f5d453/options/.../move-up?slug=tacos-el-guero |
| optionId | UUID | Yes | The Id of the `ItemOption` record to move up | /api/admin/items/.../options/60e6e05c-c1b8-423f-8266-bd116bc66898/move-up?slug=tacos-el-guero |

No body request

### PATCH /api/admin/items/[itemId]/options/[optionId]/move-down

Moves an item option one position down within its current item.

#### Route Param Required

| Param | Type | Required | Note | Example |
| --- | --- | --- | --- | --- |
| itemId | UUID | Yes | The ID of the `Item` record where the option is located. | /api/admin/categories/789ef05f-562e-4d1d-ac3a-e9e093f5d453/options/.../move-down?slug=tacos-el-guero |
| optionId | UUID | Yes | The Id of the `ItemOption` record to move down | /api/admin/items/.../options/60e6e05c-c1b8-423f-8266-bd116bc66898/move-down?slug=tacos-el-guero |

No body request

### DELETE /api/admin/items/[itemId]/options/[optionId]

Deletes an item option row by its `optionId`.

## Contacts

### POST /api/admin/contacts

Adds a contact row to the business.

Example request body:

> Creating a contact number as personal for the business

```json
{
  "phoneNumber": "123-456-7890",
  "isPersonal": true
}
```

### PATCH /api/admin/contacts/[contactId]

Updates a contact row by its `contactId`.

Example request body:

> Updates email (was previously empty)

```json
{
  "email": "John@gmail.com"
}
```

### DELETE /api/admin/contacts/[contactId]

Deletes a contact row by its `contactId`.

## Socials

### POST /api/admin/socials

Adds a social row to the business.

`url` and `icon` are supplied by the system. It uses the contacts `profileName` for the url , and the icon comes from a stored bucket inside of S3 Buckets (must be supported through a dropdown selection). If the url is not correct then the user should be allowed to edit the URL to the correct location (cannot change DNS of social media platform).

Example request body:

> Adding Instagram as a social media link

```json
{
  "dns": "https://instagram",
  "profileName": "Tacos El Guero",
  "url": "https://instagram/tacos-el-guero",
  "icon": "businesses/icons/socials/instagram.webp"
}
```

### PATCH /api/admin/socials/[socialId]

Updates a social row by its `socialId`.

Example request body:

> Update the social media profile name

```json
{
  "profileName": "tacoselguero-PDX"
}
```

### DELETE /api/admin/socials/[socialId]

Deletes a social row by its `socialId`.

## Locations

### POST /api/admin/locations

Adds a location row to the business.

Example request body:

> Creating a location for 123 Example St with a zip code

```json
{
  "address": "123 Example St",
  "zip": "12345"
}
```

### PATCH /api/admin/locations/[locationId]

Updates a location row by its `locationId`.

Example request body:

> Updating the locations address

```json
{
  "address": "456 Main St"
}
```

### DELETE /api/admin/locations/[locationId]

Deletes a location row by its `locationId`.

When deleting a location, all location hours will also be deleted. Warn the user before allowing the action

## Location Days

### POST /api/admin/locations/[locationId]/days

Adds a location day row to the location by `locationId`.

A location does not need location days, this is to help with the frontend to display opening days. Each day has hours attached if added. In the frontend, a location day is created alongside its hours as separate routes (if provided).

Example request body:

> Create hours for Monday's

```json
{
  "dayOfWeek": "Monday"
}
```

### PATCH /api/admin/locations/[locationId]/days/[dayId]

Updates a locations day row contents by its `dayId`.

Example request body:

> Update a locations status to closed (for temporary closure or no longer serving on that day)

```json
{
  "isClosed": true
}
```

### DELETE /api/admin/locations/[locationId]/days/[dayId]

Deletes a location day row by its `dayId`.

When deleting a locations day, all location hours will also be deleted. Warn the user before allowing the action.

## Hours

### POST /api/admin/locations/[locationId]/days/[dayId]/hours

Adds an hour row to days by its `dayId`.

Hours are not required to present a days availability (you can turn on and off the hourly format through location.enableHours)

Example request body:

> Creating an hour for Happy Hour

```json
{
  "openTime": "16:00",
  "closeTime": "20:00",
  "title": "Happy Hour",
  "note": "Serving special dishes!"
}
```

### PATCH /api/admin/locations/[locationId]/days/[dayId]/hours/[hourId]

Updates an hours contents by its `hourId`.

Example request body:

> Disabling the hour

```json
{
  "isDisabled": true
}
```

### DELETE /api/admin/locations/[locationId]/days/[dayId]/hours/[hourId]

Delete an hour row by its `hourId`.
