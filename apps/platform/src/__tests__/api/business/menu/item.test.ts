/**
 * @jest-environment node
 */

import { mockPrisma } from "@/__tests__/mocks/prisma";

import { GET } from "@/app/api/business/menu/items/[itemSlug]/route";
import { getSlug } from "@/app/api/route_helper";

jest.mock("@/lib/prisma", () => {
    const {
        mockPrisma,
    } = require("@/__tests__/mocks/prisma");

    return {
        prisma: mockPrisma,
    };
});

jest.mock("@/app/api/route_helper", () => ({
    getSlug: jest.fn(),
}));

const mockedGetSlug = jest.mocked(getSlug);

describe("GET /api/business/menu/items/[itemSlug]", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 500 when getting the business slug fails", async () => {
        mockedGetSlug.mockImplementation(() => {
            throw new Error("Missing business slug");
        });

        const request = new Request(
            "http://localhost/api/business/menu/items/taco"
        );

        const context = {
            params: Promise.resolve({
                itemSlug: "taco",
            }),
        };

        const response = await GET(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(500);

        expect(responseBody).toEqual({
            error: "Failed to fetch business item",
        });

        expect(mockedGetSlug).toHaveBeenCalledWith(request);
        expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
    });

    it("returns 400 when the item slug is missing", async () => {
        mockedGetSlug.mockReturnValue("tacos-el-guero");

        const request = new Request(
            "http://localhost/api/business/menu/items"
        );

        const context = {
            params: Promise.resolve({
                itemSlug: "",
            }),
        };

        const response = await GET(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(400);

        expect(responseBody).toEqual({
            error: "Missing item slug",
        });

        expect(mockedGetSlug).toHaveBeenCalledWith(request);
        expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
    });

    it("returns 404 when the item is not found for the selected business", async () => {
        mockedGetSlug.mockReturnValue("tacos-el-guero");

        mockPrisma.item.findFirst.mockResolvedValue(null);

        const request = new Request(
            "http://localhost/api/business/menu/items/birria-taco"
        );

        const context = {
            params: Promise.resolve({
                itemSlug: "birria-taco",
            }),
        };

        const response = await GET(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(404);

        expect(responseBody).toEqual({
            error: "Item not found for this business",
        });

        expect(mockPrisma.item.findFirst).toHaveBeenCalledWith({
            where: {
                slug: "birria-taco",
                business: {
                    slug: "tacos-el-guero",
                },
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
                options: {
                    select: {
                        id: true,
                        itemId: true,
                        name: true,
                        price: true,
                        order: true,
                        isAvailable: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
        });
    });

    it("returns 500 when fetching the business item fails", async () => {
        mockedGetSlug.mockReturnValue("tacos-el-guero");

        mockPrisma.item.findFirst.mockRejectedValue(
            new Error("Database query failed")
        );

        const request = new Request(
            "http://localhost/api/business/menu/items/birria-taco"
        );

        const context = {
            params: Promise.resolve({
                itemSlug: "birria-taco",
            }),
        };

        const response = await GET(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(500);

        expect(responseBody).toEqual({
            error: "Failed to fetch business item",
        });

        expect(mockPrisma.item.findFirst).toHaveBeenCalled();
    });

    it("successfully returns the selected business item and its options", async () => {
        const createdAt = new Date(
            "2026-07-17T12:00:00.000Z"
        );

        const updatedAt = new Date(
            "2026-07-18T12:00:00.000Z"
        );

        const item = {
            id: "item-123",
            categoryId: "category-123",
            name: "Birria Taco",
            description: "Slow-cooked beef taco",
            containsList: [
                "beef",
                "onion",
                "cilantro",
            ],
            calories: 420,
            price: 4.5,
            order: 1,
            isAvailable: true,
            slug: "birria-taco",
            imageKey: "items/item-123.webp",
            createdAt,
            updatedAt,
            options: [
                {
                    id: "option-123",
                    itemId: "item-123",
                    name: "Extra Cheese",
                    price: 1.5,
                    order: 1,
                    isAvailable: true,
                    createdAt,
                    updatedAt,
                },
            ],
        };

        mockedGetSlug.mockReturnValue("tacos-el-guero");

        mockPrisma.item.findFirst.mockResolvedValue(
            item as never
        );

        const request = new Request(
            "http://localhost/api/business/menu/items/birria-taco"
        );

        const context = {
            params: Promise.resolve({
                itemSlug: "birria-taco",
            }),
        };

        const response = await GET(request, context);
        const responseBody = await response.json();

        expect(response.status).toBe(200);

        expect(responseBody).toEqual({
            ...item,
            createdAt: createdAt.toISOString(),
            updatedAt: updatedAt.toISOString(),
            options: [
                {
                    ...item.options[0],
                    createdAt: createdAt.toISOString(),
                    updatedAt: updatedAt.toISOString(),
                },
            ],
        });

        expect(mockedGetSlug).toHaveBeenCalledWith(request);

        expect(mockPrisma.item.findFirst).toHaveBeenCalledWith({
            where: {
                slug: "birria-taco",
                business: {
                    slug: "tacos-el-guero",
                },
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
                options: {
                    select: {
                        id: true,
                        itemId: true,
                        name: true,
                        price: true,
                        order: true,
                        isAvailable: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
        });
    });
});