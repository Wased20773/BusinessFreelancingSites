/**
 * @jest-environment node
 */

import { createMockImage } from "@/__tests__/fixtures/image";
import {
  BUSINESS_ID,
  mockFailedAuthentication,
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
} from "@/app/api/businesses/[businessId]/image/route";

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

const URL = `http://localhost/api/businesses/${BUSINESS_ID}/image`;
const context = createRouteContext({ businessId: BUSINESS_ID });

const IMAGE_KEY = `businesses/${BUSINESS_ID}/image.webp`;
const ORIGINAL_KEY = `businesses/${BUSINESS_ID}/original.png`;

const croppedBuffer = Buffer.from("cropped");
const originalBuffer = Buffer.from("original");

const businessSelect = {
  id: true,
  imageKey: true,
  originalImageKey: true,
  updatedAt: true,
};

function fields(overrides: Record<string, File | undefined> = {}) {
  const all: Record<string, File | undefined> = {
    image: createMockImage({ name: "cropped.png" }),
    originalImage: createMockImage({ name: "original.png" }),
    ...overrides,
  };

  return Object.fromEntries(
    Object.entries(all).filter(([, value]) => value !== undefined),
  ) as Record<string, File>;
}

function mockProcessedImages(withOriginal = true) {
  mockedProcessImage.mockResolvedValueOnce({
    buffer: croppedBuffer,
    contentType: "image/webp",
    extension: "webp",
  });

  if (withOriginal) {
    mockedProcessImage.mockResolvedValueOnce({
      buffer: originalBuffer,
      contentType: "image/png",
      extension: "png",
    });
  }
}

function business(overrides: Record<string, unknown> = {}) {
  return {
    id: BUSINESS_ID,
    imageKey: null,
    originalImageKey: null,
    ...overrides,
  };
}

