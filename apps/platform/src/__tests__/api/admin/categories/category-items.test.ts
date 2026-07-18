/**
 * @jest-environment node
 */

import { mockPrisma } from "@/__tests__/mocks/prisma";

import { POST } from "@/app/api/admin/categories/[categoryId]/items/route";
import { createSlug, getNextOrder } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { NextResponse } from "next/server";

jest.mock("@/lib/prisma", () => ({
    prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
    authenticateBusinessAccess: jest.fn(),
}));

jest.mock("@/app/api/route_helper", () => ({
    createSlug: jest.fn(),
    getNextOrder: jest.fn(),
}));

const mockedAuthenticateBusinessAccess =
    jest.mocked(authenticateBusinessAccess);

const mockedCreateSlug =
    jest.mocked(createSlug);

const mockedGetNextOrder =
    jest.mocked(getNextOrder);

describe("POST /api/admin/categories/[categoryId]/items", () => {
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

        const request = new Request(
            "http://localhost/api/admin/categories/category-123/items",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: "Taco",
                    price: 2,
                }),
            }
        );

        const context = {
            params: Promise.resolve({
                categoryId: "category-123",
            }),
        };

        const response = await POST(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(401);
        expect(responseBody).toEqual({
            error: "Unauthorized Access",
        });

        expect(mockPrisma.category.findFirst).not.toHaveBeenCalled();
        expect(mockedGetNextOrder).not.toHaveBeenCalled();
        expect(mockedCreateSlug).not.toHaveBeenCalled();
        expect(mockPrisma.item.create).not.toHaveBeenCalled();
    });

    it("returns 500 when the request body is not valid JSON", async () => {
        mockedAuthenticateBusinessAccess.mockResolvedValue({
            businessId: "business-123",
        } as never);

        const request = new Request(
            "http://localhost/api/admin/categories/category-123/items",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: "{ invalid json",
            }
        );

        const context = {
            params: Promise.resolve({
                categoryId: "category-123",
            }),
        };

        const response = await POST(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(500);

        expect(responseBody).toEqual({
            error: "Failed to create category item",
        });

        expect(mockPrisma.category.findFirst).not.toHaveBeenCalled();
        expect(mockedGetNextOrder).not.toHaveBeenCalled();
        expect(mockedCreateSlug).not.toHaveBeenCalled();
        expect(mockPrisma.item.create).not.toHaveBeenCalled();
    });

    it("returns 400 when categoryId is missing", async () => {
        mockedAuthenticateBusinessAccess.mockResolvedValue({
            businessId: "business-123",
        } as never);

        const request = new Request(
            "http://localhost/api/admin/categories/category-123/items",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: "Taco",
                    price: 2,
                }),
            }
        );

        const context = {
            params: Promise.resolve({
                categoryId: "",
            }),
        };

        const response = await POST(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(400);

        expect(responseBody).toEqual({
            error: "Missing categoryId",
        });

        expect(mockPrisma.category.findFirst).not.toHaveBeenCalled();
        expect(mockedGetNextOrder).not.toHaveBeenCalled();
        expect(mockedCreateSlug).not.toHaveBeenCalled();
        expect(mockPrisma.item.create).not.toHaveBeenCalled();
    });

    it("returns 400 when the item name is missing", async () => {
        mockedAuthenticateBusinessAccess.mockResolvedValue({
            businessId: "business-123",
        } as never);

        const request = new Request(
            "http://localhost/api/admin/categories/category-123/items",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    price: 2,
                }),
            }
        );

        const context = {
            params: Promise.resolve({
                categoryId: "category-123",
            }),
        };

        const response = await POST(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(400);

        expect(responseBody).toEqual({
            error: "Missing item name",
        });

        expect(mockPrisma.category.findFirst).not.toHaveBeenCalled();
        expect(mockedGetNextOrder).not.toHaveBeenCalled();
        expect(mockedCreateSlug).not.toHaveBeenCalled();
        expect(mockPrisma.item.create).not.toHaveBeenCalled();
    });

    it.each([
        ["undefined", undefined],
        ["null", null],
    ])(
        "returns 400 when the item price is %s",
        async (_label, price) => {
            mockedAuthenticateBusinessAccess.mockResolvedValue({
                businessId: "business-123",
            } as never);

            const body: {
                name: string;
                price?: number | null;
            } = {
                name: "Taco",
                price,
            };

            const request = new Request(
                "http://localhost/api/admin/categories/category-123/items",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                }
            );

            const context = {
                params: Promise.resolve({
                    categoryId: "category-123",
                }),
            };

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(400);

            expect(responseBody).toEqual({
                error: "Missing item price",
            });

            expect(mockPrisma.category.findFirst).not.toHaveBeenCalled();
            expect(mockedGetNextOrder).not.toHaveBeenCalled();
            expect(mockedCreateSlug).not.toHaveBeenCalled();
            expect(mockPrisma.item.create).not.toHaveBeenCalled();
        }
    );

    it("returns 500 when finding the category fails", async () => {
        mockedAuthenticateBusinessAccess.mockResolvedValue({
            businessId: "business-123",
        } as never);

        mockPrisma.category.findFirst.mockRejectedValue(
            new Error("Database lookup failed")
        );

        const request = new Request(
            "http://localhost/api/admin/categories/category-123/items",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: "Taco",
                    price: 2,
                }),
            }
        );

        const context = {
            params: Promise.resolve({
                categoryId: "category-123",
            }),
        };

        const response = await POST(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(500);

        expect(responseBody).toEqual({
            error: "Failed to create category item",
        });

        expect(mockedGetNextOrder).not.toHaveBeenCalled();
        expect(mockedCreateSlug).not.toHaveBeenCalled();
        expect(mockPrisma.item.create).not.toHaveBeenCalled();
    });

    it("returns 404 when the category is not found", async () => {
        mockedAuthenticateBusinessAccess.mockResolvedValue({
            businessId: "business-123",
        } as never);

        mockPrisma.category.findFirst.mockResolvedValue(null);

        const request = new Request(
            "http://localhost/api/admin/categories/category-123/items",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: "Taco",
                    price: 2,
                }),
            }
        );

        const context = {
            params: Promise.resolve({
                categoryId: "category-123",
            }),
        };

        const response = await POST(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(404);

        expect(responseBody).toEqual({
            error: "This category does not exist in our records",
        });

        expect(mockedGetNextOrder).not.toHaveBeenCalled();
        expect(mockedCreateSlug).not.toHaveBeenCalled();
        expect(mockPrisma.item.create).not.toHaveBeenCalled();
    });

    it("returns the getNextOrder error response", async () => {
        mockedAuthenticateBusinessAccess.mockResolvedValue({
            businessId: "business-123",
        } as never);

        mockPrisma.category.findFirst.mockResolvedValue({
            id: "category-123",
        });

        mockedGetNextOrder.mockResolvedValue(
            NextResponse.json(
                { error: "Failed to calculate item order" },
                { status: 500 }
            )
        );

        const request = new Request(
            "http://localhost/api/admin/categories/category-123/items",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: "Taco",
                    price: 2,
                }),
            }
        );

        const context = {
            params: Promise.resolve({
                categoryId: "category-123",
            }),
        };

        const response = await POST(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(500);

        expect(responseBody).toEqual({
            error: "Failed to calculate item order",
        });

        expect(mockedGetNextOrder).toHaveBeenCalledWith(
            mockPrisma.item,
            {
                categoryId: "category-123",
            }
        );

        expect(mockedCreateSlug).not.toHaveBeenCalled();
        expect(mockPrisma.item.create).not.toHaveBeenCalled();
    });

    it("returns 500 when creating the item slug fails", async () => {
        mockedAuthenticateBusinessAccess.mockResolvedValue({
            businessId: "business-123",
        } as never);

        mockPrisma.category.findFirst.mockResolvedValue({
            id: "category-123",
        });

        mockedGetNextOrder.mockResolvedValue(1);

        mockedCreateSlug.mockImplementation(() => {
            throw new Error("Slug creation failed");
        });

        const request = new Request(
            "http://localhost/api/admin/categories/category-123/items",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: "Taco",
                    price: 2,
                }),
            }
        );

        const context = {
            params: Promise.resolve({
                categoryId: "category-123",
            }),
        };

        const response = await POST(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(500);

        expect(responseBody).toEqual({
            error: "Failed to create category item",
        });

        expect(mockedCreateSlug).toHaveBeenCalledWith("Taco");
        expect(mockPrisma.item.create).not.toHaveBeenCalled();
    });

    it("returns 500 when creating the item fails", async () => {
        mockedAuthenticateBusinessAccess.mockResolvedValue({
            businessId: "business-123",
        } as never);

        mockPrisma.category.findFirst.mockResolvedValue({
            id: "category-123",
        });

        mockedGetNextOrder.mockResolvedValue(1);
        mockedCreateSlug.mockReturnValue("taco");

        mockPrisma.item.create.mockRejectedValue(
            new Error("Database create failed")
        );

        const request = new Request(
            "http://localhost/api/admin/categories/category-123/items",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: "Taco",
                    price: 2,
                }),
            }
        );

        const context = {
            params: Promise.resolve({
                categoryId: "category-123",
            }),
        };

        const response = await POST(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(500);

        expect(responseBody).toEqual({
            error: "Failed to create category item",
        });

        expect(mockPrisma.item.create).toHaveBeenCalled();
    });

    it("successfully creates an item for the category", async () => {
        const createdItem = {
            id: "item-123",
            categoryId: "category-123",
            name: "Taco",
            description: "Taco with onion and cilantro",
            containsList: ["cilantro"],
            calories: 250,
            price: "2",
            order: 1,
            isAvailable: true,
            slug: "taco",
            imageKey: null,
            createdAt: new Date("2026-07-17T12:00:00.000Z"),
            updatedAt: new Date("2026-07-17T12:00:00.000Z"),
        };

        mockedAuthenticateBusinessAccess.mockResolvedValue({
            businessId: "business-123",
        } as never);

        mockPrisma.category.findFirst.mockResolvedValue({
            id: "category-123",
        });

        mockedGetNextOrder.mockResolvedValue(1);
        mockedCreateSlug.mockReturnValue("taco");
        mockPrisma.item.create.mockResolvedValue(createdItem);

        const request = new Request(
            "http://localhost/api/admin/categories/category-123/items",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: "Taco",
                    description: "Taco with onion and cilantro",
                    containsList: ["cilantro"],
                    calories: 250,
                    price: 2,
                    isAvailable: true,
                    imageKey: null,
                }),
            }
        );

        const context = {
            params: Promise.resolve({
                categoryId: "category-123",
            }),
        };

        const response = await POST(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(201);

        expect(responseBody).toEqual({
            ...createdItem,
            createdAt: createdItem.createdAt.toISOString(),
            updatedAt: createdItem.updatedAt.toISOString(),
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

        expect(mockedGetNextOrder).toHaveBeenCalledWith(
            mockPrisma.item,
            {
                categoryId: "category-123",
            }
        );

        expect(mockedCreateSlug).toHaveBeenCalledWith("Taco");

        expect(mockPrisma.item.create).toHaveBeenCalledWith({
            data: {
                businessId: "business-123",
                categoryId: "category-123",
                name: "Taco",
                description: "Taco with onion and cilantro",
                containsList: ["cilantro"],
                calories: 250,
                price: 2,
                order: 1,
                isAvailable: true,
                slug: "taco",
                imageKey: null,
            },
            select: {
                id: true,
                categoryId: true,
                name: true,
                description: true,
                containsList: true,
                calories: true,
                price: true,
                order: true,
                isAvailable: true,
                slug: true,
                imageKey: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    });
});