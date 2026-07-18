/**
 * @jest-environment node
 */

import { mockSuccessfulAuthentication } from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma } from "@/__tests__/mocks/prisma";

import {
    PATCH,
    DELETE,
} from "@/app/api/admin/items/[itemId]/route";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { NextResponse } from "next/server";

jest.mock("@/lib/prisma", () => ({
    prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
    authenticateBusinessAccess: jest.fn(),
}));

const mockedAuthenticateBusinessAccess =
    jest.mocked(authenticateBusinessAccess);

describe("/api/admin/items/[itemId]", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("PATCH", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/items/item-123",
                method: "PATCH",
                body: {
                    name: "Updated Taco",
                    description: "Updated description",
                    containsList: ["cilantro"],
                    calories: 300,
                    price: 3,
                    isAvailable: true,
                },
            });

            const context = createRouteContext({
                itemId: "item-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
        });

        it("returns 404 when the item is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.item.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/items/item-123",
                method: "PATCH",
                body: {
                    name: "Updated Taco",
                    description: "Updated description",
                    containsList: ["cilantro"],
                    calories: 300,
                    price: 3,
                    isAvailable: true,
                },
            });

            const context = createRouteContext({
                itemId: "item-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This item does not exist in our records",
            });

            expect(mockPrisma.item.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "item-123",
                    businessId: "business-123",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.item.update).not.toHaveBeenCalled();
        });

        it("returns 500 when updating the item fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.item.findFirst.mockResolvedValue({
                id: "item-123",
            });

            mockPrisma.item.update.mockRejectedValue(
                new Error("Database update failed")
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/items/item-123",
                method: "PATCH",
                body: {
                    name: "Updated Taco",
                    description: "Updated description",
                    containsList: ["cilantro"],
                    calories: 300,
                    price: 3,
                    isAvailable: true,
                },
            });

            const context = createRouteContext({
                itemId: "item-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to update item",
            });

            expect(mockPrisma.item.update).toHaveBeenCalled();
        });

        it("successfully updates the item", async () => {
            const updatedItem = {
                id: "item-123",
                categoryId: "category-123",
                name: "Updated Taco",
                description: "Updated description",
                containsList: ["cilantro"],
                calories: 300,
                price: 3,
                isAvailable: true,
                updatedAt: new Date("2026-07-17T12:00:00.000Z"),
            };

            mockSuccessfulAuthentication();

            mockPrisma.item.findFirst.mockResolvedValue({
                id: "item-123",
            });

            mockPrisma.item.update.mockResolvedValue(updatedItem);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/items/item-123",
                method: "PATCH",
                body: {
                    name: "Updated Taco",
                    description: "Updated description",
                    containsList: ["cilantro"],
                    calories: 300,
                    price: 3,
                    isAvailable: true,
                },
            });

            const context = createRouteContext({
                itemId: "item-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                ...updatedItem,
                updatedAt: updatedItem.updatedAt.toISOString(),
            });

            expect(mockPrisma.item.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "item-123",
                    businessId: "business-123",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.item.update).toHaveBeenCalledWith({
                where: {
                    id: "item-123",
                },
                data: {
                    name: "Updated Taco",
                    description: "Updated description",
                    containsList: ["cilantro"],
                    calories: 300,
                    price: 3,
                    isAvailable: true,
                },
                select: {
                    id: true,
                    categoryId: true,
                    name: true,
                    description: true,
                    containsList: true,
                    calories: true,
                    price: true,
                    isAvailable: true,
                    updatedAt: true,
                },
            });
        });
    });

    describe("DELETE", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/items/item-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                itemId: "item-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.item.delete).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("returns 404 when the item is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.item.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/items/item-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                itemId: "item-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This item does not exist in our records",
            });

            expect(mockPrisma.item.delete).not.toHaveBeenCalled();
            expect(mockPrisma.item.findMany).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("returns 500 when deleting the item fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.item.findFirst.mockResolvedValue({
                id: "item-123",
                categoryId: "category-123",
            });

            mockPrisma.item.delete.mockRejectedValue(
                new Error("Database delete failed")
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/items/item-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                itemId: "item-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to delete item",
            });

            expect(mockPrisma.item.findMany).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("successfully deletes the item and reorders the remaining items", async () => {
            mockSuccessfulAuthentication();

            const remainingItems = [
                { id: "item-456" },
                { id: "item-789" },
            ];

            mockPrisma.item.findFirst.mockResolvedValue({
                id: "item-123",
                categoryId: "category-123",
            });

            mockPrisma.item.delete.mockResolvedValue({
                id: "item-123",
            });

            mockPrisma.item.findMany.mockResolvedValue(
                remainingItems
            );

            mockPrisma.item.update
                .mockResolvedValueOnce({
                    id: "item-456",
                    order: 1,
                })
                .mockResolvedValueOnce({
                    id: "item-789",
                    order: 2,
                });

            mockPrisma.$transaction.mockResolvedValue([
                {
                    id: "item-456",
                    order: 1,
                },
                {
                    id: "item-789",
                    order: 2,
                },
            ]);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/items/item-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                itemId: "item-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                message: "Item deleted successfully",
            });

            expect(mockPrisma.item.delete).toHaveBeenCalledWith({
                where: {
                    id: "item-123",
                },
            });

            expect(mockPrisma.item.findMany).toHaveBeenCalledWith({
                where: {
                    businessId: "business-123",
                    categoryId: "category-123",
                },
                orderBy: {
                    order: "asc",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.item.update).toHaveBeenNthCalledWith(
                1,
                {
                    where: {
                        id: "item-456",
                    },
                    data: {
                        order: 1,
                    },
                }
            );

            expect(mockPrisma.item.update).toHaveBeenNthCalledWith(
                2,
                {
                    where: {
                        id: "item-789",
                    },
                    data: {
                        order: 2,
                    },
                }
            );

            expect(mockPrisma.$transaction).toHaveBeenCalledWith([
                expect.anything(),
                expect.anything(),
            ]);
        });

        it("successfully deletes the only item without reordering anything", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.item.findFirst.mockResolvedValue({
                id: "item-123",
                categoryId: "category-123",
            });

            mockPrisma.item.delete.mockResolvedValue({
                id: "item-123",
            });

            mockPrisma.item.findMany.mockResolvedValue([]);
            mockPrisma.$transaction.mockResolvedValue([]);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/items/item-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                itemId: "item-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                message: "Item deleted successfully",
            });

            expect(mockPrisma.item.findMany).toHaveBeenCalledWith({
                where: {
                    businessId: "business-123",
                    categoryId: "category-123",
                },
                orderBy: {
                    order: "asc",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).toHaveBeenCalledWith([]);
        });

        it("returns 500 when retrieving the remaining items fails after deletion", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.item.findFirst.mockResolvedValue({
                id: "item-123",
                categoryId: "category-123",
            });

            mockPrisma.item.delete.mockResolvedValue({
                id: "item-123",
            });

            mockPrisma.item.findMany.mockRejectedValue(
                new Error("Database lookup failed")
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/items/item-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                itemId: "item-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to delete item",
            });

            expect(mockPrisma.item.delete).toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });
    });
});