/**
 * @jest-environment node
 */

import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockSuccessfulAuthentication } from "@/__tests__/helpers/auth";
import { mockPrisma } from "@/__tests__/mocks/prisma";

import {
    DELETE,
    PATCH,
} from "@/app/api/admin/categories/[categoryId]/route";
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

describe("/api/admin/categories/[categoryId]", () => {
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
                url: "http://localhost/api/admin/categories/category-123",
                method: "PATCH",
                body: {
                    name: "Updated Category",
                    description: "Updated description",
                    isVisible: true,
                },
            });

            const context = createRouteContext({
                categoryId: "category-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);
            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.category.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.category.update).not.toHaveBeenCalled();
        });

        it("returns 404 when the category is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.category.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/categories/category-123",
                method: "PATCH",
                body: {
                    name: "Updated Category",
                    description: "Updated description",
                    isVisible: true,
                },
            });

            const context = createRouteContext({
                categoryId: "category-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This category does not exist in our records",
            });

            expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "category-123",
                    businessId: "business-123",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.category.update).not.toHaveBeenCalled();
        });

        it("returns 500 when updating the category fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.category.findFirst.mockResolvedValue({
                id: "category-123",
            });

            mockPrisma.category.update.mockRejectedValue(
                new Error("Database update failed")
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/categories/category-123",
                method: "PATCH",
                body: {
                    name: "Updated Category",
                    description: "Updated description",
                    isVisible: true,
                },
            });

            const context = createRouteContext({
                categoryId: "category-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to update category",
            });

            expect(mockPrisma.category.update).toHaveBeenCalled();
        });

        it("successfully updates the category", async () => {
            mockSuccessfulAuthentication();

            const updatedCategory = {
                id: "category-123",
                name: "Updated Category",
                description: "Updated description",
                order: 2,
                isVisible: true,
                updatedAt: new Date("2026-07-17T12:00:00.000Z"),
            };

            mockPrisma.category.findFirst.mockResolvedValue({
                id: "category-123",
            });

            mockPrisma.category.update.mockResolvedValue(updatedCategory);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/categories/category-123",
                method: "PATCH",
                body: {
                    name: "Updated Category",
                    description: "Updated description",
                    isVisible: true,
                },
            });

            const context = createRouteContext({
                categoryId: "category-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                ...updatedCategory,
                updatedAt: updatedCategory.updatedAt.toISOString(),
            });

            expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "category-123",
                    businessId: "business-123",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.category.update).toHaveBeenCalledWith({
                where: {
                    id: "category-123",
                },
                data: {
                    name: "Updated Category",
                    description: "Updated description",
                    isVisible: true,
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    order: true,
                    isVisible: true,
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
                url: "http://localhost/api/admin/categories/category-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                categoryId: "category-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.category.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.category.delete).not.toHaveBeenCalled();
        });

        it("returns 404 when the category is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.category.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/categories/category-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                categoryId: "category-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This category does not exist in our records",
            });

            expect(mockPrisma.category.delete).not.toHaveBeenCalled();
            expect(mockPrisma.category.findMany).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("returns 409 when the category still has items attached", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.category.findFirst.mockResolvedValue({
                id: "category-123",
                items: [
                    { id: "item-123" },
                ],
            });

            const request = createJsonRequest({
                url: "http://localhost/api/admin/categories/category-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                categoryId: "category-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(409);

            expect(responseBody).toEqual({
                error:
                    "This category cannot be deleted because it still has items attached to it",
            });

            expect(mockPrisma.category.delete).not.toHaveBeenCalled();
            expect(mockPrisma.category.findMany).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("returns 500 when deleting the category fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.category.findFirst.mockResolvedValue({
                id: "category-123",
                items: [],
            });

            mockPrisma.category.delete.mockRejectedValue(
                new Error("Database delete failed")
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/categories/category-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                categoryId: "category-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to delete category",
            });

            expect(mockPrisma.category.findMany).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("successfully deletes the category and reorders the remaining categories", async () => {
            mockSuccessfulAuthentication();

            const remainingCategories = [
                { id: "category-456" },
                { id: "category-789" },
            ];

            mockPrisma.category.findFirst.mockResolvedValue({
                id: "category-123",
                items: [],
            });

            mockPrisma.category.delete.mockResolvedValue({
                id: "category-123",
            });

            mockPrisma.category.findMany.mockResolvedValue(
                remainingCategories
            );

            mockPrisma.category.update
                .mockResolvedValueOnce({
                    id: "category-456",
                    order: 1,
                })
                .mockResolvedValueOnce({
                    id: "category-789",
                    order: 2,
                });

            mockPrisma.$transaction.mockResolvedValue([
                {
                    id: "category-456",
                    order: 1,
                },
                {
                    id: "category-789",
                    order: 2,
                },
            ]);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/categories/category-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                categoryId: "category-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                message: "Category deleted successfully",
            });

            expect(mockPrisma.category.delete).toHaveBeenCalledWith({
                where: {
                    id: "category-123",
                },
            });

            expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
                where: {
                    businessId: "business-123",
                },
                orderBy: {
                    order: "asc",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.category.update).toHaveBeenNthCalledWith(
                1,
                {
                    where: {
                        id: "category-456",
                    },
                    data: {
                        order: 1,
                    },
                }
            );

            expect(mockPrisma.category.update).toHaveBeenNthCalledWith(
                2,
                {
                    where: {
                        id: "category-789",
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