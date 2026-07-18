/**
 * @jest-environment node
 */

import { mockSuccessfulAuthentication } from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma } from "@/__tests__/mocks/prisma";

import { POST } from "@/app/api/admin/categories/[categoryId]/subcategory/route";
import { getNextOrder } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { NextResponse } from "next/server";

jest.mock("@/lib/prisma", () => ({
    prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
    authenticateBusinessAccess: jest.fn(),
}));

jest.mock("@/app/api/route_helper", () => ({
    getNextOrder: jest.fn(),
}));

const mockedAuthenticateBusinessAccess =
    jest.mocked(authenticateBusinessAccess);

const mockedGetNextOrder =
    jest.mocked(getNextOrder);

describe("POST /api/admin/categories/[categoryId]/subcategory", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns the authentication error response", async () => {
        mockedAuthenticateBusinessAccess.mockResolvedValue(
            NextResponse.json(
                { error: "Unauthorized Access" },
                { status: 401 }
            )
        );

        const request = createJsonRequest({
            url:
                "http://localhost/api/admin/categories/category-123/subcategory",
            method: "POST",
            body: {
                name: "Street Tacos",
                description: "Small tacos",
            },
        });

        const context = createRouteContext({
            categoryId: "category-123",
        });

        const response = await POST(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(401);
        expect(responseBody).toEqual({
            error: "Unauthorized Access",
        });

        expect(mockPrisma.category.findFirst).not.toHaveBeenCalled();
        expect(mockedGetNextOrder).not.toHaveBeenCalled();
        expect(mockPrisma.category.create).not.toHaveBeenCalled();
    });

    it("returns 404 when the parent category does not exist or is already a subcategory", async () => {
        mockSuccessfulAuthentication();

        mockPrisma.category.findFirst.mockResolvedValue(null);

        const request = createJsonRequest({
            url:
                "http://localhost/api/admin/categories/category-123/subcategory",
            method: "POST",
            body: {
                name: "Street Tacos",
                description: "Small tacos",
            },
        });

        const context = createRouteContext({
            categoryId: "category-123",
        });

        const response = await POST(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(404);

        expect(responseBody).toEqual({
            error:
                "Either the category does not exists in our records or the selected category is already a subcategory",
        });

        expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
            where: {
                id: "category-123",
                businessId: "business-123",
                parentId: null,
            },
            select: {
                id: true,
            },
        });

        expect(mockedGetNextOrder).not.toHaveBeenCalled();
        expect(mockPrisma.category.create).not.toHaveBeenCalled();
    });

    it("returns the getNextOrder error response", async () => {
        mockSuccessfulAuthentication();

        mockPrisma.category.findFirst.mockResolvedValue({
            id: "category-123",
        });

        mockedGetNextOrder.mockResolvedValue(
            NextResponse.json(
                { error: "Failed to calculate subcategory order" },
                { status: 500 }
            )
        );

        const request = createJsonRequest({
            url:
                "http://localhost/api/admin/categories/category-123/subcategory",
            method: "POST",
            body: {
                name: "Street Tacos",
                description: "Small tacos",
            },
        });

        const context = createRouteContext({
            categoryId: "category-123",
        });

        const response = await POST(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(500);

        expect(responseBody).toEqual({
            error: "Failed to calculate subcategory order",
        });

        expect(mockedGetNextOrder).toHaveBeenCalledWith(
            mockPrisma.category,
            {
                businessId: "business-123",
                parentId: "category-123",
            }
        );

        expect(mockPrisma.category.create).not.toHaveBeenCalled();
    });

    it("returns 500 when creating the subcategory fails", async () => {
        mockSuccessfulAuthentication();

        mockPrisma.category.findFirst.mockResolvedValue({
            id: "category-123",
        });

        mockedGetNextOrder.mockResolvedValue(1);

        mockPrisma.category.create.mockRejectedValue(
            new Error("Database create failed")
        );

        const request = createJsonRequest({
            url:
                "http://localhost/api/admin/categories/category-123/subcategory",
            method: "POST",
            body: {
                name: "Street Tacos",
                description: "Small tacos",
            },
        });

        const context = createRouteContext({
            categoryId: "category-123",
        });

        const response = await POST(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(500);

        expect(responseBody).toEqual({
            error: "Failed to add a subcategory",
        });

        expect(mockPrisma.category.create).toHaveBeenCalled();
    });

    it("successfully creates a subcategory", async () => {
        const createdSubcategory = {
            id: "subcategory-123",
            parentId: "category-123",
            name: "Street Tacos",
            description: "Small tacos",
            order: 1,
            isVisible: true,
            createdAt: new Date("2026-07-17T12:00:00.000Z"),
            updatedAt: new Date("2026-07-17T12:00:00.000Z"),
        };

        mockSuccessfulAuthentication();

        mockPrisma.category.findFirst.mockResolvedValue({
            id: "category-123",
        });

        mockedGetNextOrder.mockResolvedValue(1);

        mockPrisma.category.create.mockResolvedValue(
            createdSubcategory
        );

        const request = createJsonRequest({
            url:
                "http://localhost/api/admin/categories/category-123/subcategory",
            method: "POST",
            body: {
                name: "Street Tacos",
                description: "Small tacos",
            },
        });

        const context = createRouteContext({
            categoryId: "category-123",
        });

        const response = await POST(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(201);

        expect(responseBody).toEqual({
            ...createdSubcategory,
            createdAt: createdSubcategory.createdAt.toISOString(),
            updatedAt: createdSubcategory.updatedAt.toISOString(),
        });

        expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
            where: {
                id: "category-123",
                businessId: "business-123",
                parentId: null,
            },
            select: {
                id: true,
            },
        });

        expect(mockedGetNextOrder).toHaveBeenCalledWith(
            mockPrisma.category,
            {
                businessId: "business-123",
                parentId: "category-123",
            }
        );

        expect(mockPrisma.category.create).toHaveBeenCalledWith({
            data: {
                businessId: "business-123",
                parentId: "category-123",
                name: "Street Tacos",
                description: "Small tacos",
                order: 1,
            },
            select: {
                id: true,
                parentId: true,
                name: true,
                description: true,
                order: true,
                isVisible: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    });
});