describe("/api/businesses/[businessId]/image", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  describe("POST", () => {
    function postImage(formFields = fields()) {
      return POST(
        createFormDataRequest({ url: URL, method: "POST", fields: formFields }),
        context,
      );
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await postImage();

      expect(response.status).toBe(401);
      expect(mockPrisma.business.findUnique).not.toHaveBeenCalled();
    });

    it("returns 404 when the business is not found", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.business.findUnique.mockResolvedValue(null);

      const response = await postImage();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "Business could not be found",
      });
    });

    it("returns 409 when the business already has an image", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.business.findUnique.mockResolvedValue(
        business({ imageKey: IMAGE_KEY }),
      );

      const response = await postImage();

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error:
          "This business already has an image. Please replace the existing image instead",
      });

      expect(mockedUploadImage).not.toHaveBeenCalled();
    });

    it("returns the image validation error response", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.business.findUnique.mockResolvedValue(business());

      const response = await postImage(
        fields({ image: createMockImage({ type: "image/gif" }) }),
      );

      expect(response.status).toBe(415);
    });

    it("returns 400 when the original image is missing", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.business.findUnique.mockResolvedValue(business());

      const response = await postImage(fields({ originalImage: undefined }));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error:
          'Missing original image file. Please submit the file using the "originalImage" form-data field',
      });
    });

    it("returns 413 when the original image is larger than 10 MB", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.business.findUnique.mockResolvedValue(business());

      const response = await postImage(
        fields({
          originalImage: createMockImage({ size: 10 * 1024 * 1024 + 1 }),
        }),
      );

      expect(response.status).toBe(413);
      expect(await response.json()).toEqual({
        error: "The original image cannot be larger than 10 MB",
      });
    });

    it("returns 415 when the original image type is not supported", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.business.findUnique.mockResolvedValue(business());

      const response = await postImage(
        fields({ originalImage: createMockImage({ type: "image/gif" }) }),
      );

      expect(response.status).toBe(415);
    });

    it("deletes the cropped image when uploading the original fails", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.business.findUnique.mockResolvedValue(business());
      mockProcessedImages();
      mockedUploadImage
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("S3 upload failed"));

      const response = await postImage();

      expect(response.status).toBe(500);
      expect(mockedDeleteObject).toHaveBeenCalledWith(IMAGE_KEY);
      expect(mockPrisma.business.update).not.toHaveBeenCalled();
    });

    it("deletes both uploaded objects when the database update fails", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.business.findUnique.mockResolvedValue(business());
      mockProcessedImages();
      mockPrisma.business.update.mockRejectedValue(
        new Error("Database update failed"),
      );

      const response = await postImage();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to upload business image",
      });

      expect(mockedDeleteObject).toHaveBeenCalledWith(IMAGE_KEY);
      expect(mockedDeleteObject).toHaveBeenCalledWith(ORIGINAL_KEY);
    });

    it("successfully uploads both images and stores their keys", async () => {
      const updatedBusiness = business({
        imageKey: IMAGE_KEY,
        originalImageKey: ORIGINAL_KEY,
      });

      mockSuccessfulAuthentication();
      mockPrisma.business.findUnique.mockResolvedValue(business());
      mockProcessedImages();
      mockPrisma.business.update.mockResolvedValue(updatedBusiness);

      const response = await postImage();

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        message: "Business image uploaded successfully",
        business: updatedBusiness,
      });

      expect(mockedUploadImage).toHaveBeenCalledWith({
        key: IMAGE_KEY,
        body: croppedBuffer,
        contentType: "image/webp",
      });

      expect(mockedUploadImage).toHaveBeenCalledWith({
        key: ORIGINAL_KEY,
        body: originalBuffer,
        contentType: "image/png",
      });

      expect(mockPrisma.business.update).toHaveBeenCalledWith({
        where: { id: BUSINESS_ID },
        data: { imageKey: IMAGE_KEY, originalImageKey: ORIGINAL_KEY },
        select: businessSelect,
      });
    });
  });

  describe("PATCH", () => {
    function patchImage(formFields = fields({ originalImage: undefined })) {
      return PATCH(
        createFormDataRequest({ url: URL, method: "PATCH", fields: formFields }),
        context,
      );
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await patchImage();

      expect(response.status).toBe(401);
    });

    it("returns 404 when the business is not found", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.business.findUnique.mockResolvedValue(null);

      const response = await patchImage();

      expect(response.status).toBe(404);
    });

    it("returns 409 when the business has no image to replace", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.business.findUnique.mockResolvedValue(business());

      const response = await patchImage();

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error:
          "This business does not currently have an image. Please upload an image first",
      });
    });

    it("re-crops the image while keeping the existing original", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.business.findUnique.mockResolvedValue(
        business({ imageKey: IMAGE_KEY, originalImageKey: ORIGINAL_KEY }),
      );
      mockProcessedImages(false);
      mockPrisma.business.update.mockResolvedValue(business());

      const response = await patchImage();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          message: "Business image replaced successfully",
        }),
      );

      expect(mockedUploadImage).toHaveBeenCalledTimes(1);

      expect(mockPrisma.business.update).toHaveBeenCalledWith({
        where: { id: BUSINESS_ID },
        data: { imageKey: IMAGE_KEY, originalImageKey: ORIGINAL_KEY },
        select: businessSelect,
      });

      expect(mockedDeleteObject).not.toHaveBeenCalled();
    });

    it("deletes the old objects when the new images use different extensions", async () => {
      const oldImage = `businesses/${BUSINESS_ID}/image.jpg`;
      const oldOriginal = `businesses/${BUSINESS_ID}/original.jpg`;

      mockSuccessfulAuthentication();
      mockPrisma.business.findUnique.mockResolvedValue(
        business({ imageKey: oldImage, originalImageKey: oldOriginal }),
      );
      mockProcessedImages();
      mockPrisma.business.update.mockResolvedValue(business());

      const response = await patchImage(fields());

      expect(response.status).toBe(200);

      expect(mockPrisma.business.update).toHaveBeenCalledWith({
        where: { id: BUSINESS_ID },
        data: { imageKey: IMAGE_KEY, originalImageKey: ORIGINAL_KEY },
        select: businessSelect,
      });

      expect(mockedDeleteObject).toHaveBeenCalledWith(oldImage);
      expect(mockedDeleteObject).toHaveBeenCalledWith(oldOriginal);
    });

    it("deletes the newly uploaded image when the database update fails", async () => {
      const oldImage = `businesses/${BUSINESS_ID}/image.jpg`;

      mockSuccessfulAuthentication();
      mockPrisma.business.findUnique.mockResolvedValue(
        business({ imageKey: oldImage, originalImageKey: ORIGINAL_KEY }),
      );
      mockProcessedImages(false);
      mockPrisma.business.update.mockRejectedValue(
        new Error("Database update failed"),
      );

      const response = await patchImage();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to replace business image",
      });

      expect(mockedDeleteObject).toHaveBeenCalledWith(IMAGE_KEY);
      expect(mockedDeleteObject).not.toHaveBeenCalledWith(oldImage);
    });
  });

  describe("DELETE", () => {
    function deleteImage() {
      return DELETE(createJsonRequest({ url: URL, method: "DELETE" }), context);
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await deleteImage();

      expect(response.status).toBe(401);
    });

    it("returns 404 when the business is not found", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.business.findUnique.mockResolvedValue(null);

      const response = await deleteImage();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "Business could not be found",
      });
    });

    it("returns 404 when the business does not have an image", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.business.findUnique.mockResolvedValue(business());

      const response = await deleteImage();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This business does not have an image",
      });
    });

    it("restores the image keys when deleting from S3 fails", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.business.findUnique.mockResolvedValue(
        business({ imageKey: IMAGE_KEY, originalImageKey: ORIGINAL_KEY }),
      );
      mockPrisma.business.update.mockResolvedValue(business());
      mockedDeleteObject.mockRejectedValue(new Error("S3 delete failed"));

      const response = await deleteImage();

      expect(response.status).toBe(500);

      expect(mockPrisma.business.update).toHaveBeenNthCalledWith(2, {
        where: { id: BUSINESS_ID },
        data: { imageKey: IMAGE_KEY, originalImageKey: ORIGINAL_KEY },
      });
    });

    it("clears both image keys and deletes both S3 objects", async () => {
      const clearedBusiness = business();

      mockSuccessfulAuthentication();
      mockPrisma.business.findUnique.mockResolvedValue(
        business({ imageKey: IMAGE_KEY, originalImageKey: ORIGINAL_KEY }),
      );
      mockPrisma.business.update.mockResolvedValue(clearedBusiness);

      const response = await deleteImage();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Business image deleted successfully",
        business: clearedBusiness,
      });

      expect(mockPrisma.business.update).toHaveBeenCalledWith({
        where: { id: BUSINESS_ID },
        data: { imageKey: null, originalImageKey: null },
        select: businessSelect,
      });

      expect(mockedDeleteObject).toHaveBeenCalledWith(IMAGE_KEY);
      expect(mockedDeleteObject).toHaveBeenCalledWith(ORIGINAL_KEY);
    });
  });
});
