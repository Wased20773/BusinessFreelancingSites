/**
 * @jest-environment node
 */

import { createMockImage } from "@/__tests__/fixtures/image";
import { createMockItem } from "@/__tests__/fixtures/item";
import { mockSuccessfulAuthentication } from "@/__tests__/helpers/auth";
import { createImageRouteRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma } from "@/__tests__/mocks/prisma";

import { POST, PATCH, DELETE } from "@/app/api/admin/items/[itemId]/image/route";
import { imageRequestValidation } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { processImage } from "@/lib/images/process";
import { deleteObject } from "@/lib/s3/delete";
import { generateItemImageKey } from "@/lib/s3/keys";
import { uploadImage } from "@/lib/s3/upload";
import { NextResponse } from "next/server";

jest.mock("@/lib/prisma", () => ({
    prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
    authenticateBusinessAccess: jest.fn(),
}));

jest.mock("@/app/api/route_helper", () => ({
    imageRequestValidation: jest.fn(),
}));

jest.mock("@/lib/images/process", () => ({
    processImage: jest.fn(),
}));

jest.mock("@/lib/s3/keys", () => ({
    generateItemImageKey: jest.fn(),
}));

jest.mock("@/lib/s3/upload", () => ({
    uploadImage: jest.fn(),
}));

jest.mock("@/lib/s3/delete", () => ({
    deleteObject: jest.fn(),
}));

const mockedAuthenticateBusinessAccess =
    jest.mocked(authenticateBusinessAccess);

const mockedImageRequestValidation =
    jest.mocked(imageRequestValidation);

const mockedProcessImage =
    jest.mocked(processImage);

const mockedGenerateItemImageKey =
    jest.mocked(generateItemImageKey);

const mockedUploadImage =
    jest.mocked(uploadImage);

const mockedDeleteObject =
    jest.mocked(deleteObject);

