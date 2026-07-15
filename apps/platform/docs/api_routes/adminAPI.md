---
title: Admin API
code-paths:
  - \platform\src\api\admin\account
  - \platform\src\api\admin\business-user
  - \platform\src\api\admin\categories
  - \platform\src\api\admin\contacts
  - \platform\src\api\admin\items\[itemId]
  - \platform\src\api\admin\locations
  - \platform\src\api\admin\socials

last-verified: 2026-07-14
status: planned
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

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| businessUserId | UUID | Yes | The ID of the `BusinessUser` join record to update. |

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

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| businessUserId | UUID | Yes | The ID of the `BusinessUser` join record to delete. |

## Categories

### POST /api/admin/categories

Adds a category row to the business.

Example request body:

> Creating a category for Tacos with a description

```json
{
  "name": "Tacos",
  "description": "Traditional street tacos"
}
```

### POST /api/admin/categories/[categoryId]/subcategory

Adds a subcategory row to an existing category through `categoryId` and add it as a parentId.

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| categoryId | UUID | Yes | The ID of the `Category` record to insert the subcategory into. |

Example request body:

> Creating a subcategory for Drinks like cans

```json
{
  "name": "cans",
  "description": "(12oz) can drinks"
}
```

### PATCH /api/admin/categories/[categoryId]

Updates a category row by its `categoryId`. This cannot update the order value. This can only be done by move-up or move-down routes.

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| categoryId | UUID | Yes | The ID of the `Category` record to update. |

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

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| categoryId | UUID | Yes | The ID of the `Category` record to "move up". |

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

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| categoryId | UUID | Yes | The ID of the `Category` record to "move down". |

No body request

### DELETE /api/admin/categories/[categoryId]

Deletes a category row by its `categoryId`.

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| categoryId | UUID | Yes | The ID of the `Category` record to delete. |

Deletion of a category is only possible when there are no items attached to it.

## Category Items

### POST /api/admin/categories/[categoryId]/items

Adds a new item row to the category by `categoryId`.

A Category can exist without items, but an item can't exist without being attached to a category.

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| categoryId | UUID | Yes | The ID of the `Category` record to insert the new item into. |

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

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| categoryId | UUID | Yes | The ID of the `Category` record where the item is located. |
| itemId | UUID | Yes | The Id of the `Item` record to "move up" |

No body request

### PATCH /api/admin/categories/[categoryId]/items/[itemId]/move-down

Moves an item one position down within its current category.

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| categoryId | UUID | Yes | The ID of the `Category` record where the item is located. |
| itemId | UUID | Yes | The Id of the `Item` record to "move down" |

No body request

## Items

### PATCH /api/admin/items/[itemId]

Updates an item row by its `itemId`.

This does not allow for order, slug, or imageKey to be updated. These are handled in separate routes, except for slug; slugs are not editable.

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| itemId | UUID | Yes | The ID of the `Item` record to update. |

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

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| itemId | UUID | Yes | The ID of the `Item` record to update the image for. |

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

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| itemId | UUID | Yes | The ID of the `Item` record to delete. |

## Item Options

### POST /api/admin/items/[itemId]/options

Adds an option row to the item by `itemId`.

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| itemId | UUID | Yes | The ID of the `Item` record to add the option to. |

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

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| itemId | UUID | Yes | The ID of the `Item` record where the option is located. |
| optionId | UUID | Yes | The Id of the `ItemOption` record to update |

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

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| itemId | UUID | Yes | The ID of the `Item` record where the option is located. |
| optionId | UUID | Yes | The Id of the `ItemOption` record to "move up" |

No body request

### PATCH /api/admin/items/[itemId]/options/[optionId]/move-down

Moves an item option one position down within its current item.

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| itemId | UUID | Yes | The ID of the `Item` record where the option is located. |
| optionId | UUID | Yes | The Id of the `ItemOption` record to move down |

No body request

### DELETE /api/admin/items/[itemId]/options/[optionId]

Deletes an item option row by its `optionId`.

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| itemId | UUID | Yes | The ID of the `Item` record where the option is located. |
| optionId | UUID | Yes | The Id of the `ItemOption` record to move down |

