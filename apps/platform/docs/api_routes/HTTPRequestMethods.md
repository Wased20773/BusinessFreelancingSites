## POST

POST requests create new rows.

The request body should include the required fields for creating that row.

Example:

```json
{
  "name": "Tacos",
  "description": "Traditional street tacos"
}
```

## PATCH

PATCH requests update existing rows.

The request body should include only the fields being changed.

Example:

```json
{
  "name": "Burritos"
}
```

## DELETE

DELETE requests remove existing rows.

DELETE requests usually do not need a request body because the row being deleted is identified by the route parameter.

Example:

```txt
DELETE /api/admin/categories/[categoryId]
```