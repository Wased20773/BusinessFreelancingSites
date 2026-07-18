/**
 * @jest-environment node
 */

import { mockSuccessfulAuthentication } from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma } from "@/__tests__/mocks/prisma";

import { PATCH as moveUp } from "@/app/api/admin/categories/[categoryId]/move-up/route";
import { PATCH as moveDown } from "@/app/api/admin/categories/[categoryId]/move-down/route";
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

describe("category ordering routes", () => {
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
                    "http://localhost/api/admin/categories/category-123/move-up",
                method: "PATCH",
            });

            const context = createRouteContext({
                categoryId: "category-123",
            });

            const response = await moveUp(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.category.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.category.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("returns 404 when the category is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.category.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/categories/category-123/move-up",
                method: "PATCH",
            });

            const context = createRouteContext({
                categoryId: "category-123",
            });

            const response = await moveUp(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This category does not exist in our records",
            });

            expect(mockPrisma.category.findFirst).toHaveBeenCalledTimes(1);
            expect(mockPrisma.category.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("returns 400 when the category is already at the top", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.category.findFirst
                .mockResolvedValueOnce({
                    id: "category-123",
                    order: 1,
                })
                .mockResolvedValueOnce(null);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/categories/category-123/move-up",
                method: "PATCH",
            });

            const context = createRouteContext({
                categoryId: "category-123",
            });

            const response = await moveUp(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(400);

            expect(responseBody).toEqual({
                error: "Category is already at the top",
            });

            expect(mockPrisma.category.findFirst).toHaveBeenCalledTimes(2);
            expect(mockPrisma.category.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("successfully swaps the category with the category above it", async () => {
            mockSuccessfulAuthentication();

            const updatedCategory = {
                id: "category-123",
                name: "Tacos",
                description: "Main taco category",
                order: 1,
                isVisible: true,
            };

            mockPrisma.category.findFirst
                .mockResolvedValueOnce({
                    id: "category-123",
                    order: 2,
                })
                .mockResolvedValueOnce({
                    id: "category-456",
                    order: 1,
                });

            mockPrisma.category.update
                .mockResolvedValueOnce(updatedCategory)
                .mockResolvedValueOnce({
                    id: "category-456",
                    order: 2,
                });

            mockPrisma.$transaction.mockResolvedValue([
                updatedCategory,
                {
                    id: "category-456",
                    order: 2,
                },
            ]);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/categories/category-123/move-up",
                method: "PATCH",
            });

            const context = createRouteContext({
                categoryId: "category-123",
            });

            const response = await moveUp(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);
            expect(responseBody).toEqual(updatedCategory);

            expect(mockPrisma.category.findFirst).toHaveBeenNthCalledWith(
                1,
                {
                    where: {
                        id: "category-123",
                        businessId: "business-123",
                    },
                    select: {
                        id: true,
                        order: true,
                    },
                }
            );

            expect(mockPrisma.category.findFirst).toHaveBeenNthCalledWith(
                2,
                {
                    where: {
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

            expect(mockPrisma.category.update).toHaveBeenNthCalledWith(
                1,
                {
                    where: {
                        id: "category-123",
                    },
                    data: {
                        order: 1,
                    },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        order: true,
                        isVisible: true,
                    },
                }
            );

            expect(mockPrisma.category.update).toHaveBeenNthCalledWith(
                2,
                {
                    where: {
                        id: "category-456",
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
                    "http://localhost/api/admin/categories/category-123/move-down",
                method: "PATCH",
            });

            const context = createRouteContext({
                categoryId: "category-123",
            });

            const response = await moveDown(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.category.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.category.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("returns 404 when the category is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.category.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/categories/category-123/move-down",
                method: "PATCH",
            });

            const context = createRouteContext({
                categoryId: "category-123",
            });

            const response = await moveDown(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This category does not exist in our records",
            });

            expect(mockPrisma.category.findFirst).toHaveBeenCalledTimes(1);
            expect(mockPrisma.category.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("returns 400 when the category is already at the bottom", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.category.findFirst
                .mockResolvedValueOnce({
                    id: "category-123",
                    order: 3,
                })
                .mockResolvedValueOnce(null);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/categories/category-123/move-down",
                method: "PATCH",
            });

            const context = createRouteContext({
                categoryId: "category-123",
            });

            const response = await moveDown(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(400);

            expect(responseBody).toEqual({
                error: "Category is already at the bottom",
            });

            expect(mockPrisma.category.findFirst).toHaveBeenCalledTimes(2);
            expect(mockPrisma.category.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("successfully swaps the category with the category below it", async () => {
            mockSuccessfulAuthentication();

            const updatedCategory = {
                id: "category-123",
                name: "Tacos",
                description: "Main taco category",
                order: 3,
                isVisible: true,
                updatedAt: new Date("2026-07-17T12:00:00.000Z"),
            };

            mockPrisma.category.findFirst
                .mockResolvedValueOnce({
                    id: "category-123",
                    order: 2,
                })
                .mockResolvedValueOnce({
                    id: "category-456",
                    order: 3,
                });

            mockPrisma.category.update
                .mockResolvedValueOnce(updatedCategory)
                .mockResolvedValueOnce({
                    id: "category-456",
                    order: 2,
                });

            mockPrisma.$transaction.mockResolvedValue([
                updatedCategory,
                {
                    id: "category-456",
                    order: 2,
                },
            ]);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/categories/category-123/move-down",
                method: "PATCH",
            });

            const context = createRouteContext({
                categoryId: "category-123",
            });

            const response = await moveDown(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                ...updatedCategory,
                updatedAt: updatedCategory.updatedAt.toISOString(),
            });

            expect(mockPrisma.category.findFirst).toHaveBeenNthCalledWith(
                1,
                {
                    where: {
                        id: "category-123",
                        businessId: "business-123",
                    },
                    select: {
                        id: true,
                        order: true,
                    },
                }
            );

            expect(mockPrisma.category.findFirst).toHaveBeenNthCalledWith(
                2,
                {
                    where: {
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

            expect(mockPrisma.category.update).toHaveBeenNthCalledWith(
                1,
                {
                    where: {
                        id: "category-123",
                    },
                    data: {
                        order: 3,
                    },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        order: true,
                        isVisible: true,
                        updatedAt: true,
                    },
                }
            );

            expect(mockPrisma.category.update).toHaveBeenNthCalledWith(
                2,
                {
                    where: {
                        id: "category-456",
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