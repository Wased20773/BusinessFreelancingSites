/**
 * @jest-environment node
 */

import { createMockImage } from "@/__tests__/fixtures/image";
import {
  BUSINESS_ID,
  LOCATION_ID,
  LOCATION_NOT_FOUND,
  mockFailedAuthentication,
  mockLocationInBusiness,
  mockLocationNotInBusiness,
  mockSuccessfulAuthentication,
} from "@/__tests__/helpers/auth";
import {
  createFormDataRequest,
  createJsonRequest,
} from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import { processImage } from "@/lib/images/process";
import { deleteObject } from "@/lib/s3/delete";
import { uploadImage } from "@/lib/s3/upload";

import {
  POST,
  PATCH,
  DELETE,
} from "@/app/api/businesses/[businessId]/locations/[locationId]/items/[itemId]/image/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

jest.mock("@/lib/images/process", () => ({
  processImage: jest.fn(),
}));

const mockedProcessImage = jest.mocked(processImage);
const mockedUploadImage = jest.mocked(uploadImage);
const mockedDeleteObject = jest.mocked(deleteObject);

const URL = `http://localhost/api/businesses/${BUSINESS_ID}/locations/${LOCATION_ID}/items/item-123/image`;

const PRIVATE_IMAGE = `businesses/${BUSINESS_ID}/items/image-item-123.webp`;
const PRIVATE_ORIGINAL = `businesses/${BUSINESS_ID}/items/original-item-123.png`;
const SHARED_IMAGE = `businesses/${BUSINESS_ID}/items/synced/item-sync-group/image.webp`;
const SHARED_ORIGINAL = `businesses/${BUSINESS_ID}/items/synced/item-sync-group/original.png`;

const croppedBuffer = Buffer.from("cropped");
const originalBuffer = Buffer.from("original");

function context(itemId = "item-123") {
  return createRouteContext({
    businessId: BUSINESS_ID,
    locationId: LOCATION_ID,
    itemId,
  });
}

function imageFields(overrides: Record<string, string | File | undefined> = {}) {
  const fields: Record<string, string | File | undefined> = {
    image: createMockImage({ name: "cropped.png" }),
    originalImage: createMockImage({ name: "original.png" }),
    isSynced: "false",
    ...overrides,
  };

  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as Record<string, string | File>;
}

function mockProcessedImages() {
  mockedProcessImage
    .mockResolvedValueOnce({
      buffer: croppedBuffer,
      contentType: "image/webp",
      extension: "webp",
    })
    .mockResolvedValueOnce({
      buffer: originalBuffer,
      contentType: "image/png",
      extension: "png",
    });
}

function existingItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "item-123",
    imageKey: null,
    originalImageKey: null,
    syncGroupId: null,
    ...overrides,
  };
}

const updatedItemSelect = {
  id: true,
  locationId: true,
  imageKey: true,
  originalImageKey: true,
  updatedAt: true,
};

