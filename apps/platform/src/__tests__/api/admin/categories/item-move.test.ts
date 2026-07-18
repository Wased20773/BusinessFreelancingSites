/**
 * @jest-environment node
 */

import { mockSuccessfulAuthentication } from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma } from "@/__tests__/mocks/prisma";

import { PATCH as moveUp } from "@/app/api/admin/categories/[categoryId]/items/[itemId]/move-up/route";
import { PATCH as moveDown } from "@/app/api/admin/categories/[categoryId]/items/[itemId]/move-down/route";
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

describe("item ordering routes", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("PATCH move-up", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/categories/category-123/items/item-123/move-up",
                method: "PATCH",
            });

            const context = createRouteContext({
                categoryId: "category-123",
                itemId: "item-123",
            });

            const response = await moveUp(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);
            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("returns 404 when the item is not found in the selected category", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.item.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/categories/category-123/items/item-123/move-up",
                method: "PATCH",
            });

            const context = createRouteContext({
                categoryId: "category-123",
                itemId: "item-123",
            });

            const response = await moveUp(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This item does not exist in our records",
            });

            expect(mockPrisma.item.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "item-123",
                    categoryId: "category-123",
                    businessId: "business-123",
                },
                select: {
                    id: true,
                    order: true,
                },
            });

            expect(mockPrisma.item.findFirst).toHaveBeenCalledTimes(1);
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("returns 400 when the item is already at the top", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.item.findFirst
                .mockResolvedValueOnce({
                    id: "item-123",
                    order: 1,
                })
                .mockResolvedValueOnce(null);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/categories/category-123/items/item-123/move-up",
                method: "PATCH",
            });

            const context = createRouteContext({
                categoryId: "category-123",
                itemId: "item-123",
            });

            const response = await moveUp(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(400);

            expect(responseBody).toEqual({
                error: "Item is already at the top",
            });

            expect(mockPrisma.item.findFirst).toHaveBeenCalledTimes(2);
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("successfully swaps the item with the item above it", async () => {
            mockSuccessfulAuthentication();

            const updatedItem = {
                id: "item-123",
                categoryId: "category-123",
                order: 1,
                updatedAt: new Date("2026-07-17T12:00:00.000Z"),
            };

            mockPrisma.item.findFirst
                .mockResolvedValueOnce({
                    id: "item-123",
                    order: 2,
                })
                .mockResolvedValueOnce({
                    id: "item-456",
                    order: 1,
                });

            mockPrisma.item.update
                .mockResolvedValueOnce(updatedItem)
                .mockResolvedValueOnce({
                    id: "item-456",
                    order: 2,
                });

            mockPrisma.$transaction.mockResolvedValue([
                updatedItem,
                {
                    id: "item-456",
                    order: 2,
                },
            ]);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/categories/category-123/items/item-123/move-up",
                method: "PATCH",
            });

            const context = createRouteContext({
                categoryId: "category-123",
                itemId: "item-123",
            });

            const response = await moveUp(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                ...updatedItem,
                updatedAt: updatedItem.updatedAt.toISOString(),
            });

            expect(mockPrisma.item.findFirst).toHaveBeenNthCalledWith(
                1,
                {
                    where: {
                        id: "item-123",
                        categoryId: "category-123",
                        businessId: "business-123",
                    },
                    select: {
                        id: true,
                        order: true,
                    },
                }
            );

            expect(mockPrisma.item.findFirst).toHaveBeenNthCalledWith(
                2,
                {
                    where: {
                        categoryId: "category-123",
                        businessId: "business-123",
                        order: {
                            lt: 2,
                        },
                    },
                    orderBy: {
                        order: "desc",
                    },
                    select: {
                        id: true,
                        order: true,
                    },
                }
            );

            expect(mockPrisma.item.update).toHaveBeenNthCalledWith(
                1,
                {
                    where: {
                        id: "item-123",
                    },
                    data: {
                        order: 1,
                    },
                    select: {
                        id: true,
                        categoryId: true,
                        order: true,
                        updatedAt: true,
                    },
                }
            );

            expect(mockPrisma.item.update).toHaveBeenNthCalledWith(
                2,
                {
                    where: {
                        id: "item-456",
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
    });

    describe("PATCH move-down", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/categories/category-123/items/item-123/move-down",
                method: "PATCH",
            });

            const context = createRouteContext({
                categoryId: "category-123",
                itemId: "item-123",
            });

            const response = await moveDown(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("returns 404 when the item is not found in the selected category", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.item.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/categories/category-123/items/item-123/move-down",
                method: "PATCH",
            });

            const context = createRouteContext({
                categoryId: "category-123",
                itemId: "item-123",
            });

            const response = await moveDown(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This item does not exist in our records",
            });

            expect(mockPrisma.item.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "item-123",
                    categoryId: "category-123",
                    businessId: "business-123",
                },
                select: {
                    id: true,
                    order: true,
                },
            });

            expect(mockPrisma.item.findFirst).toHaveBeenCalledTimes(1);
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });
        
        it("returns 400 when the item is already at the bottom", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.item.findFirst
                .mockResolvedValueOnce({
                    id: "item-123",
                    order: 3,
                })
                .mockResolvedValueOnce(null);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/categories/category-123/items/item-123/move-down",
                method: "PATCH",
            });

            const context = createRouteContext({
                categoryId: "category-123",
                itemId: "item-123",
            });

            const response = await moveDown(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(400);

            expect(responseBody).toEqual({
                error: "Item is already at the bottom",
            });

            expect(mockPrisma.item.findFirst).toHaveBeenCalledTimes(2);
            expect(mockPrisma.item.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("successfully swaps the item with the item below it", async () => {
            mockSuccessfulAuthentication();

            const updatedItem = {
                id: "item-123",
                categoryId: "category-123",
                order: 3,
                updatedAt: new Date("2026-07-17T12:00:00.000Z"),
            };

            mockPrisma.item.findFirst
                .mockResolvedValueOnce({
                    id: "item-123",
                    order: 2,
                })
                .mockResolvedValueOnce({
                    id: "item-456",
                    order: 3,
                });

            mockPrisma.item.update
                .mockResolvedValueOnce(updatedItem)
                .mockResolvedValueOnce({
                    id: "item-456",
                    order: 2,
                });

            mockPrisma.$transaction.mockResolvedValue([
                updatedItem,
                {
                    id: "item-456",
                    order: 2,
                },
            ]);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/categories/category-123/items/item-123/move-down",
                method: "PATCH",
            });

            const context = createRouteContext({
                categoryId: "category-123",
                itemId: "item-123",
            });

            const response = await moveDown(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                ...updatedItem,
                updatedAt: updatedItem.updatedAt.toISOString(),
            });

            expect(mockPrisma.item.findFirst).toHaveBeenNthCalledWith(
                1,
                {
                    where: {
                        id: "item-123",
                        categoryId: "category-123",
                        businessId: "business-123",
                    },
                    select: {
                        id: true,
                        order: true,
                    },
                }
            );

            expect(mockPrisma.item.findFirst).toHaveBeenNthCalledWith(
                2,
                {
                    where: {
                        categoryId: "category-123",
                        businessId: "business-123",
                        order: {
                            gt: 2,
                        },
                    },
                    orderBy: {
                        order: "asc",
                    },
                    select: {
                        id: true,
                        order: true,
                    },
                }
            );

            expect(mockPrisma.item.update).toHaveBeenNthCalledWith(
                1,
                {
                    where: {
                        id: "item-123",
                    },
                    data: {
                        order: 3,
                    },
                    select: {
                        id: true,
                        categoryId: true,
                        order: true,
                        updatedAt: true,
                    },
                }
            );

            expect(mockPrisma.item.update).toHaveBeenNthCalledWith(
                2,
                {
                    where: {
                        id: "item-456",
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
    });
});