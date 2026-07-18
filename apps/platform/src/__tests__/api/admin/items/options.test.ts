/**
 * @jest-environment node
 */

import { mockSuccessfulAuthentication } from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma } from "@/__tests__/mocks/prisma";

import { POST } from "@/app/api/admin/items/[itemId]/options/route";
import {
    DELETE,
    PATCH,
} from "@/app/api/admin/items/[itemId]/options/[optionId]/route";

import {
    PATCH as moveUp,
} from "@/app/api/admin/items/[itemId]/options/[optionId]/move-up/route";

import {
    PATCH as moveDown,
} from "@/app/api/admin/items/[itemId]/options/[optionId]/move-down/route";

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

describe("/api/admin/items/[itemId]/options", () => {
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
    
            const request = createJsonRequest({
                url: "http://localhost/api/admin/items/item-123/options",
                method: "POST",
                body: {
                    name: "Extra Cheese",
                    price: 1.50,
                },
            });
    
            const context = createRouteContext({
                itemId: "item-123",
            });
    
            const response = await POST(request, context);
            const responseBody = await response.json();
    
            expect(response.status).toBe(401);
    
            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });
    
            expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
            expect(mockedGetNextOrder).not.toHaveBeenCalled();
            expect(mockPrisma.itemOption.create).not.toHaveBeenCalled();
        });
    
        it("returns 404 when the item is not found", async () => {
            mockSuccessfulAuthentication();
    
            mockPrisma.item.findFirst.mockResolvedValue(null);
    
            const request = createJsonRequest({
                url: "http://localhost/api/admin/items/item-123/options",
                method: "POST",
                body: {
                    name: "Extra Cheese",
                    price: 1.50,
                },
            });
    
            const context = createRouteContext({
                itemId: "item-123",
            });
    
            const response = await POST(request, context);
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
    
            expect(mockedGetNextOrder).not.toHaveBeenCalled();
            expect(mockPrisma.itemOption.create).not.toHaveBeenCalled();
        });
    
        it("returns 400 when the option name is missing", async () => {
            mockSuccessfulAuthentication();
    
            const request = createJsonRequest({
                url: "http://localhost/api/admin/items/item-123/options",
                method: "POST",
                body: {
                    price: 1.50,
                },
            });
    
            const context = createRouteContext({
                itemId: "item-123",
            });
    
            const response = await POST(request, context);
            const responseBody = await response.json();
    
            expect(response.status).toBe(400);
    
            expect(responseBody).toEqual({
                error: "Missing option name",
            });
    
            expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
            expect(mockedGetNextOrder).not.toHaveBeenCalled();
            expect(mockPrisma.itemOption.create).not.toHaveBeenCalled();
        });
    
        it("returns the getNextOrder error response", async () => {
            mockSuccessfulAuthentication();
    
            mockPrisma.item.findFirst.mockResolvedValue({
                id: "item-123",
            });
    
            mockedGetNextOrder.mockResolvedValue(
                NextResponse.json(
                    { error: "Failed to calculate option order" },
                    { status: 500 }
                )
            );
    
            const request = createJsonRequest({
                url: "http://localhost/api/admin/items/item-123/options",
                method: "POST",
                body: {
                    name: "Extra Cheese",
                    price: 1.5,
                },
            });
    
            const context = createRouteContext({
                itemId: "item-123",
            });
    
            const response = await POST(request, context);
            const responseBody = await response.json();
    
            expect(response.status).toBe(500);
    
            expect(responseBody).toEqual({
                error: "Failed to calculate option order",
            });
    
            expect(mockedGetNextOrder).toHaveBeenCalledWith(
                mockPrisma.itemOption,
                {
                    itemId: "item-123",
                }
            );
    
            expect(mockPrisma.itemOption.create).not.toHaveBeenCalled();
        });
    
        it("returns 500 when creating the item option fails", async () => {
            mockSuccessfulAuthentication();
    
            mockPrisma.item.findFirst.mockResolvedValue({
                id: "item-123",
            });
    
            mockedGetNextOrder.mockResolvedValue(1);
    
            mockPrisma.itemOption.create.mockRejectedValue(
                new Error("Database create failed")
            );
    
            const request = createJsonRequest({
                url: "http://localhost/api/admin/items/item-123/options",
                method: "POST",
                body: {
                    name: "Extra Cheese",
                    price: 1.5,
                },
            });
    
            const context = createRouteContext({
                itemId: "item-123",
            });
    
            const response = await POST(request, context);
            const responseBody = await response.json();
    
            expect(response.status).toBe(500);
    
            expect(responseBody).toEqual({
                error: "Failed to create item option",
            });
    
            expect(mockPrisma.itemOption.create).toHaveBeenCalled();
        });
    
        it("successfully creates an item option", async () => {
            const createdOption = {
                id: "option-123",
                itemId: "item-123",
                name: "Extra Cheese",
                price: 1.5,
                order: 1,
                isAvailable: true,
                createdAt: new Date("2026-07-17T12:00:00.000Z"),
                updatedAt: new Date("2026-07-17T12:00:00.000Z"),
            };
    
            mockSuccessfulAuthentication();
    
            mockPrisma.item.findFirst.mockResolvedValue({
                id: "item-123",
            });
    
            mockedGetNextOrder.mockResolvedValue(1);
    
            mockPrisma.itemOption.create.mockResolvedValue(
                createdOption
            );
    
            const request = createJsonRequest({
                url: "http://localhost/api/admin/items/item-123/options",
                method: "POST",
                body: {
                    name: "Extra Cheese",
                    price: 1.5,
                },
            });
    
            const context = createRouteContext({
                itemId: "item-123",
            });
    
            const response = await POST(request, context);
            const responseBody = await response.json();
    
            expect(response.status).toBe(201);
    
            expect(responseBody).toEqual({
                ...createdOption,
                createdAt: createdOption.createdAt.toISOString(),
                updatedAt: createdOption.updatedAt.toISOString(),
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
    
            expect(mockedGetNextOrder).toHaveBeenCalledWith(
                mockPrisma.itemOption,
                {
                    itemId: "item-123",
                }
            );
    
            expect(mockPrisma.itemOption.create).toHaveBeenCalledWith({
                data: {
                    itemId: "item-123",
                    name: "Extra Cheese",
                    price: 1.5,
                    order: 1,
                },
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
            });
        });
    });

    describe("PATCH /[optionId]", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/items/item-123/options/option-123",
                method: "PATCH",
                body: {
                    name: "Extra Cheese",
                    price: 2,
                    isAvailable: true,
                },
            });

            const context = createRouteContext({
                itemId: "item-123",
                optionId: "option-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(
                mockPrisma.itemOption.findFirst
            ).not.toHaveBeenCalled();

            expect(
                mockPrisma.itemOption.update
            ).not.toHaveBeenCalled();
        });

        it("returns 404 when the item option is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.itemOption.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/items/item-123/options/option-123",
                method: "PATCH",
                body: {
                    name: "Extra Cheese",
                    price: 2,
                    isAvailable: true,
                },
            });

            const context = createRouteContext({
                itemId: "item-123",
                optionId: "option-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This item option does not exist in our records",
            });

            expect(mockPrisma.itemOption.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "option-123",
                    itemId: "item-123",
                    item: {
                        businessId: "business-123",
                    },
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.itemOption.update).not.toHaveBeenCalled();
        });

        it("returns 500 when updating the item option fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.itemOption.findFirst.mockResolvedValue({
                id: "option-123",
            });

            mockPrisma.itemOption.update.mockRejectedValue(
                new Error("Database update failed")
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/items/item-123/options/option-123",
                method: "PATCH",
                body: {
                    name: "Extra Cheese",
                    price: 2,
                    isAvailable: true,
                },
            });

            const context = createRouteContext({
                itemId: "item-123",
                optionId: "option-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to update item option",
            });

            expect(mockPrisma.itemOption.update).toHaveBeenCalled();
        });

        it("successfully updates the item option", async () => {
            const updatedOption = {
                id: "option-123",
                itemId: "item-123",
                name: "Extra Cheese",
                price: 2,
                isAvailable: true,
                updatedAt: new Date("2026-07-17T12:00:00.000Z"),
            };

            mockSuccessfulAuthentication();

            mockPrisma.itemOption.findFirst.mockResolvedValue({
                id: "option-123",
            });

            mockPrisma.itemOption.update.mockResolvedValue(updatedOption);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/items/item-123/options/option-123",
                method: "PATCH",
                body: {
                    name: "Extra Cheese",
                    price: 2,
                    isAvailable: true,
                },
            });

            const context = createRouteContext({
                itemId: "item-123",
                optionId: "option-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                ...updatedOption,
                updatedAt: updatedOption.updatedAt.toISOString(),
            });

            expect(mockPrisma.itemOption.update).toHaveBeenCalledWith({
                where: {
                    id: "option-123",
                },
                data: {
                    name: "Extra Cheese",
                    price: 2,
                    isAvailable: true,
                },
                select: {
                    id: true,
                    itemId: true,
                    name: true,
                    price: true,
                    isAvailable: true,
                    updatedAt: true,
                },
            });
        });
    });

    describe("DELETE /[optionId]", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/items/item-123/options/option-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                itemId: "item-123",
                optionId: "option-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(
                mockPrisma.itemOption.findFirst
            ).not.toHaveBeenCalled();

            expect(
                mockPrisma.itemOption.delete
            ).not.toHaveBeenCalled();

            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("returns 404 when the item option is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.itemOption.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/items/item-123/options/option-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                itemId: "item-123",
                optionId: "option-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This item option does not exist in our records",
            });

            expect(mockPrisma.itemOption.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "option-123",
                    itemId: "item-123",
                    item: {
                        businessId: "business-123",
                    },
                },
                select: {
                    id: true,
                    itemId: true,
                },
            });

            expect(mockPrisma.itemOption.delete).not.toHaveBeenCalled();
            expect(mockPrisma.itemOption.findMany).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("returns 500 when deleting the item option fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.itemOption.findFirst.mockResolvedValue({
                id: "option-123",
                itemId: "item-123",
            });

            mockPrisma.itemOption.delete.mockRejectedValue(
                new Error("Database delete failed")
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/items/item-123/options/option-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                itemId: "item-123",
                optionId: "option-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to delete item option",
            });

            expect(mockPrisma.itemOption.findMany).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("successfully deletes the item option and reorders the remaining options", async () => {
            mockSuccessfulAuthentication();

            const remainingOptions = [
                { id: "option-456" },
                { id: "option-789" },
            ];

            mockPrisma.itemOption.findFirst.mockResolvedValue({
                id: "option-123",
                itemId: "item-123",
            });

            mockPrisma.itemOption.delete.mockResolvedValue({
                id: "option-123",
            });

            mockPrisma.itemOption.findMany.mockResolvedValue(
                remainingOptions
            );

            mockPrisma.itemOption.update
                .mockResolvedValueOnce({
                    id: "option-456",
                    order: 1,
                })
                .mockResolvedValueOnce({
                    id: "option-789",
                    order: 2,
                });

            mockPrisma.$transaction.mockResolvedValue([
                {
                    id: "option-456",
                    order: 1,
                },
                {
                    id: "option-789",
                    order: 2,
                },
            ]);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/items/item-123/options/option-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                itemId: "item-123",
                optionId: "option-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                message: "Item option deleted successfully",
            });

            expect(mockPrisma.itemOption.delete).toHaveBeenCalledWith({
                where: {
                    id: "option-123",
                },
            });

            expect(mockPrisma.itemOption.findMany).toHaveBeenCalledWith({
                where: {
                    itemId: "item-123",
                },
                orderBy: {
                    order: "asc",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.itemOption.update).toHaveBeenNthCalledWith(
                1,
                {
                    where: {
                        id: "option-456",
                    },
                    data: {
                        order: 1,
                    },
                }
            );

            expect(mockPrisma.itemOption.update).toHaveBeenNthCalledWith(
                2,
                {
                    where: {
                        id: "option-789",
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

        it("successfully deletes the only item option without reordering anything", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.itemOption.findFirst.mockResolvedValue({
                id: "option-123",
                itemId: "item-123",
            });

            mockPrisma.itemOption.delete.mockResolvedValue({
                id: "option-123",
            });

            mockPrisma.itemOption.findMany.mockResolvedValue([]);
            mockPrisma.$transaction.mockResolvedValue([]);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/items/item-123/options/option-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                itemId: "item-123",
                optionId: "option-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                message: "Item option deleted successfully",
            });

            expect(mockPrisma.itemOption.findMany).toHaveBeenCalledWith({
                where: {
                    itemId: "item-123",
                },
                orderBy: {
                    order: "asc",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.itemOption.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).toHaveBeenCalledWith([]);
        });
    });

    describe("PATCH /[optionId]/move-up", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/items/item-123/options/option-123/move-up",
                method: "PATCH",
            });

            const context = createRouteContext({
                itemId: "item-123",
                optionId: "option-123",
            });

            const response = await moveUp(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.itemOption.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.itemOption.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("returns 404 when the item option is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.itemOption.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/items/item-123/options/option-123/move-up",
                method: "PATCH",
            });

            const context = createRouteContext({
                itemId: "item-123",
                optionId: "option-123",
            });

            const response = await moveUp(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This item option does not exist in our records",
            });

            expect(mockPrisma.itemOption.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "option-123",
                    itemId: "item-123",
                    item: {
                        businessId: "business-123",
                    },
                },
                select: {
                    id: true,
                    order: true,
                },
            });

            expect(mockPrisma.itemOption.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("returns 400 when the item option is already at the top", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.itemOption.findFirst
                .mockResolvedValueOnce({
                    id: "option-123",
                    order: 1,
                })
                .mockResolvedValueOnce(null);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/items/item-123/options/option-123/move-up",
                method: "PATCH",
            });

            const context = createRouteContext({
                itemId: "item-123",
                optionId: "option-123",
            });

            const response = await moveUp(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(400);

            expect(responseBody).toEqual({
                error: "Item option is already at the top",
            });

            expect(mockPrisma.itemOption.findFirst).toHaveBeenCalledTimes(2);
            expect(mockPrisma.itemOption.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("successfully swaps the item option with the option above it", async () => {
            mockSuccessfulAuthentication();

            const updatedOption = {
                id: "option-123",
                itemId: "item-123",
                order: 1,
                updatedAt: new Date("2026-07-17T12:00:00.000Z"),
            };

            mockPrisma.itemOption.findFirst
                .mockResolvedValueOnce({
                    id: "option-123",
                    order: 2,
                })
                .mockResolvedValueOnce({
                    id: "option-456",
                    order: 1,
                });

            mockPrisma.itemOption.update
                .mockResolvedValueOnce(updatedOption)
                .mockResolvedValueOnce({
                    id: "option-456",
                    order: 2,
                });

            mockPrisma.$transaction.mockResolvedValue([
                updatedOption,
                {
                    id: "option-456",
                    order: 2,
                },
            ]);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/items/item-123/options/option-123/move-up",
                method: "PATCH",
            });

            const context = createRouteContext({
                itemId: "item-123",
                optionId: "option-123",
            });

            const response = await moveUp(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                ...updatedOption,
                updatedAt: updatedOption.updatedAt.toISOString(),
            });

            expect(mockPrisma.itemOption.findFirst).toHaveBeenNthCalledWith(
                1,
                {
                    where: {
                        id: "option-123",
                        itemId: "item-123",
                        item: {
                            businessId: "business-123",
                        },
                    },
                    select: {
                        id: true,
                        order: true,
                    },
                }
            );

            expect(mockPrisma.itemOption.findFirst).toHaveBeenNthCalledWith(
                2,
                {
                    where: {
                        itemId: "item-123",
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

            expect(mockPrisma.itemOption.update).toHaveBeenNthCalledWith(
                1,
                {
                    where: {
                        id: "option-123",
                    },
                    data: {
                        order: 1,
                    },
                    select: {
                        id: true,
                        itemId: true,
                        order: true,
                        updatedAt: true,
                    },
                }
            );

            expect(mockPrisma.itemOption.update).toHaveBeenNthCalledWith(
                2,
                {
                    where: {
                        id: "option-456",
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

    describe("PATCH /[optionId]/move-down", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/items/item-123/options/option-123/move-down",
                method: "PATCH",
            });

            const context = createRouteContext({
                itemId: "item-123",
                optionId: "option-123",
            });

            const response = await moveDown(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.itemOption.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.itemOption.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("returns 404 when the item option is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.itemOption.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/items/item-123/options/option-123/move-down",
                method: "PATCH",
            });

            const context = createRouteContext({
                itemId: "item-123",
                optionId: "option-123",
            });

            const response = await moveDown(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This item option does not exist in our records",
            });

            expect(mockPrisma.itemOption.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "option-123",
                    itemId: "item-123",
                    item: {
                        businessId: "business-123",
                    },
                },
                select: {
                    id: true,
                    order: true,
                },
            });

            expect(mockPrisma.itemOption.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });
        it("returns 400 when the item option is already at the bottom", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.itemOption.findFirst
                .mockResolvedValueOnce({
                    id: "option-123",
                    order: 3,
                })
                .mockResolvedValueOnce(null);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/items/item-123/options/option-123/move-down",
                method: "PATCH",
            });

            const context = createRouteContext({
                itemId: "item-123",
                optionId: "option-123",
            });

            const response = await moveDown(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(400);

            expect(responseBody).toEqual({
                error: "Item option is already at the bottom",
            });

            expect(mockPrisma.itemOption.findFirst).toHaveBeenCalledTimes(2);
            expect(mockPrisma.itemOption.update).not.toHaveBeenCalled();
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it("successfully swaps the item option with the option below it", async () => {
            mockSuccessfulAuthentication();

            const updatedOption = {
                id: "option-123",
                itemId: "item-123",
                order: 3,
                updatedAt: new Date("2026-07-17T12:00:00.000Z"),
            };

            mockPrisma.itemOption.findFirst
                .mockResolvedValueOnce({
                    id: "option-123",
                    order: 2,
                })
                .mockResolvedValueOnce({
                    id: "option-456",
                    order: 3,
                });

            mockPrisma.itemOption.update
                .mockResolvedValueOnce(updatedOption)
                .mockResolvedValueOnce({
                    id: "option-456",
                    order: 2,
                });

            mockPrisma.$transaction.mockResolvedValue([
                updatedOption,
                {
                    id: "option-456",
                    order: 2,
                },
            ]);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/items/item-123/options/option-123/move-down",
                method: "PATCH",
            });

            const context = createRouteContext({
                itemId: "item-123",
                optionId: "option-123",
            });

            const response = await moveDown(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                ...updatedOption,
                updatedAt: updatedOption.updatedAt.toISOString(),
            });

            expect(mockPrisma.itemOption.findFirst).toHaveBeenNthCalledWith(
                1,
                {
                    where: {
                        id: "option-123",
                        itemId: "item-123",
                        item: {
                            businessId: "business-123",
                        },
                    },
                    select: {
                        id: true,
                        order: true,
                    },
                }
            );

            expect(mockPrisma.itemOption.findFirst).toHaveBeenNthCalledWith(
                2,
                {
                    where: {
                        itemId: "item-123",
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

            expect(mockPrisma.itemOption.update).toHaveBeenNthCalledWith(
                1,
                {
                    where: {
                        id: "option-123",
                    },
                    data: {
                        order: 3,
                    },
                    select: {
                        id: true,
                        itemId: true,
                        order: true,
                        updatedAt: true,
                    },
                }
            );

            expect(mockPrisma.itemOption.update).toHaveBeenNthCalledWith(
                2,
                {
                    where: {
                        id: "option-456",
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