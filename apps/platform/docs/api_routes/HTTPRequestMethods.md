## GET

A `GET` request retrieves one or more rows from the database.

It is a read-only request and does not modify any existing data. Since a `GET` request only needs to identify the resource being requested, the request body is typically not used. Instead, resource identifiers are passed through the request URL using path parameters or query parameters.

Although the HTTP specification does not explicitly forbid a request body on a `GET` request, many browsers, clients, proxies, and servers either ignore it or do not support it consistently. For this reason, request bodies should not be used with `GET` requests.

Example:

> GET /api/business

```json
{
  "id": "12345678-1234-1234-1234-123456789012W",
  "name": "Business Name",
  "slug": "business-name",
  "domain": "business-name.com"
}
```

## POST

`POST` requests create new rows.

The request body should include the required fields for creating that row.

Example:

```json
{
  "name": "Tacos",
  "description": "Traditional street tacos"
}
```

## PATCH

`PATCH` requests update existing rows.

The request body should include only the fields being changed.

Example:

```json
{
  "name": "Burritos"
}
```

## DELETE

`DELETE` requests remove existing rows.

`DELETE` requests usually do not need a request body because the row being deleted is identified by the route parameter.

Example:

```txt
DELETE /api/admin/categories/[categoryId]
```