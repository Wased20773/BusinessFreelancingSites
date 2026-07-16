---
title: S3 Storage
code-path:
    - /platform/src/lib/s3/keys.ts
    - /platform/src/lib/s3/upload.ts
    - /platform/src/lib/s3/delete.ts
    - /platform/src/lib/s3/client.ts
    - /platform/src/lib/images/process.ts
    - /platform/src/app/api/admin/items/[itemId]/image/route.ts

last-verified: 2026-7-15
status: planned
---

# S3 Storage

## Overview

Business Freelancer stores uploaded media in a private Amazon S3 bucket.

Only the backend communicates with Amazon S3. Clients never upload directly to S3 and never receive AWS credentials. Every upload, replacement, and deletion request is performed through authenticated backend API routes.

The database stores the S3 object key (`imageKey`) instead of a public URL. This allows the application to change how media is served in the future (such as through CloudFront or signed URLs) without modifying existing database records.

## Bucket Structure

Objects are organized using key prefixes. An example of what it could become after MVP completion can be seen below:

```txt
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

## Architecture

```txt
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
| -------- | ---------------- |
| Next.js Route Handler | Coordinates the upload process. |
| Authentication | Verifies business access |
| Media Validation | Validate file content, file size, and file type |
| Media Processing | Converts images to WebP if needed and prepares files before upload |
| S3 Helper | Handles communication with Amazon S3 |
| Database | Stores only the generated object key (`imageKey`) |

Route handlers should never directly communicate with Amazon S3.

## Upload Flow

```txt
Upload Media
    │
    ▼
Validate record
    │
    ▼
Validate image
    │
    ▼
Generate object key
    │
    ▼
Process media
    │
    ▼
Upload to S3
    │
    ▼
Store generated imageKey in database
    │
    ▼
Return success
```

If the upload fails, the database record remains valid with a `null` imageKey. When successfuly uploaded imageKey no longer needs to be regenerated unless deleted.

## Replace Flow

```txt
Upload Media
    │
    ▼
Validate record
    │
    ▼
Validate image
    │
    ▼
Process Media
    │
    ▼
Upload to S3
    │
    ▼
Update updatedAt from the record
    │
    ▼
Return success
```

The imageKey is never deleted or truly replaced since the imageKey for the same item would point to the same object prefix key. This means we still use the same imageKey from the item to save on query operations.

## Delete Flow

```txt
Validate record
    │
    ▼
Delete object from S3
    │
    ▼
Set imageKey = null
    │
    ▼
Return success
```

## Object Key Design

Media objects are stored using immutable database IDs instead of business slugs or item slugs.

Example:

```txt
businesses/{businessId}/items/{itemId}.webp
```

Objects are uploaded with a one-year `Cache-Control` header to allow browsers and CDNs to aggressively cache media.

To ensure image replacements appear immediately, the frontend uses **URL Versioning** by appending the record's `updatedAt` timestamp to the image URL.

Example:

```txt
businesses/{businessId}/items/{itemId}.webp?v=1784179800000
```

Whenever an image is uploaded, replaced, or removed, the corresponding database record for an item is updated, causing the `updatedAt` timestamp to change. Because the browser treats the updated URL as a new resource, it immediately downloads the latest image while still allowing previous versions to remain cached. This approach provides instant image updates without sacrificing the performance benefits of long-term caching.

Previous image versions may temporarily remain in the browser cache. Browsers automatically remove older cached resources over time as part of their normal cache management. This behavior is independent of the configured Cache-Control lifetime.

### Why UUIDs?

- Never change
- Independent of public URLs
- Prevent accidental object moves
- Keep storage implementation separate from routing

**The API may continue using business slugs while S3 bucket storage internally uses UUIDs.**

## Supported Upload Types

### Accepted Upload Types

- JPEG
- JPG
- PNG
- WebP

Additional image formats may be supported in the future such as:

- HEIC / HEIF: Apple's default photo format since iOS 11
- AVIF: Highly efficient format supported by both Andriod and iOS

#### Why these specific image formats?

HEIC/ HEIF & AVIF are common image formats when taken from a mobile device. Unless the client changes image format from these defaults, they would be uploading unsupported image formats which would not be ideal for small businesses who promote and showcase their work through their mobile devices.

## Stored Format

All uploaded images are converted to **WebP** before being stored in Amazon S3.

Regardless of whether the original upload is:

- JPG
- JPEG
- PNG
  
the stored object becomes:

```txt
ITEM_UUID.webp
```

### Benefits

- Smaller file sizes
- Faster downloads
- Lower bandwidth usage
- Consistent object naming
- Simpler frontend rendering

Videos are excluded from this conversion.

### Sharp

Sharp is used to process uploaded images before they are stored in Amazon S3. During upload, Sharp generates an optimized WebP version of each supported image while preserving transparency, correcting image orientation, and removing unnecessary metadata. The processed WebP image is then compared to the original upload, and whichever version produces the smaller file size is stored in Amazon S3. This allows the platform to automatically optimize storage and bandwidth without requiring businesses to manually prepare their uploads.

## Future Media Support

The storage architecture is designed to support additional media types without changing the overall structure. Currently, for the MVP, image uploads are intended for items only. In future development, after MVP completion, image uploads can be performed through other sections of the business such as category images, business logo upload, upload into a gallery, and video uploads.

### Category Images

In some cases, categories are attached with an image. A frontend example could be a category card element a user clicks to access those items.

```txt
businesses/{businessId}/categories/{categoryId}.webp
```

### Business Logo

If a business does decide to change their logo from the default they provided, they can easily upload it and it would replace both frontend logo and tab icon by adding it as a new logo image upload. tab icon would require a separate path due to the size of them. So in future iterations the schema for Business can add `logoKey` and `tabKey` as optional string rows. Then the tab icon would be generated through MetaData where it can generate the title and tab icon link from the S3 bucket.

```txt
businesses/{businessId}/logo.webp
```

### Gallery Images

When the user might want a gallery of images, not related to the menu, logo, or videos. This would be a place where if the business needs are to present images of their business throughout their front-facing web page. A Frontend example could be a carousel slider or a homepage with a hero with sliding images, or special images to separate content from each other like divider images or background images throughout the web page.

> NOTE: There is no schema for Gallery or any document drafting the use case for Gallery

```txt
businesses/{businessId}/gallery/{imageId}.webp
```

### Videos

This would be great if the business needs are to present short clips on a card for UX. This can also be used for things like gifs but it might be better to separate that logic in a different object key prefix.

```txt
businesses/{businessId}/videos/{videoId}.mp4
```

Video uploads will use a separate validation and processing pipeline.

## Design Decisions

### Private Bucket

The S3 bucket remains private.

Media is never exposed directly from Amazon S3.

### Backend Only

All uploads, replacements, and deletions are performed through backend API routes.

Clients never receive AWS credentials.

### Store Object Keys

Only the S3 object key is stored in the database.

Example:

```txt
businesses/{businessId}/items/{itemId}.webp
```

Public URLs are generated when needed in the frontend.

### Separation of Responsibilities

Route handlers coordinate requests.

Media processing prepares files.

S3 helpers communicate with Amazon S3.

Each layer has a single responsibility.
