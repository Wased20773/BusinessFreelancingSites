---
title: S3 Storage
code-path:
  - /platform/src/lib/s3/keys.ts
  - /platform/src/lib/s3/upload.ts
  - /platform/src/lib/s3/delete.ts
  - /platform/src/lib/s3/client.ts
  - /platform/src/lib/s3/copy.ts
  - /platform/src/lib/s3/get-url.ts
  - /platform/src/lib/images/process.ts
  - /platform/src/app/api/businesses/[businessId]/locations/[locationId]/items/[itemId]/image/route.ts
  - /platform/src/app/api/businesses/[businessId]/locations/[locationId]/items/[itemId]/route.ts

last-verified: 2026-09-26
status: planned
---

# S3 Storage

## Overview

Business Freelancer stores uploaded media in a private Amazon S3 bucket.

Only the backend communicates with Amazon S3. Clients never upload directly to S3 and never receive AWS credentials. Every upload, replacement, and deletion request is performed through authenticated backend API routes.

The database stores the S3 object key (Item's `imageKey`) instead of a public URL. When media is requested, the backend generates a temporary presigned S3 URL for the object. This keeps the bucket private while allowing authenticated clients to access media without exposing AWS credentials or permanent object URLs.

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

| Layer                 | Responsibility                                                     |
| --------------------- | ------------------------------------------------------------------ |
| Next.js Route Handler | Coordinates the upload process.                                    |
| Authentication        | Verifies business access                                           |
| Media Validation      | Validate file content, file size, and file type                    |
| Media Processing      | Converts images to WebP if needed and prepares files before upload |
| S3 Helper             | Handles communication with Amazon S3                               |
| Database              | Stores only the generated object key (`imageKey`)                  |

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

## Object Access

Objects retain a stable object key for their entire lifetime.

Example:

```txt
businesses/{businessId}/items/{itemId}.webp
```

The object key never changes, even when an image is replaced.

When an authenticated client requests media, the backend generates a temporary presigned S3 URL for the object. These URLs expire automatically after a configured duration and are never stored in the database.

This approach provides:

- Private bucket storage
- Temporary media access
- No permanent public URLs
- Stable object keys

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

All uploaded images are compared to a **WebP** file extension version of the original image before being stored in Amazon S3. **WebP** is natrually more efficient and smaller than their counterparts while still providing the same quality. This allows us to provide faster load times, lower storage and cut on bandwidth cost.

Regardless of whether the original upload is:

- JPG
- JPEG
- PNG

the stored object becomes:

```txt
ITEM_UUID.webp
```

only if `webp` is the more optimal choice.

### Benefits

- Smaller file sizes
- Faster downloads
- Lower bandwidth usage
- Simpler frontend rendering

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

If a business does decide to change their logo from the default they provided, they can easily replace it and it would affect both frontend logo and the tab icon immediately after. The tab icon might require a separate path due to the size of them. So in future iterations the schema for Business can add `logoKey` and `tabKey` as optional string rows. Then the tab icon would be generated through MetaData where it can generate the title and tab icon link from the S3 bucket.

```txt
businesses/{businessId}/logo.webp
```

### Gallery Images

When the user might want a gallery of images, not related to the menu, logo, or videos. This would be a place where if the business needs are to present images of their business throughout their front-facing web page. A Frontend example could be a carousel slider or a homepage with a hero with sliding images, or special images to separate content from each other like divider images or background images throughout the web page. To further support this design, the gallery could be stored as a hashmap where the key is defined in the dashboard.

An example of this cold be creating a gallery for the "hero images", and "about us" images

```json
"gallery": {
    "hero": ["heroKeyOne","heroKeyTwo"],
    "about": ["aboutKeyOne","aboutKeyTwo","aboutKeyThree"]
}
```

Then they will be stored within there context:

```txt
businesses/{businessId}/gallery/hero/{imageId}.webp
businesses/{businessId}/gallery/about/{imageId}.webp
```

> NOTE: There is no schema for Gallery or any document drafting the use case for Gallery

```txt
businesses/{businessId}/gallery/{key}/{imageId}.webp
```

### Videos

This would be great if the business needs are to present short clips on a card for UX. This can also be used for things like gifs but it might be better to separate that logic in a different object key prefix, keeping it in the gallery as a gif type rather than image, or to leave that up to the developers existing tools. Just like the gallery, we can store it in a hashmap.

```txt
businesses/{businessId}/videos/{key}/{videoId}.mp4
```

Video uploads will use a separate validation and processing pipeline. Only links will need to be stored.

NOTE: Is it better to save video ID's or video links as the object key.

## Design Decisions

### Presigned URL Security

Amazon S3 objects remain private at all times.

Instead of exposing permanent object URLs, the backend generates temporary presigned URLs for authenticated requests.

Benefits:

- Bucket remains private
- No AWS credentials are exposed
- URLs expire automatically
- Permanent object locations are never exposed
- Existing object keys never need to change

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