describe("/api/admin/items/[itemId]/image", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("POST", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createImageRouteRequest({
                itemId: "item-123",
                method: "POST",
            });

            const context = createRouteContext("item-123");

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);
            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
            expect(mockedImageRequestValidation).not.toHaveBeenCalled();
            expect(mockedProcessImage).not.toHaveBeenCalled();
            expect(mockedGenerateItemImageKey).not.toHaveBeenCalled();
            expect(mockedUploadImage).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockedDeleteObject).not.toHaveBeenCalled();
        });

        it("returns 400 when itemId is missing", async () => {
            mockSuccessfulAuthentication("business-123");

            const request = createImageRouteRequest({
                itemId: "",
                method: "POST",
            });

            const context = createRouteContext("");

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(400);
            expect(responseBody).toEqual({
                error: "Missing itemId",
            });

            expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
            expect(mockedImageRequestValidation).not.toHaveBeenCalled();
            expect(mockedProcessImage).not.toHaveBeenCalled();
            expect(mockedGenerateItemImageKey).not.toHaveBeenCalled();
            expect(mockedUploadImage).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockedDeleteObject).not.toHaveBeenCalled();
        });

        it("returns 500 when finding the item fails", async () => {
            const item = createMockItem();

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockRejectedValue(
                new Error("Database lookup failed")
            );

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "POST",
            });

            const context = createRouteContext(item.id);

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);
            expect(responseBody).toEqual({
                error: "Failed to upload image to the item",
            });

            expect(mockedImageRequestValidation).not.toHaveBeenCalled();
            expect(mockedProcessImage).not.toHaveBeenCalled();
            expect(mockedGenerateItemImageKey).not.toHaveBeenCalled();
            expect(mockedUploadImage).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockedDeleteObject).not.toHaveBeenCalled();
        });

        it("returns 404 when the item is not found", async () => {
            const item = createMockItem();

            mockSuccessfulAuthentication(item.businessId);
            mockPrisma.item.findFirst.mockResolvedValue(null);

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "POST",
            });

            const context = createRouteContext(item.id);

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);
            expect(responseBody).toEqual({
                error: "Item not found",
            });

            expect(mockedImageRequestValidation).not.toHaveBeenCalled();
            expect(mockedProcessImage).not.toHaveBeenCalled();
            expect(mockedGenerateItemImageKey).not.toHaveBeenCalled();
            expect(mockedUploadImage).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockedDeleteObject).not.toHaveBeenCalled();
        });

        it("rejects uploading an image when the item already has an imageKey", async () => {
            const item = createMockItem({
                imageKey:
                    "businesses/business-123/items/item-123.webp",
            });

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                businessId: item.businessId,
                imageKey: item.imageKey,
            });

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "POST",
            });

            const context = createRouteContext(item.id);

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(409);
            expect(responseBody).toEqual({
                error: "You cannot add to an item with an existing imageKey. Please use replace instead",
            });

            expect(mockedImageRequestValidation).not.toHaveBeenCalled();
            expect(mockedProcessImage).not.toHaveBeenCalled();
            expect(mockedGenerateItemImageKey).not.toHaveBeenCalled();
            expect(mockedUploadImage).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockedDeleteObject).not.toHaveBeenCalled();
        });

        it("returns the image validation error response", async () => {
            const item = createMockItem();

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                businessId: item.businessId,
                imageKey: null,
            });

            mockedImageRequestValidation.mockResolvedValue(
                NextResponse.json(
                    { error: "Invalid image" },
                    { status: 400 }
                )
            );

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "POST",
            });

            const context = createRouteContext(item.id);

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(400);
            expect(responseBody).toEqual({
                error: "Invalid image",
            });

            expect(mockedProcessImage).not.toHaveBeenCalled();
            expect(mockedGenerateItemImageKey).not.toHaveBeenCalled();
            expect(mockedUploadImage).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockedDeleteObject).not.toHaveBeenCalled();
        });

        it("returns 500 when image processing fails", async () => {
            const item = createMockItem();
            const image = createMockImage();

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                businessId: item.businessId,
                imageKey: null,
            });

            mockedImageRequestValidation.mockResolvedValue(image);

            mockedProcessImage.mockRejectedValue(
                new Error("Image processing failed")
            );

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "POST",
            });

            const context = createRouteContext(item.id);

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);
            expect(responseBody).toEqual({
                error: "Failed to upload image to the item",
            });

            expect(mockedGenerateItemImageKey).not.toHaveBeenCalled();
            expect(mockedUploadImage).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockedDeleteObject).not.toHaveBeenCalled();
        });

        it("returns 500 when generating the imageKey fails", async () => {
            const item = createMockItem();
            const image = createMockImage();

            const processedImage = {
                buffer: Buffer.from("processed-image"),
                contentType: "image/webp" as const,
                extension: "webp" as const,
            };

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                businessId: item.businessId,
                imageKey: null,
            });

            mockedImageRequestValidation.mockResolvedValue(image);
            mockedProcessImage.mockResolvedValue(processedImage);

            mockedGenerateItemImageKey.mockImplementation(() => {
                throw new Error("Image key generation failed");
            });

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "POST",
            });

            const context = createRouteContext(item.id);

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);
            expect(responseBody).toEqual({
                error: "Failed to upload image to the item",
            });

            expect(mockedUploadImage).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockedDeleteObject).not.toHaveBeenCalled();
        });

        it("does not update the item when the S3 upload fails", async () => {
            const item = createMockItem();
            const image = createMockImage();

            const processedImage = {
                buffer: Buffer.from("processed-image"),
                contentType: "image/webp" as const,
                extension: "webp" as const,
            };

            const imageKey =
                `businesses/${item.businessId}/items/${item.id}.webp`;

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                businessId: item.businessId,
                imageKey: null,
            });

            mockedImageRequestValidation.mockResolvedValue(image);
            mockedProcessImage.mockResolvedValue(processedImage);
            mockedGenerateItemImageKey.mockReturnValue(imageKey);

            mockedUploadImage.mockRejectedValue(
                new Error("S3 upload failed")
            );

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "POST",
            });

            const context = createRouteContext(item.id);

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);
            expect(responseBody).toEqual({
                error: "Failed to upload image to the item",
            });

            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockedDeleteObject).not.toHaveBeenCalled();
        });

        it("deletes the uploaded object when the database update fails", async () => {
            const item = createMockItem();
            const image = createMockImage();

            const processedImage = {
                buffer: Buffer.from("processed-image"),
                contentType: "image/webp" as const,
                extension: "webp" as const,
            };

            const imageKey =
                `businesses/${item.businessId}/items/${item.id}.webp`;

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                businessId: item.businessId,
                imageKey: null,
            });

            mockedImageRequestValidation.mockResolvedValue(image);
            mockedProcessImage.mockResolvedValue(processedImage);
            mockedGenerateItemImageKey.mockReturnValue(imageKey);
            mockedUploadImage.mockResolvedValue();

            mockPrisma.item.update.mockRejectedValue(
                new Error("Database update failed")
            );

            mockedDeleteObject.mockResolvedValue();

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "POST",
            });

            const context = createRouteContext(item.id);

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);
            expect(responseBody).toEqual({
                error: "Failed to upload image to the item",
            });

            expect(mockedDeleteObject).toHaveBeenCalledWith(imageKey);
        });

        it("returns 500 when database update and S3 cleanup both fail", async () => {
            const item = createMockItem();
            const image = createMockImage();

            const processedImage = {
                buffer: Buffer.from("processed-image"),
                contentType: "image/webp" as const,
                extension: "webp" as const,
            };

            const imageKey =
                `businesses/${item.businessId}/items/${item.id}.webp`;

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                businessId: item.businessId,
                imageKey: null,
            });

            mockedImageRequestValidation.mockResolvedValue(image);
            mockedProcessImage.mockResolvedValue(processedImage);
            mockedGenerateItemImageKey.mockReturnValue(imageKey);
            mockedUploadImage.mockResolvedValue();

            mockPrisma.item.update.mockRejectedValue(
                new Error("Database update failed")
            );

            mockedDeleteObject.mockRejectedValue(
                new Error("S3 cleanup failed")
            );

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "POST",
            });

            const context = createRouteContext(item.id);

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);
            expect(responseBody).toEqual({
                error: "Failed to upload image to the item",
            });

            expect(mockedDeleteObject).toHaveBeenCalledWith(imageKey);
        });

        it("successfully uploads a valid image and stores its imageKey", async () => {
            const item = createMockItem();
            const image = createMockImage();

            const processedImage = {
                buffer: Buffer.from("processed-image"),
                contentType: "image/webp" as const,
                extension: "webp" as const,
            };

            const imageKey =
                `businesses/${item.businessId}/items/${item.id}.webp`;

            const updatedItem = {
                id: item.id,
                imageKey,
                updatedAt: new Date("2026-07-02T12:00:00.000Z"),
            };

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                businessId: item.businessId,
                imageKey: null,
            });

            mockedImageRequestValidation.mockResolvedValue(image);
            mockedProcessImage.mockResolvedValue(processedImage);
            mockedGenerateItemImageKey.mockReturnValue(imageKey);
            mockedUploadImage.mockResolvedValue();
            mockPrisma.item.update.mockResolvedValue(updatedItem);

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "POST",
            });

            const context = createRouteContext(item.id);

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(201);
            expect(responseBody).toEqual({
                message: "Item image uploaded",
                item: {
                    id: item.id,
                    imageKey,
                    updatedAt: updatedItem.updatedAt.toISOString(),
                },
            });

            expect(mockPrisma.item.findFirst).toHaveBeenCalledWith({
                where: {
                    id: item.id,
                    businessId: item.businessId,
                },
                select: {
                    id: true,
                    businessId: true,
                    imageKey: true,
                },
            });

            expect(mockedImageRequestValidation).toHaveBeenCalledWith(
                request
            );

            expect(mockedProcessImage).toHaveBeenCalledWith(image);

            expect(mockedGenerateItemImageKey).toHaveBeenCalledWith({
                businessId: item.businessId,
                itemId: item.id,
                extension: processedImage.extension,
            });

            expect(mockedUploadImage).toHaveBeenCalledWith({
                key: imageKey,
                body: processedImage.buffer,
                contentType: processedImage.contentType,
            });

            expect(mockPrisma.item.update).toHaveBeenCalledWith({
                where: {
                    id: item.id,
                },
                data: {
                    imageKey,
                },
                select: {
                    id: true,
                    imageKey: true,
                    updatedAt: true,
                },
            });

            expect(mockedDeleteObject).not.toHaveBeenCalled();
        });
    });

    describe("PATCH", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createImageRouteRequest({
                itemId: "item-123",
                method: "PATCH",
            });

            const context = createRouteContext("item-123");

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);
            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
            expect(mockedImageRequestValidation).not.toHaveBeenCalled();
            expect(mockedProcessImage).not.toHaveBeenCalled();
            expect(mockedUploadImage).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
        });

        it("returns 400 when itemId is missing", async () => {
            mockSuccessfulAuthentication("business-123");

            const request = createImageRouteRequest({
                itemId: "",
                method: "PATCH",
            });

            const context = createRouteContext("");

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(400);
            expect(responseBody).toEqual({
                error: "Missing itemId",
            });

            expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
            expect(mockedImageRequestValidation).not.toHaveBeenCalled();
            expect(mockedProcessImage).not.toHaveBeenCalled();
            expect(mockedUploadImage).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
        });

        it("returns 500 when finding the item fails", async () => {
            const item = createMockItem();

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockRejectedValue(
                new Error("Database lookup failed")
            );

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "PATCH",
            });

            const context = createRouteContext(item.id);

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);
            expect(responseBody).toEqual({
                error: "Failed to replace the image to the item",
            });

            expect(mockedImageRequestValidation).not.toHaveBeenCalled();
            expect(mockedProcessImage).not.toHaveBeenCalled();
            expect(mockedUploadImage).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
        });

        it("returns 404 when the item is not found", async () => {
            const item = createMockItem();

            mockSuccessfulAuthentication(item.businessId);
            mockPrisma.item.findFirst.mockResolvedValue(null);

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "PATCH",
            });

            const context = createRouteContext(item.id);

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);
            expect(responseBody).toEqual({
                error: "Item not found",
            });

            expect(mockedImageRequestValidation).not.toHaveBeenCalled();
            expect(mockedProcessImage).not.toHaveBeenCalled();
            expect(mockedUploadImage).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
        });

        it("rejects replacement when the item does not have an imageKey", async () => {
            const item = createMockItem({
                imageKey: null,
            });

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                businessId: item.businessId,
                imageKey: null,
            });

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "PATCH",
            });

            const context = createRouteContext(item.id);

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(409);
            expect(responseBody).toEqual({
                error:
                    "This item does not currently have an image in our records. Please upload an image to this item first",
            });

            expect(mockedImageRequestValidation).not.toHaveBeenCalled();
            expect(mockedProcessImage).not.toHaveBeenCalled();
            expect(mockedUploadImage).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
        });

        it("returns the image validation error response", async () => {
            const item = createMockItem({
                imageKey:
                    "businesses/business-123/items/item-123.webp",
            });

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                businessId: item.businessId,
                imageKey: item.imageKey,
            });

            mockedImageRequestValidation.mockResolvedValue(
                NextResponse.json(
                    { error: "Invalid image" },
                    { status: 400 }
                )
            );

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "PATCH",
            });

            const context = createRouteContext(item.id);

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(400);
            expect(responseBody).toEqual({
                error: "Invalid image",
            });

            expect(mockedProcessImage).not.toHaveBeenCalled();
            expect(mockedUploadImage).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
        });

        it("returns 500 when image processing fails", async () => {
            const item = createMockItem({
                imageKey:
                    "businesses/business-123/items/item-123.webp",
            });

            const image = createMockImage();

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                businessId: item.businessId,
                imageKey: item.imageKey,
            });

            mockedImageRequestValidation.mockResolvedValue(image);

            mockedProcessImage.mockRejectedValue(
                new Error("Image processing failed")
            );

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "PATCH",
            });

            const context = createRouteContext(item.id);

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);
            expect(responseBody).toEqual({
                error: "Failed to replace the image to the item",
            });

            expect(mockedUploadImage).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
        });

        it("returns 500 and does not update the item when the S3 upload fails", async () => {
            const item = createMockItem({
                imageKey:
                    "businesses/business-123/items/item-123.webp",
            });

            const image = createMockImage();

            const processedImage = {
                buffer: Buffer.from("replacement-image"),
                contentType: "image/webp" as const,
                extension: "webp" as const,
            };

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                businessId: item.businessId,
                imageKey: item.imageKey,
            });

            mockedImageRequestValidation.mockResolvedValue(image);
            mockedProcessImage.mockResolvedValue(processedImage);

            mockedUploadImage.mockRejectedValue(
                new Error("S3 upload failed")
            );

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "PATCH",
            });

            const context = createRouteContext(item.id);

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);
            expect(responseBody).toEqual({
                error: "Failed to replace the image to the item",
            });

            expect(mockedUploadImage).toHaveBeenCalledWith({
                key: item.imageKey,
                body: processedImage.buffer,
                contentType: processedImage.contentType,
            });

            expect(mockPrisma.item.update).not.toHaveBeenCalled();
        });

        it("returns 500 when updating the item timestamp fails", async () => {
            const item = createMockItem({
                imageKey:
                    "businesses/business-123/items/item-123.webp",
            });

            const image = createMockImage();

            const processedImage = {
                buffer: Buffer.from("replacement-image"),
                contentType: "image/webp" as const,
                extension: "webp" as const,
            };

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                businessId: item.businessId,
                imageKey: item.imageKey,
            });

            mockedImageRequestValidation.mockResolvedValue(image);
            mockedProcessImage.mockResolvedValue(processedImage);
            mockedUploadImage.mockResolvedValue();

            mockPrisma.item.update.mockRejectedValue(
                new Error("Database update failed")
            );

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "PATCH",
            });

            const context = createRouteContext(item.id);

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);
            expect(responseBody).toEqual({
                error: "Failed to replace the image to the item",
            });

            expect(mockedUploadImage).toHaveBeenCalledWith({
                key: item.imageKey,
                body: processedImage.buffer,
                contentType: processedImage.contentType,
            });

            expect(mockPrisma.item.update).toHaveBeenCalledWith({
                where: {
                    id: item.id,
                },
                data: {
                    updatedAt: expect.any(Date),
                },
                select: {
                    id: true,
                    imageKey: true,
                    updatedAt: true,
                },
            });
        });

        it("successfully replaces an existing image and updates the item timestamp", async () => {
            const item = createMockItem({
                imageKey:
                    "businesses/business-123/items/item-123.webp",
            });

            const image = createMockImage();

            const processedImage = {
                buffer: Buffer.from("replacement-image"),
                contentType: "image/webp" as const,
                extension: "webp" as const,
            };

            const updatedItem = {
                id: item.id,
                imageKey: item.imageKey,
                updatedAt: new Date("2026-07-02T12:00:00.000Z"),
            };

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                businessId: item.businessId,
                imageKey: item.imageKey,
            });

            mockedImageRequestValidation.mockResolvedValue(image);
            mockedProcessImage.mockResolvedValue(processedImage);
            mockedUploadImage.mockResolvedValue();
            mockPrisma.item.update.mockResolvedValue(updatedItem);

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "PATCH",
            });

            const context = createRouteContext(item.id);

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);
            expect(responseBody).toEqual({
                message: "Item image replaced successfully",
                item: {
                    id: item.id,
                    imageKey: item.imageKey,
                    updatedAt: updatedItem.updatedAt.toISOString(),
                },
            });

            expect(mockedUploadImage).toHaveBeenCalledWith({
                key: item.imageKey,
                body: processedImage.buffer,
                contentType: processedImage.contentType,
            });

            expect(mockPrisma.item.update).toHaveBeenCalledWith({
                where: {
                    id: item.id,
                },
                data: {
                    updatedAt: expect.any(Date),
                },
                select: {
                    id: true,
                    imageKey: true,
                    updatedAt: true,
                },
            });

            expect(mockedGenerateItemImageKey).not.toHaveBeenCalled();
            expect(mockedDeleteObject).not.toHaveBeenCalled();
        });
    });

    describe("DELETE", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized" },
                    { status: 401 }
                )
            );

            const request = createImageRouteRequest({
                itemId: "item-123",
                method: "DELETE",
            });

            const context = createRouteContext("item-123");

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);
            expect(responseBody).toEqual({
                error: "Unauthorized",
            });

            expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockedDeleteObject).not.toHaveBeenCalled();
        });

        it("returns 400 when itemId is missing", async () => {
            mockSuccessfulAuthentication("business-123");

            const request = createImageRouteRequest({
                itemId: "",
                method: "DELETE",
            });

            const context = createRouteContext("");

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(400);
            expect(responseBody).toEqual({
                error: "Missing itemId",
            });

            expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockedDeleteObject).not.toHaveBeenCalled();
        });

        it("returns 500 when finding the item fails", async () => {
            const item = createMockItem();

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockRejectedValue(
                new Error("Database lookup failed")
            );

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "DELETE",
            });

            const context = createRouteContext(item.id);

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);
            expect(responseBody).toEqual({
                error: "Failed to delete the image from the item",
            });

            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockedDeleteObject).not.toHaveBeenCalled();
        });

        it("returns 404 when the item is not found", async () => {
            const item = createMockItem();

            mockSuccessfulAuthentication(item.businessId);
            mockPrisma.item.findFirst.mockResolvedValue(null);

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "DELETE",
            });

            const context = createRouteContext(item.id);

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);
            expect(responseBody).toEqual({
                error: "Item was not found",
            });

            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockedDeleteObject).not.toHaveBeenCalled();
        });

        it("returns 404 when the item does not have an image", async () => {
            const item = createMockItem({
                imageKey: null,
            });

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                imageKey: null,
            });

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "DELETE",
            });

            const context = createRouteContext(item.id);

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);
            expect(responseBody).toEqual({
                error: "This item does not have an image",
            });

            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockedDeleteObject).not.toHaveBeenCalled();
        });

        it("does not delete the S3 object when clearing imageKey fails", async () => {
            const item = createMockItem({
                imageKey:
                    "businesses/business-123/items/item-123.webp",
            });

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                imageKey: item.imageKey,
            });

            mockPrisma.item.update.mockRejectedValueOnce(
                new Error("Database update failed")
            );

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "DELETE",
            });

            const context = createRouteContext(item.id);

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);
            expect(responseBody).toEqual({
                error: "Failed to delete the image from the item",
            });

            expect(mockPrisma.item.update).toHaveBeenCalledWith({
                where: {
                    id: item.id,
                },
                data: {
                    imageKey: null,
                },
                select: {
                    id: true,
                    imageKey: true,
                    updatedAt: true,
                },
            });

            expect(mockedDeleteObject).not.toHaveBeenCalled();
        });

        it("restores the imageKey when deleting the S3 object fails", async () => {
            const item = createMockItem({
                imageKey:
                    "businesses/business-123/items/item-123.webp",
            });

            const updatedItem = {
                id: item.id,
                imageKey: null,
                updatedAt: new Date("2026-07-02T12:00:00.000Z"),
            };

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                imageKey: item.imageKey,
            });

            mockPrisma.item.update.mockResolvedValueOnce(updatedItem);

            mockedDeleteObject.mockRejectedValue(
                new Error("S3 deletion failed")
            );

            mockPrisma.item.update.mockResolvedValueOnce({
                id: item.id,
                imageKey: item.imageKey,
            });

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "DELETE",
            });

            const context = createRouteContext(item.id);

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);
            expect(responseBody).toEqual({
                error: "Failed to delete the image from the item",
            });

            expect(mockPrisma.item.update).toHaveBeenNthCalledWith(
                1,
                {
                    where: {
                        id: item.id,
                    },
                    data: {
                        imageKey: null,
                    },
                    select: {
                        id: true,
                        imageKey: true,
                        updatedAt: true,
                    },
                }
            );

            expect(mockedDeleteObject).toHaveBeenCalledWith(
                item.imageKey
            );

            expect(mockPrisma.item.update).toHaveBeenNthCalledWith(
                2,
                {
                    where: {
                        id: item.id,
                    },
                    data: {
                        imageKey: item.imageKey,
                    },
                }
            );
        });

        it("returns 500 when deleting the S3 object fails and restoring imageKey also fails", async () => {
            const item = createMockItem({
                imageKey:
                    "businesses/business-123/items/item-123.webp",
            });

            const updatedItem = {
                id: item.id,
                imageKey: null,
                updatedAt: new Date("2026-07-02T12:00:00.000Z"),
            };

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                imageKey: item.imageKey,
            });

            mockPrisma.item.update.mockResolvedValueOnce(updatedItem);

            mockedDeleteObject.mockRejectedValue(
                new Error("S3 deletion failed")
            );

            mockPrisma.item.update.mockRejectedValueOnce(
                new Error("Rollback failed")
            );

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "DELETE",
            });

            const context = createRouteContext(item.id);

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);
            expect(responseBody).toEqual({
                error: "Failed to delete the image from the item",
            });

            expect(mockPrisma.item.update).toHaveBeenCalledTimes(2);
            expect(mockedDeleteObject).toHaveBeenCalledWith(
                item.imageKey
            );

            expect(mockPrisma.item.update).toHaveBeenNthCalledWith(
                2,
                {
                    where: {
                        id: item.id,
                    },
                    data: {
                        imageKey: item.imageKey,
                    },
                }
            );
        });

        it("clears imageKey and deletes the S3 object", async () => {
            const item = createMockItem({
                imageKey:
                    "businesses/business-123/items/item-123.webp",
            });

            const updatedItem = {
                id: item.id,
                imageKey: null,
                updatedAt: new Date("2026-07-02T12:00:00.000Z"),
            };

            mockSuccessfulAuthentication(item.businessId);

            mockPrisma.item.findFirst.mockResolvedValue({
                id: item.id,
                imageKey: item.imageKey,
            });

            mockPrisma.item.update.mockResolvedValue(updatedItem);
            mockedDeleteObject.mockResolvedValue();

            const request = createImageRouteRequest({
                itemId: item.id,
                method: "DELETE",
            });

            const context = createRouteContext(item.id);

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);
            expect(responseBody).toEqual({
                message: "Item image deleted successfully",
                item: {
                    id: item.id,
                    imageKey: null,
                    updatedAt: updatedItem.updatedAt.toISOString(),
                },
            });

            expect(mockPrisma.item.update).toHaveBeenCalledWith({
                where: {
                    id: item.id,
                },
                data: {
                    imageKey: null,
                },
                select: {
                    id: true,
                    imageKey: true,
                    updatedAt: true,
                },
            });

            expect(mockedDeleteObject).toHaveBeenCalledWith(
                item.imageKey
            );

            expect(mockPrisma.item.update).toHaveBeenCalledTimes(1);
        });
    });
});