no body request.

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

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| contactId | UUID | Yes | The ID of the `Contact` record to update. |

Example request body:

> Updates email (was previously empty)

```json
{
  "email": "John@gmail.com"
}
```

### DELETE /api/admin/contacts/[contactId]

Deletes a contact row by its `contactId`.

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| contactId | UUID | Yes | The ID of the `Contact` record to delete. |

No body request.

## Socials

### POST /api/admin/socials

Adds a social row to the business.

`url` and `icon` are supplied by the system. For the url it uses the contacts `domain` + `profileName`, and the icon comes from a stored bucket inside of S3 Buckets (must be supported through a dropdown selection in the frontend). If the url is not correct then the user should be allowed to edit the URL to the correct location (cannot change domain of social media platform as it will need to be a valid provider via dropdown selection).

Example request body:

> Adding Instagram as a social media link

```json
{
  "domain": "instagram.com",
  "profileName": "Tacos El Guero",
  "icon": "businesses/icons/socials/instagram.webp"
}
```

### PATCH /api/admin/socials/[socialId]

Updates a social row by its `socialId`.

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| socialId | UUID | Yes | The ID of the `Social` record to update. |

Example request body:

> Update the social media profile name

```json
{
  "profileName": "tacoselguero-PDX"
}
```

### DELETE /api/admin/socials/[socialId]

Deletes a social row by its `socialId`.

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| socialId | UUID | Yes | The ID of the `Social` record to delete. |

No body request.

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

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| locationId | UUID | Yes | The ID of the `Location` record to update. |

Example request body:

> Updating the locations address

```json
{
  "address": "456 Main St"
}
```

### DELETE /api/admin/locations/[locationId]

Deletes a location row by its `locationId`.

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| locationId | UUID | Yes | The ID of the `Location` record to delete. |

When deleting a location, all location hours will also be deleted. Warn the user before allowing the action

## Location Days

### POST /api/admin/locations/[locationId]/days

Adds a location day row to the location by `locationId`.

A location does not need location days, this is to help with the frontend to display opening days. Each day has hours attached if added. In the frontend, a location day is created alongside its hours as separate routes (if provided).

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| locationId | UUID | Yes | The ID of the `Location` record to insert the the new day record. |

Example request body:

> Create a working day on Monday

```json
{
  "dayOfWeek": "Monday"
}
```

### PATCH /api/admin/locations/[locationId]/days/[dayId]

Updates a locations day row contents by its `dayId`.

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| locationId | UUID | Yes | The ID of the `Location` record where the day is located. |
| dayId | UUID | Yes | The ID of the `LocationDay` record to update. |

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

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| locationId | UUID | Yes | The ID of the `Location` record where the day is located. |
| dayId | UUID | Yes | The ID of the `LocationDay` record to delete. |

No body request.

## Hours

### POST /api/admin/locations/[locationId]/days/[dayId]/hours

Adds an hour row to days by its `dayId`.

Hours are not required to present a days availability (you can turn on and off the hourly format through location.enableHours). Hours cannot conflict with each other, meaning a day cant have `openTime=9:00` and `closeTime=18:00` with the same day having `openTime=12:00` and `closeTime=20:00` or any variation that would conflict with other times in that single day.

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| locationId | UUID | Yes | The ID of the `Location` record where the day is located. |
| dayId | UUID | Yes | The ID of the `LocationDay` record to add the hour record. |

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

#### Route Param Required

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| locationId | UUID | Yes | The ID of the `Location` record where the day is located. |
| dayId | UUID | Yes | The ID of the `LocationDay` record where the hour is located. |
| hourId | UUID | Yes | The ID of the `Hour` record to update. |

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

| Param | Type | Required | Note |
| --- | --- | --- | --- |
| locationId | UUID | Yes | The ID of the `Location` record where the day is located. |
| dayId | UUID | Yes | The ID of the `LocationDay` record where the hour is located. |
| hourId | UUID | Yes | The ID of the `Hour` record to delete. |

