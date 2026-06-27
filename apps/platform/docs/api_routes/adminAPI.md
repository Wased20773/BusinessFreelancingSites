---
title: Admin API
code-paths:
  - 

last-verified: 2026-06-26
status: draft
---

# Admin API Routes

Used by the platform admin dashboard to create, update, and delete business data.

These routes should require authentication and business access checks later.

To view the full JSON return values per route, go to [Admin API Responses](../../docs/api_routes/response/adminAPI.md).

## Account

### GET /api/admin/account

Fetches the logged-in user's account information and access level for the current business.

#### Query Params

None

#### Returns

- Name
- Username
- Email
- BusinessUserId
- [AccessLevel](../../../../packages/database/docs/database-models.md#access-level-choices)
- Access Level Description

#### Used For

- Admin Dashboard
  - Settings

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

#### Query Params

None

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

Adds user account and links it to the authenticated business through a BusinessUser record.

Example request body:

> Creating a user

```json
{
  "name": "John",
  "email": "John@email.com",
  "password": "password_123"
}
```

### PATCH /api/admin/business-users/[businessUserId]

Updates a user's access level for the current business.

This route only updates the role assigned to the BusinessUser record. It does not update the user's account information.

Example request body:

> Updating a user's access level

```json
{
  "accessLevel": "admin"
}
```

### DELETE /api/admin/business-users/[businessUserId]

Deletes a user row that is linked to the business by `businessUserId`.

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

Updates a category row by its `categoryId`.

Example request body:

> Disable a category from displaying on the frontend

```json
{
  "isVisible": false
}
```

### PATCH /api/admin/categories/[categoryId]/move-up

Moves a category one position up within the current business.

No body request

### PATCH /api/admin/categories/[categoryId]/move-down

Moves a category one position down within the current business.

No body request

### DELETE /api/admin/categories/[categoryId]

Deletes a category row by its `categoryId`.

Deletion of a category is only possible when there are no items attached to it.

## Category Items

### POST /api/admin/categories/[categoryId]/items

Adds a new item row to the category by `categoryId`.

A Category can exist without items, but an item can't exist without being attached to a category.

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

No body request

### PATCH /api/admin/categories/[categoryId]/items/[itemId]/move-down

Moves an item one position down within its current category.

Example request body:

No body request


## Items

### PATCH /api/admin/items/[itemId]

Updates an item row by its `itemId`.

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

## Item Options

### POST /api/admin/items/[itemId]/options

Adds an option row to the item by `itemId`.

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

Example request body:

> Updating the items option price

```json
{
  "price": 1.25
}
```

### PATCH /api/admin/items/[itemId]/options/[optionId]/move-up

Moves an item option one position up within its current item.

No body request

### PATCH /api/admin/items/[itemId]/options/[optionId]/move-down

Moves an item option one position down within its current item.

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

Example request body:

> Adding Instagram as a social media link

```json
{
  "name": "Instagram",
  "profileName": "tacoselguero",
  "url": "business-social-name",
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

## Location Hours

### POST /api/admin/locations/[locationId]/hours

Adds a location hour row to the location by `locationId`.

A location can exist without hours, but location hours cannot exist without being attached to a location.

Example request body:

> Create hours for Monday's

```json
{
  "dayOfWeek": "Monday",
  "openTime": "09:00",
  "closeTime": "18:00"
}
```

### PATCH /api/admin/locations/[locationId]/hours/[hourId]

Updates a location hour row by its `hourId`.

Example request body:

> Update a locations hours as closed (for temporary closure or no longer serving on that day)

```json
{
  "isClosed": true
}
```

### DELETE /api/admin/locations/[locationId]/hours/[hourId]

Deletes a location hour row by its `hourId`.
