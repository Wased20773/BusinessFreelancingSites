---
title: S3 Storage
code-path:
    - /platform/src/api

last-verified: 2026-7-15
status: planned
---


# S3 Storage

## Overview

Business Freelancer stores uploaded media in a private Amazon S3 bucket.

Only the backend communicates with Amazon S3. Clients never upload directly to S3 and never receive AWS credentials. Every upload, replacement, and deletion request is performed through authenticated backend API routes.

The database stores the S3 object key (`imageKey`) instead of a public URL. This allows the application to change how media is served in the future (such as through CloudFront or signed URLs) without modifying existing database records.

---

## Bucket Structure

Objects are organized using key prefixes.

```
businesses/
    BUSINESS_UUID/
        logo.webp

        categories/
            CATEGORY_UUID.webp

        items/
            ITEM_UUID.webp

        gallery/
            IMAGE_UUID.webp

        videos/
            VIDEO_UUID.mp4
```

Although Amazon S3 displays these as folders, they are object key prefixes rather than real directories.

---

## Architecture

```
Frontend

        │

        ▼

Next.js Route Handler

        │

        ▼

Authentication / Business Validation

        │

        ▼

Media Validation

        │

        ▼

Media Processing

        │

        ▼

S3 Helper

        │

        ▼

Amazon S3
```

### Responsibility

| Layer | Responsibility |
|--------|----------------|
| Route Handler | Coordinates the upload process. |
| Validation | Verifies business access, file type, and file size. |
| Media Processing | Converts images and prepares files before upload. |
| S3 Helper | Handles communication with Amazon S3. |
| Database | Stores only the generated object key (`imageKey`). |

Route handlers should never directly communicate with Amazon S3.

---

## Upload Flow

```
Client

↓

Create database record

↓

Receive record ID

↓

Upload media

↓

Validate file

↓

Generate object key

↓

Process media

↓

Upload to S3

↓

Store imageKey in database

↓

Return success
```

If the upload fails, the database record remains valid with a `null` imageKey.

---

## Replace Flow

```
Validate record

↓

Generate new object

↓

Upload new object

↓

Update imageKey

↓

Delete previous object

↓

Return success
```

The previous object is never deleted until the replacement upload has completed successfully.

---

## Delete Flow

```
Validate record

↓

Delete object from S3

↓

Set imageKey = null

↓

Return success
```

---

## Object Key Design

Media objects are stored using immutable database IDs instead of business slugs or item slugs.

Example:

```
businesses/{businessId}/items/{itemId}.webp
```

### Why UUIDs?

- Never change
- Independent of public URLs
- Prevent accidental object moves
- Keep storage implementation separate from routing

The API may continue using business slugs while storage internally uses UUIDs.

---

## Supported Upload Types

### Accepted Upload Types

- JPEG
- JPG
- PNG
- WebP

Additional image formats may be supported in the future.

---

## Stored Format

All uploaded images are converted to **WebP** before being stored in Amazon S3.

Regardless of whether the original upload is:

- JPG
- JPEG
- PNG
- WebP

the stored object becomes:

```
ITEM_UUID.webp
```

### Benefits

- Smaller file sizes
- Faster downloads
- Lower bandwidth usage
- Consistent object naming
- Simpler frontend rendering

Videos are excluded from this conversion.

---

## Future Media Support

The storage architecture is designed to support additional media types without changing the overall structure.

### Category Images

```
businesses/{businessId}/categories/{categoryId}.webp
```

### Business Logo

```
businesses/{businessId}/logo.webp
```

### Gallery Images

```
businesses/{businessId}/gallery/{imageId}.webp
```

### Videos

```
businesses/{businessId}/videos/{videoId}.mp4
```

Video uploads will use a separate validation and processing pipeline.

---

## Design Decisions

### Private Bucket

The S3 bucket remains private.

Media is never exposed directly from Amazon S3.

---

### Backend Only

All uploads, replacements, and deletions are performed through backend API routes.

Clients never receive AWS credentials.

---

### Store Object Keys

Only the S3 object key is stored in the database.

Example:

```
businesses/{businessId}/items/{itemId}.webp
```

Public URLs are generated when needed.

---

### Separation of Responsibilities

Route handlers coordinate requests.

Media processing prepares files.

S3 helpers communicate with Amazon S3.

Each layer has a single responsibility.