describe("/api/businesses/[businessId]/locations/[locationId]/items/[itemId]/image", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  describe("POST", () => {
    function postImage(
      fields = imageFields(),
      routeContext = context(),
    ) {
      return POST(
        createFormDataRequest({ url: URL, method: "POST", fields }),
        routeContext,
      );
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await postImage();

      expect(response.status).toBe(401);
      expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
    });

    it("returns 400 when itemId is missing", async () => {
      const response = await postImage(imageFields(), context(""));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Missing itemId" });
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await postImage();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it("returns 500 when finding the item fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockRejectedValue(
        new Error("Database query failed"),
      );

      const response = await postImage();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to upload image to the item",
      });
    });

    it("returns 404 when the item is not found", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(null);

      const response = await postImage();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Item not found" });

      expect(mockPrisma.item.findFirst).toHaveBeenCalledWith({
        where: { id: "item-123", locationId: LOCATION_ID },
        select: {
          id: true,
          imageKey: true,
          originalImageKey: true,
          syncGroupId: true,
        },
      });
    });

    it("returns the image validation error response", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(existingItem());

      const response = await postImage(
        imageFields({ image: createMockImage({ type: "image/gif" }) }),
      );

      expect(response.status).toBe(415);
      expect(mockedProcessImage).not.toHaveBeenCalled();
    });

    it("returns 400 when the synchronization setting is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(existingItem());

      const response = await postImage(imageFields({ isSynced: undefined }));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Synchronization setting was not found",
      });
    });

    it("returns 400 when the original image is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(existingItem());

      const response = await postImage(imageFields({ originalImage: undefined }));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "An original image was not found",
      });
    });

    it("returns 400 when the original image type is not supported", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(existingItem());

      const response = await postImage(
        imageFields({ originalImage: createMockImage({ type: "image/gif" }) }),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "The original image must be a JPEG, PNG, or WebP image",
      });
    });

    it("rejects uploading an image when the item already has an imageKey", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(
        existingItem({ imageKey: PRIVATE_IMAGE }),
      );

      const response = await postImage();

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error:
          "You cannot add to an item with an existing imageKey. Please use replace instead",
      });

      expect(mockedUploadImage).not.toHaveBeenCalled();
    });

    it("rejects a synchronized upload when the group already has an image", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst
        .mockResolvedValueOnce(existingItem({ syncGroupId: "item-sync-group" }))
        .mockResolvedValueOnce({ imageKey: SHARED_IMAGE });

      const response = await postImage(imageFields({ isSynced: "true" }));

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error:
          "The synchronized items already have an image. Please use replace instead",
      });

      expect(mockPrisma.item.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          syncGroupId: "item-sync-group",
          isSynced: true,
          imageKey: { not: null },
        },
        select: { imageKey: true },
      });

      expect(mockedUploadImage).not.toHaveBeenCalled();
    });

    it("returns 500 when image processing fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(existingItem());
      mockedProcessImage.mockRejectedValue(new Error("Sharp failed"));

      const response = await postImage();

      expect(response.status).toBe(500);
      expect(mockedUploadImage).not.toHaveBeenCalled();
    });

    it("does not update the item when the S3 upload fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(existingItem());
      mockProcessedImages();
      mockedUploadImage.mockRejectedValue(new Error("S3 upload failed"));

      const response = await postImage();

      expect(response.status).toBe(500);
      expect(mockPrisma.item.update).not.toHaveBeenCalled();
    });

    it("deletes the cropped image when uploading the original image fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(existingItem());
      mockProcessedImages();
      mockedUploadImage
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("S3 upload failed"));

      const response = await postImage();

      expect(response.status).toBe(500);
      expect(mockedDeleteObject).toHaveBeenCalledWith(PRIVATE_IMAGE);
      expect(mockPrisma.item.update).not.toHaveBeenCalled();
    });

    it("deletes both uploaded objects when the database update fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(existingItem());
      mockProcessedImages();
      mockPrisma.item.update.mockRejectedValue(new Error("Database update failed"));

      const response = await postImage();

      expect(response.status).toBe(500);
      expect(mockedDeleteObject).toHaveBeenCalledWith(PRIVATE_IMAGE);
      expect(mockedDeleteObject).toHaveBeenCalledWith(PRIVATE_ORIGINAL);
    });

    it("returns 500 when database update and S3 cleanup both fail", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(existingItem());
      mockProcessedImages();
      mockPrisma.item.update.mockRejectedValue(new Error("Database update failed"));
      mockedDeleteObject.mockRejectedValue(new Error("S3 delete failed"));

      const response = await postImage();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to upload image to the item",
      });
    });

    it("successfully uploads a valid image and stores both image keys", async () => {
      const updatedItem = {
        id: "item-123",
        locationId: LOCATION_ID,
        imageKey: PRIVATE_IMAGE,
        originalImageKey: PRIVATE_ORIGINAL,
      };

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(existingItem());
      mockProcessedImages();
      mockPrisma.item.update.mockResolvedValue(updatedItem);

      const response = await postImage();

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        message: "Item image uploaded",
        item: updatedItem,
      });

      expect(mockedUploadImage).toHaveBeenNthCalledWith(1, {
        key: PRIVATE_IMAGE,
        body: croppedBuffer,
        contentType: "image/webp",
      });

      expect(mockedUploadImage).toHaveBeenNthCalledWith(2, {
        key: PRIVATE_ORIGINAL,
        body: originalBuffer,
        contentType: "image/png",
      });

      expect(mockPrisma.item.update).toHaveBeenCalledWith({
        where: { id: "item-123", locationId: LOCATION_ID },
        data: { imageKey: PRIVATE_IMAGE, originalImageKey: PRIVATE_ORIGINAL },
        select: updatedItemSelect,
      });
    });

    it("successfully uploads a shared image for every synchronized item", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst
        .mockResolvedValueOnce(existingItem({ syncGroupId: "item-sync-group" }))
        .mockResolvedValueOnce(null);
      mockProcessedImages();
      mockPrisma.item.updateMany.mockResolvedValue({ count: 3 });

      const response = await postImage(imageFields({ isSynced: "true" }));

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        message: "Synchronized item image uploaded successfully",
        count: 3,
        imageKey: SHARED_IMAGE,
        originalImageKey: SHARED_ORIGINAL,
      });

      expect(mockedUploadImage).toHaveBeenNthCalledWith(1, {
        key: SHARED_IMAGE,
        body: croppedBuffer,
        contentType: "image/webp",
      });

      expect(mockPrisma.item.updateMany).toHaveBeenCalledWith({
        where: {
          syncGroupId: "item-sync-group",
          OR: [{ isSynced: true }, { id: "item-123" }],
        },
        data: { imageKey: SHARED_IMAGE, originalImageKey: SHARED_ORIGINAL },
      });

      expect(mockPrisma.item.update).not.toHaveBeenCalled();
    });
  });

  describe("PATCH", () => {
    function patchImage(
      fields = imageFields({ originalImage: undefined }),
      routeContext = context(),
    ) {
      return PATCH(
        createFormDataRequest({ url: URL, method: "PATCH", fields }),
        routeContext,
      );
    }

    function mockCroppedOnly() {
      mockedProcessImage.mockResolvedValueOnce({
        buffer: croppedBuffer,
        contentType: "image/webp",
        extension: "webp",
      });
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await patchImage();

      expect(response.status).toBe(401);
      expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
    });

    it("returns 400 when itemId is missing", async () => {
      const response = await patchImage(undefined, context(""));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Missing itemId" });
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await patchImage();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it("returns 500 when finding the item fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockRejectedValue(
        new Error("Database query failed"),
      );

      const response = await patchImage();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to replace the image to the item",
      });
    });

    it("returns 404 when the item is not found", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(null);

      const response = await patchImage();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Item not found" });
    });

    it("returns the image validation error response", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(
        existingItem({ imageKey: PRIVATE_IMAGE }),
      );

      const response = await patchImage(
        imageFields({
          image: new File([], "empty.png", { type: "image/png" }),
          originalImage: undefined,
        }),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "The uploaded image is empty",
      });
    });

    it("returns 500 when image processing fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(
        existingItem({ imageKey: PRIVATE_IMAGE }),
      );
      mockedProcessImage.mockRejectedValue(new Error("Sharp failed"));

      const response = await patchImage();

      expect(response.status).toBe(500);
      expect(mockedUploadImage).not.toHaveBeenCalled();
    });

    it("rejects replacement when the item does not have an imageKey", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(existingItem());
      mockCroppedOnly();

      const response = await patchImage();

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error:
          "This item does not currently have an image in our records. Please upload an image to this item first",
      });

      expect(mockedUploadImage).not.toHaveBeenCalled();
    });

    it("returns 500 and does not update the item when the S3 upload fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(
        existingItem({ imageKey: PRIVATE_IMAGE }),
      );
      mockCroppedOnly();
      mockedUploadImage.mockRejectedValue(new Error("S3 upload failed"));

      const response = await patchImage();

      expect(response.status).toBe(500);
      expect(mockPrisma.item.update).not.toHaveBeenCalled();
    });

    it("returns 500 when updating the item fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(
        existingItem({ imageKey: PRIVATE_IMAGE }),
      );
      mockCroppedOnly();
      mockPrisma.item.update.mockRejectedValue(new Error("Database update failed"));

      const response = await patchImage();

      expect(response.status).toBe(500);
    });

    it("successfully re-crops the image while keeping the existing original", async () => {
      const updatedItem = {
        id: "item-123",
        locationId: LOCATION_ID,
        imageKey: PRIVATE_IMAGE,
        originalImageKey: PRIVATE_ORIGINAL,
      };

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(
        existingItem({
          imageKey: PRIVATE_IMAGE,
          originalImageKey: PRIVATE_ORIGINAL,
        }),
      );
      mockCroppedOnly();
      mockPrisma.item.update.mockResolvedValue(updatedItem);

      const response = await patchImage();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Item image replaced successfully",
        item: updatedItem,
      });

      expect(mockedUploadImage).toHaveBeenCalledTimes(1);
      expect(mockedUploadImage).toHaveBeenCalledWith({
        key: PRIVATE_IMAGE,
        body: croppedBuffer,
        contentType: "image/webp",
      });

      expect(mockPrisma.item.update).toHaveBeenCalledWith({
        where: { id: "item-123", locationId: LOCATION_ID },
        data: { imageKey: PRIVATE_IMAGE },
        select: updatedItemSelect,
      });

      expect(mockedDeleteObject).not.toHaveBeenCalled();
    });

    it("replaces the original too and deletes an old private original with a different key", async () => {
      const oldOriginal = `businesses/${BUSINESS_ID}/items/original-item-123.jpg`;

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(
        existingItem({ imageKey: PRIVATE_IMAGE, originalImageKey: oldOriginal }),
      );
      mockProcessedImages();
      mockPrisma.item.update.mockResolvedValue({ id: "item-123" });

      const response = await patchImage(imageFields());

      expect(response.status).toBe(200);

      expect(mockPrisma.item.update).toHaveBeenCalledWith({
        where: { id: "item-123", locationId: LOCATION_ID },
        data: { imageKey: PRIVATE_IMAGE, originalImageKey: PRIVATE_ORIGINAL },
        select: updatedItemSelect,
      });

      expect(mockedDeleteObject).toHaveBeenCalledWith(oldOriginal);
    });

    it("never deletes a shared synchronized original when giving an item its own image", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(
        existingItem({
          syncGroupId: "item-sync-group",
          imageKey: SHARED_IMAGE,
          originalImageKey: SHARED_ORIGINAL,
        }),
      );
      mockProcessedImages();
      mockPrisma.item.update.mockResolvedValue({ id: "item-123" });

      const response = await patchImage(imageFields());

      expect(response.status).toBe(200);

      // isSynced=false writes to the item's private key, not the shared one.
      expect(mockedUploadImage).toHaveBeenNthCalledWith(1, {
        key: PRIVATE_IMAGE,
        body: croppedBuffer,
        contentType: "image/webp",
      });

      expect(mockedDeleteObject).not.toHaveBeenCalled();
    });

    it("returns 409 for a synchronized replace when the group has no image", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst
        .mockResolvedValueOnce(existingItem({ syncGroupId: "item-sync-group" }))
        .mockResolvedValueOnce(null);
      mockCroppedOnly();

      const response = await patchImage(
        imageFields({ originalImage: undefined, isSynced: "true" }),
      );

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error:
          "The synchronized items do not currently have an image. Please upload one first",
      });
    });

    it("successfully overwrites the shared image for every synchronized item", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst
        .mockResolvedValueOnce(
          existingItem({ syncGroupId: "item-sync-group", imageKey: SHARED_IMAGE }),
        )
        .mockResolvedValueOnce({
          imageKey: SHARED_IMAGE,
          originalImageKey: SHARED_ORIGINAL,
        });
      mockProcessedImages();
      mockPrisma.item.updateMany.mockResolvedValue({ count: 2 });

      const response = await patchImage(imageFields({ isSynced: "true" }));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Synchronized item image replaced successfully",
        count: 2,
      });

      expect(mockedUploadImage).toHaveBeenNthCalledWith(1, {
        key: SHARED_IMAGE,
        body: croppedBuffer,
        contentType: "image/webp",
      });

      expect(mockedUploadImage).toHaveBeenNthCalledWith(2, {
        key: SHARED_ORIGINAL,
        body: originalBuffer,
        contentType: "image/png",
      });

      expect(mockPrisma.item.updateMany).toHaveBeenCalledWith({
        where: {
          syncGroupId: "item-sync-group",
          OR: [{ isSynced: true }, { id: "item-123" }],
        },
        data: {
          imageKey: SHARED_IMAGE,
          originalImageKey: SHARED_ORIGINAL,
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe("DELETE", () => {
    function deleteImage(body: unknown, routeContext = context()) {
      return DELETE(
        createJsonRequest({ url: URL, method: "DELETE", body }),
        routeContext,
      );
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await deleteImage({ deleteAllSynced: false });

      expect(response.status).toBe(401);
      expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
    });

    it("returns 400 when itemId is missing", async () => {
      const response = await deleteImage({ deleteAllSynced: false }, context(""));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Missing itemId" });
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await deleteImage({ deleteAllSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it("returns 400 when the delete synchronization option is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await deleteImage({});

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Synchronization setting was not found",
      });
    });

    it("returns 500 when finding the item fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockRejectedValue(
        new Error("Database query failed"),
      );

      const response = await deleteImage({ deleteAllSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to delete the image from the item",
      });
    });

    it("returns 404 when the item is not found", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(null);

      const response = await deleteImage({ deleteAllSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Item was not found" });
    });

    it("returns 400 when the item does not have an image", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(existingItem());

      const response = await deleteImage({ deleteAllSynced: false });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "This item does not have an image",
      });
    });

    it("does not delete the S3 objects when clearing the image keys fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(
        existingItem({ imageKey: PRIVATE_IMAGE, originalImageKey: PRIVATE_ORIGINAL }),
      );
      mockPrisma.item.update.mockRejectedValue(new Error("Database update failed"));

      const response = await deleteImage({ deleteAllSynced: false });

      expect(response.status).toBe(500);
      expect(mockedDeleteObject).not.toHaveBeenCalled();
    });

    it("restores the image keys when deleting the S3 object fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(
        existingItem({ imageKey: PRIVATE_IMAGE, originalImageKey: PRIVATE_ORIGINAL }),
      );
      mockPrisma.item.update.mockResolvedValue({ id: "item-123" });
      mockedDeleteObject.mockRejectedValue(new Error("S3 delete failed"));

      const response = await deleteImage({ deleteAllSynced: false });

      expect(response.status).toBe(500);

      expect(mockPrisma.item.update).toHaveBeenNthCalledWith(2, {
        where: { id: "item-123", locationId: LOCATION_ID },
        data: { imageKey: PRIVATE_IMAGE, originalImageKey: PRIVATE_ORIGINAL },
      });
    });

    it("returns 500 when deleting the S3 object fails and restoring the keys also fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(
        existingItem({ imageKey: PRIVATE_IMAGE }),
      );
      mockPrisma.item.update
        .mockResolvedValueOnce({ id: "item-123" })
        .mockRejectedValueOnce(new Error("Restore failed"));
      mockedDeleteObject.mockRejectedValue(new Error("S3 delete failed"));

      const response = await deleteImage({ deleteAllSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to delete the image from the item",
      });
    });

    it("clears the image keys and deletes both S3 objects", async () => {
      const updatedItem = {
        id: "item-123",
        locationId: LOCATION_ID,
        imageKey: null,
        originalImageKey: null,
      };

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(
        existingItem({ imageKey: PRIVATE_IMAGE, originalImageKey: PRIVATE_ORIGINAL }),
      );
      mockPrisma.item.update.mockResolvedValue(updatedItem);

      const response = await deleteImage({ deleteAllSynced: false });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Item image deleted successfully",
        item: updatedItem,
      });

      expect(mockPrisma.item.update).toHaveBeenCalledWith({
        where: { id: "item-123", locationId: LOCATION_ID },
        data: { imageKey: null, originalImageKey: null },
        select: updatedItemSelect,
      });

      expect(mockedDeleteObject).toHaveBeenCalledWith(PRIVATE_IMAGE);
      expect(mockedDeleteObject).toHaveBeenCalledWith(PRIVATE_ORIGINAL);
    });

    it("clears only this item's keys and keeps shared S3 objects when not deleting all synced", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(
        existingItem({
          syncGroupId: "item-sync-group",
          imageKey: SHARED_IMAGE,
          originalImageKey: SHARED_ORIGINAL,
        }),
      );
      mockPrisma.item.update.mockResolvedValue({ id: "item-123" });

      const response = await deleteImage({ deleteAllSynced: false });

      expect(response.status).toBe(200);
      expect(mockPrisma.item.update).toHaveBeenCalledTimes(1);
      expect(mockedDeleteObject).not.toHaveBeenCalled();
    });

    it("returns 400 for a synchronized delete when the group has no image", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst
        .mockResolvedValueOnce(
          existingItem({ syncGroupId: "item-sync-group", imageKey: PRIVATE_IMAGE }),
        )
        .mockResolvedValueOnce(null);

      const response = await deleteImage({ deleteAllSynced: true });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "The synchronized items do not have an image",
      });
    });

    it("clears the shared image from every synchronized item and deletes it from S3", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst
        .mockResolvedValueOnce(
          existingItem({ syncGroupId: "item-sync-group", imageKey: SHARED_IMAGE }),
        )
        .mockResolvedValueOnce({
          imageKey: SHARED_IMAGE,
          originalImageKey: SHARED_ORIGINAL,
        });
      mockPrisma.item.updateMany.mockResolvedValue({ count: 2 });

      const response = await deleteImage({ deleteAllSynced: true });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Synchronized item image deleted successfully",
      });

      expect(mockPrisma.item.updateMany).toHaveBeenCalledWith({
        where: {
          syncGroupId: "item-sync-group",
          OR: [{ isSynced: true }, { id: "item-123" }],
        },
        data: { imageKey: null, originalImageKey: null },
      });

      expect(mockedDeleteObject).toHaveBeenCalledWith(SHARED_IMAGE);
      expect(mockedDeleteObject).toHaveBeenCalledWith(SHARED_ORIGINAL);
    });

    it("restores the shared image keys when a synchronized S3 delete fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst
        .mockResolvedValueOnce(
          existingItem({ syncGroupId: "item-sync-group", imageKey: SHARED_IMAGE }),
        )
        .mockResolvedValueOnce({
          imageKey: SHARED_IMAGE,
          originalImageKey: SHARED_ORIGINAL,
        });
      mockPrisma.item.updateMany.mockResolvedValue({ count: 2 });
      mockedDeleteObject.mockRejectedValue(new Error("S3 delete failed"));

      const response = await deleteImage({ deleteAllSynced: true });

      expect(response.status).toBe(500);

      expect(mockPrisma.item.updateMany).toHaveBeenNthCalledWith(2, {
        where: {
          syncGroupId: "item-sync-group",
          OR: [{ isSynced: true }, { id: "item-123" }],
        },
        data: { imageKey: SHARED_IMAGE, originalImageKey: SHARED_ORIGINAL },
      });
    });
  });
});
